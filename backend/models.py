from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any


class ClientCreate(BaseModel):
    nome: str
    settore: str
    sito_web: str
    siti_web: List[str] = []
    attivo: bool = True


class ClientUpdate(BaseModel):
    nome: Optional[str] = None
    settore: Optional[str] = None
    sito_web: Optional[str] = None
    siti_web: Optional[List[str]] = None
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


class GSCConfig(BaseModel):
    site_url: Optional[str] = None
    enabled: Optional[bool] = False
    connected: Optional[bool] = False
    tokens: Optional[Dict] = None


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


class ClientResponse(BaseModel):
    id: str
    nome: str
    settore: str
    sito_web: str
    siti_web: List[str] = []
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
    stato: str
    wordpress_post_id: Optional[str] = None
    wordpress_link: Optional[str] = None
    created_at: str
    published_at: Optional[str] = None
    combination: Optional[Dict] = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "client"
    client_id: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    client_id: Optional[str] = None
    created_at: str


class AssignClientRequest(BaseModel):
    user_id: str
    client_id: str


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
