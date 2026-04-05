from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any


class ClientCreate(BaseModel):
    nome: str
    settore: str
    sito_web: str
    siti_web: List[str] = []
    agenzia: str = "diretto"
    attivo: bool = True


class ClientUpdate(BaseModel):
    nome: Optional[str] = None
    settore: Optional[str] = None
    sito_web: Optional[str] = None
    siti_web: Optional[List[str]] = None
    agenzia: Optional[str] = None
    attivo: Optional[bool] = None


class WordPressConfig(BaseModel):
    url_api: Optional[str] = None
    utente: Optional[str] = None
    password_applicazione: Optional[str] = None
    stato_pubblicazione: Optional[str] = "draft"


class LLMConfig(BaseModel):
    provider: Optional[str] = "openai"
    api_key: Optional[str] = None
    modello: Optional[str] = "gpt-4-turbo-preview"
    temperatura: Optional[float] = 0.7


class KnowledgeBase(BaseModel):
    descrizione_attivita: Optional[str] = None
    storia_brand: Optional[str] = None
    citta_principale: Optional[str] = None
    regione: Optional[str] = None
    descrizione_geografica: Optional[str] = None
    punti_di_interesse_locali: Optional[List[str]] = None
    punti_di_forza: Optional[List[str]] = None
    pubblico_target_primario: Optional[str] = None
    pubblico_target_secondario: Optional[str] = None
    call_to_action_principale: Optional[str] = None
    pagine_scansionate: Optional[List[Dict[str, str]]] = None


class ToneStyle(BaseModel):
    registro: Optional[str] = "professionale_accessibile"
    persona_narrativa: Optional[str] = "seconda_singolare"
    descrizione_tono_libera: Optional[str] = None
    aggettivi_brand: Optional[List[str]] = None
    parole_vietate: Optional[List[str]] = None
    frasi_vietate: Optional[List[str]] = None


class SEOSettings(BaseModel):
    lingua: Optional[str] = "italiano"
    lunghezza_minima_parole: Optional[int] = 1500
    include_faq_in_fondo: Optional[bool] = False
    sitemap_url: Optional[str] = None


class KeywordCombinations(BaseModel):
    servizi: Optional[List[str]] = None
    citta_e_zone: Optional[List[str]] = None
    tipi_o_qualificatori: Optional[List[str]] = None


class AdvancedPrompt(BaseModel):
    secondo_livello_prompt: Optional[str] = None
    keyword_injection_template: Optional[str] = None
    prompt_password: Optional[str] = None


class ContentStrategy(BaseModel):
    funnel_stage: Optional[str] = "TOFU"
    obiettivo_primario: Optional[str] = "traffico"
    modello_copywriting: Optional[str] = "PAS"
    buyer_persona_nome: Optional[str] = None
    buyer_persona_descrizione: Optional[str] = None
    buyer_persona_obiezioni: Optional[str] = None
    cta_finale: Optional[str] = None
    search_intent: Optional[str] = "informazionale"
    leve_psicologiche: Optional[List[str]] = None
    keyword_secondarie: Optional[List[str]] = None
    keyword_lsi: Optional[List[str]] = None
    lunghezza_target: Optional[int] = None
    note_speciali: Optional[str] = None


class AutopilotConfig(BaseModel):
    enabled: bool = False
    strategy: str = "editorial_plan_first" # editorial_plan_first, keyword_combinations
    frequency: str = "weekly" # daily, weekly, biweekly, monthly
    day_of_week: int = 1 # 0-6 (Mon-Sun)
    time_of_day: str = "09:00"

class SiloSuggestRequest(BaseModel):
    client_id: str
    pillar_topic: str
    auto_publish: bool = True
    max_articles_per_run: int = 1
    last_run: Optional[str] = None
    next_run: Optional[str] = None


class GSCConfig(BaseModel):
    site_url: Optional[str] = None
    enabled: Optional[bool] = False
    connected: Optional[bool] = False
    tokens: Optional[Dict] = None
    oauth_client_id: Optional[str] = None
    oauth_client_secret: Optional[str] = None


class ClientConfiguration(BaseModel):
    knowledge_base: Optional[KnowledgeBase] = None
    tono_e_stile: Optional[ToneStyle] = None
    seo: Optional[SEOSettings] = None
    keyword_combinations: Optional[KeywordCombinations] = None
    wordpress: Optional[WordPressConfig] = None
    llm: Optional[LLMConfig] = None
    openai: Optional[LLMConfig] = None
    advanced_prompt: Optional[AdvancedPrompt] = None
    content_strategy: Optional[ContentStrategy] = None
    gsc: Optional[GSCConfig] = None
    autopilot: Optional[AutopilotConfig] = None
    gmb_url: Optional[str] = None


class ClientResponse(BaseModel):
    id: str
    nome: str
    settore: str
    sito_web: str
    siti_web: List[str] = []
    agenzia: str = "diretto"
    attivo: bool
    created_at: str
    totale_articoli: int = 0
    ultimo_run: Optional[str] = None
    configuration: Optional[ClientConfiguration] = None


class ArticleGenerate(BaseModel):
    client_id: str
    combinations: List[Dict[str, str]]
    publish_to_wordpress: bool = False
    content_type: str = "articolo_blog"
    brief: Optional[Dict[str, Any]] = None


class ArticlePublish(BaseModel):
    article_ids: List[str]


class ArticleResponse(BaseModel):
    id: str
    client_id: str
    titolo: str
    contenuto: str
    contenuto_html: Optional[str] = None
    stato: str
    wordpress_post_id: Optional[str] = None
    wordpress_link: Optional[str] = None
    created_at: str
    published_at: Optional[str] = None
    combination: Optional[Dict] = None
    publish_status: Optional[str] = None
    publish_error: Optional[str] = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "client"
    client_ids: List[str] = []


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    client_ids: List[str] = []
    created_at: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    client_ids: Optional[List[str]] = None
    password: Optional[str] = None


class AssignClientRequest(BaseModel):
    user_id: str
    client_ids: List[str]


class SerpScrapingRequest(BaseModel):
    keyword: str
    country: str = "it"
    language: str = "it"
    num_results: int = 4


class SEOSessionCreate(BaseModel):
    session_name: Optional[str] = None
    keywords: Optional[Dict[str, Any]] = None
    advanced_prompt: Optional[Dict[str, Any]] = None
    serp_analyses: Optional[List[str]] = None
    notes: Optional[str] = None


class SEOSessionResponse(BaseModel):
    id: str
    client_id: str
    session_name: str
    keywords: Optional[Dict[str, Any]] = None
    serp_analyses: Optional[List] = None
    advanced_prompt: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    articles_generated: int = 0
    created_at: str


class VerifyPasswordRequest(BaseModel):
    password: str
    client_id: Optional[str] = None


class UpdateAdvancedPromptRequest(BaseModel):
    password: str
    secondo_livello_prompt: Optional[str] = None
    keyword_injection_template: Optional[str] = None
    prompt_password: Optional[str] = None


class SimpleGenerateRequest(BaseModel):
    keyword: str
    client_id: Optional[str] = None
    topic: str = ""
    objective: str = "informazionale"
    titolo_suggerito: Optional[str] = None
    publish_to_wordpress: bool = False
    gsc_context: Optional[Dict] = None
    serp_context: Optional[Dict] = None
    content_type: str = "articolo"  # articolo, landing_page, pillar_page
    image_ids: Optional[List[str]] = None
    generate_cover: bool = False


class ReportCreate(BaseModel):
    title: str
    date: str  # ISO 8601 (YYYY-MM-DDTHH:MM:SSZ)
    modules: Optional[Dict[str, Any]] = None


class ReportUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    modules: Optional[Dict[str, Any]] = None
    is_archived: Optional[bool] = None


class ReportResponse(BaseModel):
    id: str
    client_id: str
    title: str
    date: str
    created_at: str
    updated_at: str
    is_archived: bool = False
    modules: Dict[str, Any] = {}


class PortalCreate(BaseModel):
    name: str
    url: Optional[str] = None
    category: Optional[str] = "directory"


class PortalResponse(BaseModel):
    id: str
    name: str
    url: Optional[str] = None
    category: str
    created_at: str


class CitationToggle(BaseModel):
    portal_id: str
    client_id: str
    date: Optional[str] = None  # ISO 8601
    status: bool = True
    notes: Optional[str] = None
    link: Optional[str] = None


class CitationResponse(BaseModel):
    id: str
    portal_id: str
    client_id: str
    date: str
    status: bool
    notes: Optional[str] = None
    link: Optional[str] = None
    created_at: str


# ============== CHAT MODELS ==============

class ChatMessage(BaseModel):
    role: str  # user, assistant, system
    content: str
    timestamp: str
    metadata: Optional[Dict[str, Any]] = None


class ChatSessionCreate(BaseModel):
    title: Optional[str] = "Nuova Conversazione"


class ChatSessionResponse(BaseModel):
    id: str
    client_id: str
    user_id: str
    title: str
    created_at: str
    updated_at: str
    last_message: Optional[str] = None

# ============== GLOBAL SETTINGS ==============

class SEOGeoGuideline(BaseModel):
    id: str
    title: str
    content: str  # Can contain markdown and links
    links_data: Optional[List[Dict[str, Any]]] = None # To store scraped content from links
    last_synced: Optional[str] = None
    created_at: str
    updated_at: str

class GlobalSettings(BaseModel):
    id: str = "global"
    seo_geo_guidelines: List[SEOGeoGuideline] = []
    updated_at: str

class ProgrammaticArchitectRequest(BaseModel):
    client_id: str
    topic: str
    service: str
    cities: List[str]

class ProgrammaticPreviewRequest(BaseModel):
    template: str
    item: Dict[str, Any]
    global_images: Optional[List[str]] = []
