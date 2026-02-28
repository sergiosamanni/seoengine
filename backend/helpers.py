"""Shared helper functions for article generation, publishing, scraping, and logging."""
import re
import logging
import asyncio
import httpx
from datetime import datetime, timezone
from typing import List
from bs4 import BeautifulSoup
from database import db

logger = logging.getLogger("server")


# ============== ACTIVITY LOG ==============

async def log_activity(client_id: str, action: str, status: str, details: dict = None):
    from uuid import uuid4
    await db.activity_logs.insert_one({
        "id": str(uuid4()),
        "client_id": client_id,
        "action": action,
        "status": status,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


# ============== LLM PROVIDERS ==============

LLM_PROVIDERS = {
    "openai": {
        "base_url": "https://api.openai.com/v1/chat/completions",
        "models": ["gpt-4-turbo-preview", "gpt-4o", "gpt-4", "gpt-3.5-turbo"]
    },
    "anthropic": {
        "base_url": "https://api.anthropic.com/v1/messages",
        "models": ["claude-sonnet-4-5-20250929", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"]
    },
    "deepseek": {
        "base_url": "https://api.deepseek.com/v1/chat/completions",
        "models": ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"]
    },
    "perplexity": {
        "base_url": "https://api.perplexity.ai/chat/completions",
        "models": ["sonar-pro", "sonar", "sonar-small", "llama-3.1-sonar-large-128k-online"]
    }
}


async def generate_with_llm(provider: str, api_key: str, model: str, temperature: float, system_prompt: str, user_prompt: str) -> str:
    async with httpx.AsyncClient() as client:
        if provider == "anthropic":
            response = await client.post(
                LLM_PROVIDERS["anthropic"]["base_url"],
                headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
                json={"model": model, "max_tokens": 4000, "system": system_prompt,
                      "messages": [{"role": "user", "content": user_prompt}], "temperature": temperature},
                timeout=120.0
            )
            if response.status_code != 200:
                raise Exception(f"Anthropic API error: {response.status_code} - {response.text}")
            return response.json()["content"][0]["text"]

        else:
            base_url = LLM_PROVIDERS.get(provider, LLM_PROVIDERS["openai"])["base_url"]
            response = await client.post(
                base_url,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": model, "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ], "temperature": temperature, "max_tokens": 4000},
                timeout=120.0
            )
            if response.status_code != 200:
                raise Exception(f"{provider} API error: {response.status_code} - {response.text}")
            return response.json()["choices"][0]["message"]["content"]


async def generate_with_openai(api_key: str, model: str, temperature: float, system_prompt: str, user_prompt: str) -> str:
    return await generate_with_llm("openai", api_key, model, temperature, system_prompt, user_prompt)


# ============== SEO METADATA ==============

def generate_seo_metadata(title: str, content: str, kb: dict, combination: dict) -> dict:
    cta = kb.get("call_to_action_principale", "")
    citta = kb.get("citta_principale", "")
    meta_desc = f"{title}. {cta}"[:155] + "..." if len(f"{title}. {cta}") > 155 else f"{title}. {cta}"
    tags = []
    if combination.get("servizio"):
        tags.append(combination["servizio"])
    if combination.get("citta"):
        tags.append(combination["citta"])
    if combination.get("tipo"):
        tags.append(combination["tipo"])
    if citta:
        tags.append(citta)
    punti_forza = kb.get("punti_di_forza", [])
    if punti_forza:
        tags.extend(punti_forza[:2])
    slug = title.lower()
    slug = re.sub(r'[àáâãäå]', 'a', slug)
    slug = re.sub(r'[èéêë]', 'e', slug)
    slug = re.sub(r'[ìíîï]', 'i', slug)
    slug = re.sub(r'[òóôõö]', 'o', slug)
    slug = re.sub(r'[ùúûü]', 'u', slug)
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s]+', '-', slug)
    slug = slug[:100]
    return {
        "meta_description": meta_desc,
        "tags": list(set(tags)),
        "slug": slug,
        "focus_keyword": f"{combination.get('servizio', '')} {combination.get('citta', '')}".strip()
    }


# ============== WORDPRESS PUBLISH ==============

async def publish_to_wordpress(url: str, username: str, password: str, title: str, content: str,
                                wp_status: str = "draft", seo_metadata: dict = None,
                                categories: List[int] = None, tags: List[str] = None) -> dict:
    async with httpx.AsyncClient() as http_client:
        post_data = {"title": title, "content": content, "status": wp_status}
        if seo_metadata and seo_metadata.get("slug"):
            post_data["slug"] = seo_metadata["slug"]
        if categories:
            post_data["categories"] = categories

        tag_ids = []
        if tags:
            base_url = url.replace("/posts", "")
            for tag_name in tags:
                try:
                    search_response = await http_client.get(
                        f"{base_url}/tags", auth=(username, password),
                        params={"search": tag_name}, timeout=10.0)
                    if search_response.status_code == 200:
                        existing_tags = search_response.json()
                        tag_found = next((t for t in existing_tags if t.get("name", "").lower() == tag_name.lower()), None)
                        if tag_found:
                            tag_ids.append(tag_found["id"])
                        else:
                            create_response = await http_client.post(
                                f"{base_url}/tags", auth=(username, password),
                                json={"name": tag_name}, timeout=10.0)
                            if create_response.status_code in [200, 201]:
                                tag_ids.append(create_response.json()["id"])
                except Exception as e:
                    logger.warning(f"Error handling tag '{tag_name}': {e}")
        if tag_ids:
            post_data["tags"] = tag_ids
        if seo_metadata and seo_metadata.get("meta_description"):
            post_data["excerpt"] = seo_metadata["meta_description"]
        if seo_metadata:
            meta_fields = {}
            if seo_metadata.get("meta_description"):
                meta_fields["_yoast_wpseo_metadesc"] = seo_metadata["meta_description"]
                meta_fields["rank_math_description"] = seo_metadata["meta_description"]
            if seo_metadata.get("focus_keyword"):
                meta_fields["_yoast_wpseo_focuskw"] = seo_metadata["focus_keyword"]
                meta_fields["rank_math_focus_keyword"] = seo_metadata["focus_keyword"]
            if meta_fields:
                post_data["meta"] = meta_fields

        max_retries = 3
        last_error = None
        for attempt in range(max_retries):
            try:
                response = await http_client.post(url, auth=(username, password), json=post_data, timeout=60.0)
                if response.status_code in [200, 201]:
                    data = response.json()
                    return {"post_id": data.get("id"), "link": data.get("link"), "slug": data.get("slug"), "status": "success"}
                elif response.status_code == 401:
                    raise Exception("Autenticazione WordPress fallita. Verifica username e password applicazione.")
                elif response.status_code == 403:
                    raise Exception("Permessi insufficienti per pubblicare su WordPress.")
                elif response.status_code == 404:
                    raise Exception("Endpoint WordPress non trovato. Verifica l'URL API.")
                else:
                    last_error = f"WordPress API error: {response.status_code} - {response.text}"
            except httpx.TimeoutException:
                last_error = "Timeout nella connessione a WordPress"
            except httpx.ConnectError:
                last_error = "Impossibile connettersi al server WordPress"
            except Exception as e:
                last_error = str(e)
                if "401" in str(e) or "403" in str(e) or "404" in str(e):
                    raise
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
        raise Exception(last_error or "Errore sconosciuto nella pubblicazione")


# ============== SYSTEM PROMPT BUILDER ==============

def build_system_prompt(kb: dict, tone: dict, seo: dict, client_name: str,
                        advanced_prompt: dict = None, strategy: dict = None,
                        content_type: str = "articolo_blog", brief_override: dict = None) -> str:
    lingua = seo.get("lingua", "italiano")
    lunghezza = seo.get("lunghezza_minima_parole", 1500)
    include_faq = seo.get("include_faq_in_fondo", False)
    registro = tone.get("registro", "professionale_accessibile")
    persona = tone.get("persona_narrativa", "seconda_singolare")
    tono_desc = tone.get("descrizione_tono_libera", "")
    aggettivi = tone.get("aggettivi_brand", [])
    parole_vietate = tone.get("parole_vietate", [])
    frasi_vietate = tone.get("frasi_vietate", [])
    descrizione = kb.get("descrizione_attivita", "")
    storia = kb.get("storia_brand", "")
    citta = kb.get("citta_principale", "")
    regione = kb.get("regione", "")
    territorio = kb.get("descrizione_geografica", "")
    punti_interesse = kb.get("punti_di_interesse_locali", [])
    punti_forza = kb.get("punti_di_forza", [])
    target_primario = kb.get("pubblico_target_primario", "")
    target_secondario = kb.get("pubblico_target_secondario", "")
    cta_base = kb.get("call_to_action_principale", "")
    strat = strategy or {}
    funnel_stage = strat.get("funnel_stage", "TOFU")
    obiettivo = strat.get("obiettivo_primario", "traffico")
    modello_copy = strat.get("modello_copywriting", "PAS")
    buyer_nome = strat.get("buyer_persona_nome", "")
    buyer_desc = strat.get("buyer_persona_descrizione", "")
    buyer_obiezioni = strat.get("buyer_persona_obiezioni", "")
    cta_finale = strat.get("cta_finale", "") or cta_base
    search_intent = strat.get("search_intent", "informazionale")
    leve = strat.get("leve_psicologiche", [])
    kw_secondarie = strat.get("keyword_secondarie", [])
    kw_lsi = strat.get("keyword_lsi", [])
    lunghezza_target = strat.get("lunghezza_target", 0) or lunghezza
    note_speciali = strat.get("note_speciali", "")

    if brief_override:
        if brief_override.get("cta_finale"):
            cta_finale = brief_override["cta_finale"]
        if brief_override.get("note_speciali"):
            note_speciali = brief_override["note_speciali"]
        if brief_override.get("funnel_stage"):
            funnel_stage = brief_override["funnel_stage"]
        if brief_override.get("modello_copywriting"):
            modello_copy = brief_override["modello_copywriting"]

    persona_map = {
        "seconda_singolare": "Usa sempre la seconda persona singolare (tu, il tuo, ti)",
        "prima_plurale": "Usa sempre la prima persona plurale (noi, il nostro, ci)",
        "terza_neutrale": "Usa uno stile impersonale e neutro (si consiglia, e possibile)"
    }
    persona_instruction = persona_map.get(persona, persona_map["seconda_singolare"])
    registro_map = {
        "formale": "Mantieni un tono formale e istituzionale, adatto a un contesto professionale",
        "professionale_accessibile": "Sii professionale ma accessibile, evita tecnicismi eccessivi",
        "amichevole_conversazionale": "Usa un tono amichevole e conversazionale, come parlare con un amico",
        "entusiasta_coinvolgente": "Sii entusiasta e coinvolgente, trasmetti energia e motivazione",
        "autorevole_tecnico": "Mantieni un tono autorevole e tecnico, mostra competenza nel settore"
    }
    registro_desc = registro_map.get(registro, registro_map["professionale_accessibile"])
    content_type_map = {
        "pillar_page": "Pillar Page — contenuto lungo ed esaustivo (2000-3000+ parole), copre l'argomento in modo completo, con indice e sezioni logiche.",
        "articolo_blog": "Articolo Blog — contenuto informativo o commerciale (1200-2000 parole), focalizzato su una keyword specifica.",
        "landing_page": "Landing Page — contenuto persuasivo orientato alla conversione, struttura verticale con una sola CTA."
    }
    content_type_desc = content_type_map.get(content_type, content_type_map["articolo_blog"])
    funnel_map = {
        "TOFU": "TOFU (Top of Funnel) — Il lettore sta esplorando il problema. Educa, informa, crea consapevolezza.",
        "MOFU": "MOFU (Middle of Funnel) — Il lettore conosce il problema e sta valutando soluzioni. Mostra competenza, confronta opzioni.",
        "BOFU": "BOFU (Bottom of Funnel) — Il lettore e pronto a decidere. Sii diretto, presenta l'offerta chiaramente."
    }
    funnel_desc = funnel_map.get(funnel_stage, funnel_map["TOFU"])
    model_instructions = {
        "AIDA": "MODELLO: AIDA (Attenzione - Interesse - Desiderio - Azione)\n1. ATTENZIONE — Apri con headline che colpisce il pain point.\n2. INTERESSE — Mantieni con informazioni rilevanti.\n3. DESIDERIO — Crea desiderio mostrando il risultato trasformativo.\n4. AZIONE — Spingi all'azione con CTA chiara.",
        "PAS": "MODELLO: PAS (Problema - Agitazione - Soluzione)\n1. PROBLEMA — Nomina il problema con le parole del cliente.\n2. AGITAZIONE — Amplifica le conseguenze negative.\n3. SOLUZIONE — Presenta la soluzione come via d'uscita naturale.",
        "FAB": "MODELLO: FAB (Feature - Advantage - Benefit)\n1. FEATURE — Descrivi cosa fa il prodotto/servizio.\n2. ADVANTAGE — Spiega perche e superiore.\n3. BENEFIT — Traduci nel risultato concreto per il lettore.",
        "PASTOR": "MODELLO: PASTOR\n1. PROBLEM — Identifica il problema.\n2. AMPLIFY — Amplifica le conseguenze.\n3. STORY — Racconta una storia di trasformazione.\n4. TESTIMONY — Integra prove sociali.\n5. OFFER — Presenta l'offerta.\n6. RESPONSE — CTA finale.",
        "Libero": "MODELLO: Struttura Libera — Organizza il contenuto nella struttura piu efficace."
    }
    model_desc = model_instructions.get(modello_copy, model_instructions["PAS"])
    leve_map = {
        "riprova_sociale": "RIPROVA SOCIALE — Inserisci riferimenti a numeri di clienti, testimonianze, rating.",
        "autorita": "AUTORITA — Mostra expertise con certificazioni, anni di esperienza.",
        "scarsita": "SCARSITA — Indica disponibilita limitata se reale.",
        "urgenza": "URGENZA — Evidenzia il costo dell'inazione.",
        "reciprocita": "RECIPROCITA — Offri valore gratuito: consigli, checklist, template.",
        "simpatia": "SIMPATIA — Usa storytelling autentico, valori condivisi.",
        "impegno": "IMPEGNO E COERENZA — Usa micro-CTA progressive."
    }
    leve_desc = "\n".join([leve_map[leva] for leva in leve if leva in leve_map])

    prompt = f"""RUOLO: Sei un esperto SEO Copywriter specializzato nella produzione di testi ad alta conversione. Scrivi ESCLUSIVAMENTE in {lingua}.

=== IDENTITA DEL BRAND ===
AZIENDA: {client_name}
{descrizione}

STORIA: {storia}

TARGET PRIMARIO: {target_primario}
TARGET SECONDARIO: {target_secondario}

=== TERRITORIO E LOCALIZZAZIONE ===
- Citta principale: {citta}
- Regione: {regione}
- Descrizione territorio: {territorio}
- Punti di interesse locali: {', '.join(punti_interesse) if punti_interesse else 'N/A'}

=== PUNTI DI FORZA DA EVIDENZIARE ===
{chr(10).join(['- ' + p for p in punti_forza]) if punti_forza else '- Qualita del servizio'}

=== TONO E STILE ===
REGISTRO: {registro_desc}
PERSONA NARRATIVA: {persona_instruction}
{f'ISTRUZIONI AGGIUNTIVE SUL TONO: {tono_desc}' if tono_desc else ''}
AGGETTIVI DEL BRAND: {', '.join(aggettivi) if aggettivi else 'professionale, affidabile, esperto'}

=== DIVIETI ASSOLUTI ===
PAROLE VIETATE: {', '.join(parole_vietate) if parole_vietate else 'Nessuna restrizione specifica'}
FRASI VIETATE: {', '.join(frasi_vietate) if frasi_vietate else 'Nessuna restrizione specifica'}

NON usare MAI:
- Frasi generiche come "Certo!", "Ecco qui", "Posso aiutarti"
- Linguaggio troppo promozionale o superlativo senza sostanza
- Riferimenti diretti ai competitor

=== STRATEGIA CONTENUTO ===
TIPO CONTENUTO: {content_type_desc}
FUNNEL STAGE: {funnel_desc}
OBIETTIVO PRIMARIO: {obiettivo}
INTENTO DI RICERCA: {search_intent}

{f'BUYER PERSONA: {buyer_nome}' if buyer_nome else ''}
{f'Descrizione: {buyer_desc}' if buyer_desc else ''}
{f'Obiezioni tipiche da superare: {buyer_obiezioni}' if buyer_obiezioni else ''}

=== {model_desc} ===

{'=== LEVE PSICOLOGICHE DA INTEGRARE ===' if leve_desc else ''}
{leve_desc}

{f'=== KEYWORD SECONDARIE ==={chr(10)}Integra naturalmente: {", ".join(kw_secondarie)}' if kw_secondarie else ''}
{f'=== KEYWORD LSI (SEMANTICHE) ==={chr(10)}Usa varianti e sinonimi: {", ".join(kw_lsi)}' if kw_lsi else ''}

=== STRUTTURA HTML RICHIESTA ===
Output SOLO in formato HTML valido. Inizia SEMPRE con <h1>.

Struttura obbligatoria:
1. <h1> - Titolo principale SEO ottimizzato
2. <p> - Paragrafo introduttivo (150-200 parole)
3. <h2> - Sezioni principali (almeno 3-4)
4. <h3> - Sottosezioni per approfondimenti
5. <ul><li> - Elenchi puntati per vantaggi
6. <strong> - Evidenzia 2-3 concetti chiave per paragrafo
7. <p> finale con call to action

{'8. <h2>Domande Frequenti</h2> con 3-5 FAQ' if include_faq else ''}

=== REGOLE SEO ===
1. LUNGHEZZA: Minimo {lunghezza_target} parole
2. PARAGRAFI: Max 3-4 righe
3. KEYWORD PRIMARIA: nel titolo H1, nei primi 100 caratteri, in almeno un H2
4. LOCALIZZAZIONE: Menziona la citta/zona target almeno 3-4 volte
5. CTA: una primaria, ripetuta 2-3 volte

=== CALL TO ACTION ===
{cta_finale if cta_finale else 'Contattaci per maggiori informazioni'}

{f'=== NOTE SPECIALI ==={chr(10)}{note_speciali}' if note_speciali else ''}

=== UMANIZZAZIONE DEL TESTO (CRITICO) ===
DIVIETI ASSOLUTI - Pattern AI:
1. NO Title Case nei testi
2. NO frasi introduttive vuote
3. NO elenchi troppo simmetrici
4. NO ripetizione dello stesso pattern di frase
5. NO aggettivi superlativi ripetuti
6. NO conclusioni banali
7. NO transizioni artificiali ripetitive

REGOLE DI UMANIZZAZIONE:
- Varia la lunghezza delle frasi: alcune brevi, altre lunghe
- Usa espressioni colloquiali quando appropriato
- Inserisci domande retoriche
- I titoli H2 e H3 in minuscolo normale (solo prima lettera maiuscola)
"""

    if advanced_prompt:
        secondo_livello = advanced_prompt.get("secondo_livello_prompt", "")
        keyword_template = advanced_prompt.get("keyword_injection_template", "")
        if secondo_livello:
            prompt += f"\n=== ISTRUZIONI AVANZATE ===\n{secondo_livello}\n"
        if keyword_template:
            prompt += f"\n=== TEMPLATE KEYWORD ===\n{keyword_template}\n"

    prompt += "\n=== ISTRUZIONE FINALE ===\nGenera un articolo SEO completo, dettagliato e ottimizzato. Applica il modello di copywriting indicato, integra le leve psicologiche e rispetta tutte le regole SEO on-page."
    return prompt


# ============== SERP SCRAPING ==============

async def scrape_google_serp(keyword: str, country: str = "it", num_results: int = 5) -> list:
    """Search SERP using DuckDuckGo Lite + scrape page content."""
    results = []
    search_urls = []

    try:
        from urllib.parse import unquote, urlparse, parse_qs
        async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }) as http:
            resp = await http.get("https://lite.duckduckgo.com/lite/",
                params={"q": keyword, "kl": f"{country}-{country}"})
            soup = BeautifulSoup(resp.text, "lxml")
            snippets = [td.get_text(strip=True) for td in soup.find_all("td", class_="result-snippet")]
            idx = 0
            for a in soup.find_all("a", class_="result-link"):
                if len(search_urls) >= num_results:
                    break
                raw_href = a.get("href", "")
                title = a.get_text(strip=True)
                # Extract real URL from DuckDuckGo redirect
                if "uddg=" in raw_href:
                    parsed = parse_qs(urlparse(raw_href).query)
                    real_url = unquote(parsed.get("uddg", [raw_href])[0])
                else:
                    real_url = raw_href
                if real_url and title and not real_url.startswith("//duckduckgo"):
                    desc = snippets[idx] if idx < len(snippets) else ""
                    search_urls.append({"url": real_url, "title": title, "description": desc})
                    idx += 1
    except Exception as e:
        logger.warning(f"DuckDuckGo search failed: {e}")
        return []

    async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }) as client_http:
        for i, sr in enumerate(search_urls):
            url = sr["url"]
            try:
                resp = await client_http.get(url)
                page_soup = BeautifulSoup(resp.text, "lxml")
                title = page_soup.title.string.strip() if page_soup.title and page_soup.title.string else sr["title"]
                meta_desc = ""
                meta_tag = page_soup.find("meta", attrs={"name": "description"})
                if meta_tag and meta_tag.get("content"):
                    meta_desc = meta_tag["content"][:300]
                for tag in page_soup(["script", "style", "nav", "header", "footer"]):
                    tag.decompose()
                text = page_soup.get_text(separator=" ", strip=True)[:500]
                headings = [h.get_text(strip=True) for h in page_soup.find_all(["h1", "h2"])[:6]]
                results.append({
                    "position": i + 1, "url": url, "title": title,
                    "description": meta_desc or sr["description"] or text[:200],
                    "headings": headings, "text_preview": text
                })
            except Exception as e:
                results.append({
                    "position": i + 1, "url": url, "title": sr["title"],
                    "description": sr["description"] or f"Errore: {e}",
                    "headings": [], "text_preview": sr["description"]
                })
    return results


async def scrape_website_info(url: str, max_pages: int = 6) -> dict:
    from urllib.parse import urljoin, urlparse
    info = {
        "descrizione_attivita": "", "servizi": [], "citta_principale": "", "regione": "",
        "punti_di_forza": [], "contatti": {}, "pagine_analizzate": [],
        "raw_titles": [], "raw_headings": [], "raw_meta_descriptions": []
    }
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    base_url = url.rstrip("/")
    if not base_url.startswith("http"):
        base_url = "https://" + base_url
    pages_to_visit = [base_url]
    visited = set()

    async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers=headers) as client_http:
        while pages_to_visit and len(visited) < max_pages:
            page_url = pages_to_visit.pop(0)
            if page_url in visited:
                continue
            visited.add(page_url)
            try:
                resp = await client_http.get(page_url)
                soup = BeautifulSoup(resp.text, "lxml")
                title = soup.title.string.strip() if soup.title and soup.title.string else ""
                info["raw_titles"].append(title)
                info["pagine_analizzate"].append(page_url)
                meta = soup.find("meta", attrs={"name": "description"})
                if meta and meta.get("content"):
                    info["raw_meta_descriptions"].append(meta["content"])
                for h in soup.find_all(["h1", "h2", "h3"])[:15]:
                    text = h.get_text(strip=True)
                    if text and len(text) > 3:
                        info["raw_headings"].append(text)
                for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
                    tag.decompose()
                body_text = soup.get_text(separator=" ", strip=True)
                if page_url == base_url:
                    info["descrizione_attivita"] = body_text[:800]
                base_domain = urlparse(base_url).netloc
                for a in soup.find_all("a", href=True):
                    full_url = urljoin(page_url, a["href"])
                    parsed = urlparse(full_url)
                    if parsed.netloc == base_domain and full_url not in visited:
                        link_text = a.get_text(strip=True).lower()
                        important = ["chi siamo", "about", "servizi", "services", "contatti", "contact", "cosa facciamo"]
                        if any(kw in link_text or kw in full_url.lower() for kw in important):
                            pages_to_visit.insert(0, full_url.split("#")[0].split("?")[0])
                        elif len(pages_to_visit) < 20:
                            pages_to_visit.append(full_url.split("#")[0].split("?")[0])
                phones = re.findall(r'[\+]?[0-9]{2,4}[\s\-]?[0-9]{3,4}[\s\-]?[0-9]{3,4}', body_text)
                emails = re.findall(r'[\w.+-]+@[\w-]+\.[\w.]+', body_text)
                if phones:
                    info["contatti"]["telefono"] = phones[0]
                if emails:
                    info["contatti"]["email"] = emails[0]
                italian_cities = ["roma", "milano", "napoli", "torino", "palermo", "genova", "bologna",
                                  "firenze", "bari", "catania", "venezia", "verona", "salerno", "avellino",
                                  "caserta", "benevento", "padova", "trieste", "brescia", "parma", "modena"]
                body_lower = body_text.lower()
                for city in italian_cities:
                    if city in body_lower:
                        info["citta_principale"] = city.title()
                        break
            except Exception as e:
                logger.warning(f"Error scraping {page_url}: {e}")

    info["raw_headings"] = list(dict.fromkeys(info["raw_headings"]))
    service_keywords = ["servizi", "cosa", "offriamo", "proponiamo", "soluzioni", "noleggio", "vendita", "consulenza"]
    for h in info["raw_headings"]:
        h_lower = h.lower()
        if any(kw in h_lower for kw in service_keywords) or (3 < len(h) < 60):
            info["servizi"].append(h)
    info["servizi"] = info["servizi"][:10]
    return info
