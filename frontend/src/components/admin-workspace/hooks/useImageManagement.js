import { useEffect } from 'react';
import axios from 'axios';
import { API_URL as API, BASE_URL } from '../../../config';
import { toast } from 'sonner';

/**
 * Custom hook for all image-related operations:
 * search, upload, import, AI generation, silo image handling
 */
export function useImageManagement(state, { effectiveClientId, getAuthHeaders }) {

    const {
        imgSearchQuery, setImgSearchResults, setSearchingImages,
        singleTitle, singleObjective, imageSource,
        setSingleSelectedImage, singleSelectedImage,
        setAdminUploadedImages, setAdminUploading,
        setGlobalImages, setImageUploadLoading,
        plan, setPlan, activePlanImageIndex, setActivePlanImageIndex,
        branding, searchingImages, imgSearchResults,
        setImgSearchQuery, setShowImgChangeModal,
    } = state;

    // --- Image Search ---
    const handleImageSearch = async (count = 12, queryOverride = null) => {
        const searchQ = (typeof queryOverride === 'string' ? queryOverride : null) || imgSearchQuery || "";
        if (!String(searchQ).trim()) return;
        setSearchingImages(true);
        const isFreshSearch = (count === 12);
        try {
            const res = await axios.post(`${API}/serp/images`, {
                keyword: searchQ,
                context: `${singleTitle} - ${singleObjective?.slice(0, 200)}`,
                max_results: isFreshSearch ? 12 : count
            }, { headers: getAuthHeaders() });
            const newResults = res.data.results || [];
            if (isFreshSearch) {
                setImgSearchResults(newResults);
            } else {
                setImgSearchResults(prev => {
                    const existingUrls = new Set(prev.map(r => r.image));
                    const unique = newResults.filter(r => !existingUrls.has(r.image));
                    return [...prev, ...unique];
                });
            }
            if (newResults.length === 0 && isFreshSearch) {
                toast.info("Nessuna immagine trovata per questa ricerca.");
            }
        } catch (error) {
            toast.error("Errore ricerca immagini");
        } finally {
            setSearchingImages(false);
        }
    };

    // --- Auto-search on mode change ---
    useEffect(() => {
        if (imageSource === 'search' && imgSearchQuery && imgSearchResults.length === 0 && !searchingImages) {
            handleImageSearch();
        }
    }, [imageSource, imgSearchQuery]);

    // --- Import External Image ---
    const importExternalImage = async (imgUrl) => {
        setSearchingImages(true);
        try {
            const token = localStorage.getItem('seo_token');
            const res = await axios.post(`${API}/articles/import-external-image`, {
                url: imgUrl, client_id: effectiveClientId
            }, { headers: getAuthHeaders() });
            const imageUrlFull = `${BASE_URL}/api/uploads/files/${res.data.id}?auth=${token}`;

            if (activePlanImageIndex !== null) {
                const newTopics = [...plan.topics];
                newTopics[activePlanImageIndex] = {
                    ...newTopics[activePlanImageIndex],
                    image_ids: [res.data.id], image_url: imageUrlFull
                };
                setPlan({ ...plan, topics: newTopics });
                setActivePlanImageIndex(null);
            } else {
                setSingleSelectedImage({ id: res.data.id, url: imageUrlFull });
            }
            toast.success("Immagine importata correttamente");
            setImgSearchResults([]);
        } catch (error) {
            const detail = error.response?.data?.detail || "Importazione fallita";
            toast.error("Errore importazione immagine: " + detail);
        } finally {
            setSearchingImages(false);
        }
    };

    // --- Single File Upload ---
    const handleSingleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) return toast.error("File troppo grande (max 5MB)");
        const token = localStorage.getItem('seo_token');
        const fd = new FormData();
        fd.append('file', file);
        try {
            const res = await axios.post(`${API}/uploads?token=${token}`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setSingleSelectedImage({
                id: res.data.id,
                url: `${API}/uploads/files/${res.data.id}?auth=${token}`
            });
            toast.success("Immagine caricata");
        } catch (error) {
            toast.error("Errore upload immagine");
        }
    };

    // --- Admin Image Upload ---
    const handleAdminImageUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const token = localStorage.getItem('seo_token');
        setAdminUploading(true);
        const newImgs = [];
        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name}: max 5MB`); continue; }
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error(`${file.name}: formato non supportato`); continue; }
            try {
                const fd = new FormData(); fd.append('file', file);
                const res = await axios.post(`${API}/uploads?token=${token}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                newImgs.push({ id: res.data.id, name: file.name, preview: URL.createObjectURL(file) });
            } catch (err) { toast.error(`Errore upload ${file.name}`); }
        }
        setAdminUploadedImages(prev => [...prev, ...newImgs]);
        setAdminUploading(false);
        if (newImgs.length) toast.success(`${newImgs.length} immagine/i caricata/e`);
        e.target.value = '';
    };

    const removeAdminImage = (idx) => {
        setAdminUploadedImages(prev => { const c = [...prev]; URL.revokeObjectURL(c[idx].preview); c.splice(idx, 1); return c; });
    };

    // --- AI Image for Plan Topic ---
    const generateAIImageForTopic = async (index) => {
        const topic = plan.topics[index];
        const token = localStorage.getItem('seo_token');
        setActivePlanImageIndex(index);
        setSearchingImages(true);
        try {
            const res = await axios.post(`${API}/articles/generate-topic-image`, {
                client_id: effectiveClientId, title: topic.titolo,
                branding: branding, token: token
            }, { headers: getAuthHeaders() });
            const newTopics = [...plan.topics];
            newTopics[index] = { ...newTopics[index], image_ids: [res.data.id], image_url: res.data.url };
            setPlan({ ...plan, topics: newTopics });
            toast.success("Immagine IA generata!");
        } catch (error) {
            toast.error("Errore generazione immagine IA");
        } finally {
            setSearchingImages(false);
            setActivePlanImageIndex(null);
        }
    };

    // --- Global Image Upload (Programmatic) ---
    const handleGlobalImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        const tooLarge = files.some(f => f.size > 5 * 1024 * 1024);
        if (tooLarge) { toast.error("Una o più immagini superano i 5MB consentiti."); return; }
        setImageUploadLoading(true);
        let successCount = 0;
        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('client_id', effectiveClientId);
                try {
                    const res = await axios.post(`${API}/uploads/article-image`, formData, {
                        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
                    });
                    setGlobalImages(prev => [...prev, res.data]);
                    successCount++;
                } catch (err) {
                    toast.error(`${file.name}: ${err.response?.data?.detail || "Errore caricamento"}`);
                }
            }
            if (successCount > 0) toast.success(`${successCount} immagini caricate con successo!`);
        } catch (e) {
            toast.error("Errore critico durante l'upload");
        } finally {
            setImageUploadLoading(false);
            e.target.value = '';
        }
    };

    return {
        handleImageSearch, importExternalImage, handleSingleFileUpload,
        handleAdminImageUpload, removeAdminImage, generateAIImageForTopic,
        handleGlobalImageUpload,
    };
}
