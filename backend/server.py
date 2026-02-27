from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import itertools
import io
import asyncio
import pandas as pd

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'seo-engine-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

app = FastAPI(title="Programmatic SEO Engine")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "client"  # admin or client

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    client_id: Optional[str] = None
    created_at: str

class ClientCreate(BaseModel):
    nome: str
    settore: str
    sito_web: str
    attivo: bool = True

class ClientUpdate(BaseModel):
    nome: Optional[str] = None
    settore: Optional[str] = None
    sito_web: Optional[str] = None
    attivo: Optional[bool] = None

class WordPressConfig(BaseModel):
    url_api: str
    utente: str
    password_applicazione: str
    stato_pubblicazione: str = "draft"

class LLMConfig(BaseModel):
    provider: str = "openai"  # openai, anthropic, deepseek, perplexity
    api_key: str = ""
    modello: str = "gpt-4-turbo-preview"
    temperatura: float = 0.7

# Alias for backward compatibility
class OpenAIConfig(LLMConfig):
    pass

class SEOConfig(BaseModel):
    lingua: str = "italiano"
    lunghezza_minima_parole: int = 1500
    include_faq_in_fondo: bool = False

class ToneStyle(BaseModel):
    registro: str = "professionale_accessibile"
    persona_narrativa: str = "seconda_singolare"
    descrizione_tono_libera: str = ""
    aggettivi_brand: List[str] = []
    parole_vietate: List[str] = []
    frasi_vietate: List[str] = []

class KnowledgeBase(BaseModel):
    descrizione_attivita: str = ""
    storia_brand: str = ""
    citta_principale: str = ""
    regione: str = ""
    descrizione_geografica: str = ""
    punti_di_interesse_locali: List[str] = []
    punti_di_forza: List[str] = []
    pubblico_target_primario: str = ""
    pubblico_target_secondario: str = ""
    call_to_action_principale: str = ""

class KeywordCombinations(BaseModel):
    servizi: List[str] = []
    citta_e_zone: List[str] = []
    tipi_o_qualificatori: List[str] = []

class ApifyConfig(BaseModel):
    enabled: bool = False  # Toggle to enable/disable Apify for this client
    api_key: str = ""
    actor_id: str = "apify/google-search-scraper"

class AdvancedPromptConfig(BaseModel):
    prompt_password: str = ""  # Password to access prompt editing
    secondo_livello_prompt: str = ""  # Second level prompt for article generation
    keyword_injection_template: str = ""  # Template for keyword injection

class ClientConfiguration(BaseModel):
    wordpress: Optional[WordPressConfig] = None
    llm: Optional[LLMConfig] = None  # New unified LLM config
    openai: Optional[OpenAIConfig] = None  # Backward compatibility
    apify: Optional[ApifyConfig] = None
    advanced_prompt: Optional[AdvancedPromptConfig] = None
    seo: Optional[SEOConfig] = None
    tono_e_stile: Optional[ToneStyle] = None
    knowledge_base: Optional[KnowledgeBase] = None
    keyword_combinations: Optional[KeywordCombinations] = None

class ClientResponse(BaseModel):
    id: str
    nome: str
    settore: str
    sito_web: str
    attivo: bool
    created_at: str
    totale_articoli: int = 0
    ultimo_run: Optional[str] = None
    configuration: Optional[ClientConfiguration] = None

class ArticleGenerate(BaseModel):
    client_id: str
    combinations: List[Dict[str, str]]  # [{servizio, citta, tipo}]

class ArticleResponse(BaseModel):
    id: str
    client_id: str
    titolo: str
    contenuto: str
    stato: str  # generated, published, failed
    wordpress_post_id: Optional[str] = None
    created_at: str
    published_at: Optional[str] = None

class ArticlePublish(BaseModel):
    article_ids: List[str]

class ArticleGenerateAndPublish(BaseModel):
    client_id: str
    combinations: List[Dict[str, str]]
    publish_to_wordpress: bool = True

# ============== SEO SESSION HISTORY MODELS ==============

class SEOSessionCreate(BaseModel):
    client_id: str
    session_name: str = ""
    keywords: Optional[Dict[str, List[str]]] = None  # keyword_combinations snapshot
    serp_analyses: Optional[List[str]] = None  # list of serp_analysis IDs
    advanced_prompt: Optional[Dict[str, str]] = None  # prompt snapshot
    notes: str = ""

class SEOSessionResponse(BaseModel):
    id: str
    client_id: str
    session_name: str
    keywords: Dict[str, List[str]]
    serp_analyses: List[Dict]
    advanced_prompt: Dict[str, str]
    notes: str
    articles_generated: int
    created_at: str

# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str, role: str, client_id: Optional[str] = None) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "client_id": client_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")

async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accesso riservato agli admin")
    return current_user

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email già registrata")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user.email,
        "password": hash_password(user.password),
        "name": user.name,
        "role": user.role,
        "client_id": None,
        "created_at": now
    }
    await db.users.insert_one(user_doc)
    
    return UserResponse(
        id=user_id,
        email=user.email,
        name=user.name,
        role=user.role,
        client_id=None,
        created_at=now
    )

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    token = create_token(user["id"], user["email"], user["role"], user.get("client_id"))
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "client_id": user.get("client_id")
        }
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return UserResponse(**user)

class AssignClientRequest(BaseModel):
    user_id: str
    client_id: str

@api_router.post("/users/assign-client")
async def assign_user_to_client(request: AssignClientRequest, current_user: dict = Depends(require_admin)):
    # Verify client exists
    client = await db.clients.find_one({"id": request.client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    # Update user
    result = await db.users.update_one(
        {"id": request.user_id},
        {"$set": {"client_id": request.client_id}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    
    return {"message": "Utente assegnato al cliente", "user_id": request.user_id, "client_id": request.client_id}

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(100)
    return [UserResponse(**u) for u in users]

# ============== CLIENTS ENDPOINTS ==============

@api_router.get("/clients", response_model=List[ClientResponse])
async def get_clients(current_user: dict = Depends(get_current_user)):
    query = {}
    if current_user["role"] != "admin":
        query["id"] = current_user.get("client_id")
    
    clients = await db.clients.find(query, {"_id": 0}).to_list(100)
    
    # Add article counts
    for client in clients:
        count = await db.articles.count_documents({"client_id": client["id"]})
        client["totale_articoli"] = count
    
    return [ClientResponse(**c) for c in clients]

@api_router.get("/clients/{client_id}", response_model=ClientResponse)
async def get_client(client_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    count = await db.articles.count_documents({"client_id": client_id})
    client["totale_articoli"] = count
    
    return ClientResponse(**client)

@api_router.post("/clients", response_model=ClientResponse)
async def create_client(client: ClientCreate, current_user: dict = Depends(require_admin)):
    client_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    client_doc = {
        "id": client_id,
        "nome": client.nome,
        "settore": client.settore,
        "sito_web": client.sito_web,
        "attivo": client.attivo,
        "created_at": now,
        "ultimo_run": None,
        "configuration": None
    }
    await db.clients.insert_one(client_doc)
    
    return ClientResponse(**client_doc, totale_articoli=0)

@api_router.put("/clients/{client_id}", response_model=ClientResponse)
async def update_client(client_id: str, update: ClientUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    
    result = await db.clients.update_one({"id": client_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    count = await db.articles.count_documents({"client_id": client_id})
    client["totale_articoli"] = count
    
    return ClientResponse(**client)

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_user: dict = Depends(require_admin)):
    result = await db.clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    # Delete related articles
    await db.articles.delete_many({"client_id": client_id})
    
    return {"message": "Cliente eliminato"}

# ============== CONFIGURATION ENDPOINTS ==============

@api_router.put("/clients/{client_id}/configuration")
async def update_configuration(client_id: str, config: ClientConfiguration, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    config_dict = config.model_dump(exclude_none=True)
    
    result = await db.clients.update_one(
        {"id": client_id},
        {"$set": {"configuration": config_dict}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    return {"message": "Configurazione aggiornata", "configuration": config_dict}

@api_router.get("/clients/{client_id}/combinations")
async def get_combinations(client_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    config = client.get("configuration", {})
    kw = config.get("keyword_combinations", {})
    
    servizi = kw.get("servizi", [])
    citta = kw.get("citta_e_zone", [])
    tipi = kw.get("tipi_o_qualificatori", [])
    
    combinations = []
    for combo in itertools.product(servizi, citta, tipi):
        combinations.append({
            "servizio": combo[0],
            "citta": combo[1],
            "tipo": combo[2],
            "titolo": f"{combo[0]} {combo[2]} a {combo[1]}"
        })
    
    return {"combinations": combinations, "total": len(combinations)}

# ============== ARTICLES ENDPOINTS ==============

@api_router.get("/articles", response_model=List[ArticleResponse])
async def get_articles(
    client_id: Optional[str] = None,
    stato: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if current_user["role"] != "admin":
        query["client_id"] = current_user.get("client_id")
    elif client_id:
        query["client_id"] = client_id
    
    if stato:
        query["stato"] = stato
    
    articles = await db.articles.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [ArticleResponse(**a) for a in articles]

@api_router.get("/articles/{article_id}", response_model=ArticleResponse)
async def get_article(article_id: str, current_user: dict = Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    
    if current_user["role"] != "admin" and current_user.get("client_id") != article["client_id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    return ArticleResponse(**article)

@api_router.get("/articles/{article_id}/full")
async def get_article_full(article_id: str, current_user: dict = Depends(get_current_user)):
    """
    Restituisce l'articolo completo con tutti i metadati SEO e info WordPress.
    """
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    
    if current_user["role"] != "admin" and current_user.get("client_id") != article["client_id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    return article

@api_router.post("/articles/generate")
async def generate_articles(request: ArticleGenerate, current_user: dict = Depends(get_current_user)):
    """
    Genera articoli SEO basati sulle combinazioni di keyword.
    Include metadati SEO: meta description, tags, slug.
    """
    if current_user["role"] != "admin" and current_user.get("client_id") != request.client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    client = await db.clients.find_one({"id": request.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    config = client.get("configuration", {})
    
    # Support both new llm config and legacy openai config
    llm_config = config.get("llm", {}) or config.get("openai", {})
    
    if not llm_config.get("api_key"):
        raise HTTPException(status_code=400, detail="API Key LLM non configurata. Configura OpenAI, Claude, DeepSeek o Perplexity.")
    
    # Get provider (default to openai for backward compatibility)
    provider = llm_config.get("provider", "openai")
    
    # Build system prompt from configuration
    kb = config.get("knowledge_base", {})
    tone = config.get("tono_e_stile", {})
    seo = config.get("seo", {})
    advanced_prompt = config.get("advanced_prompt", {})
    
    # Build comprehensive system prompt
    system_prompt = build_system_prompt(kb, tone, seo, client["nome"], advanced_prompt)
    
    generated_articles = []
    
    for combo in request.combinations:
        titolo = f"{combo['servizio']} {combo['tipo']} a {combo['citta']}"
        titolo_formatted = titolo.title()
        
        # Retry logic for LLM generation
        max_retries = 3
        content = None
        last_error = None
        
        for attempt in range(max_retries):
            try:
                content = await generate_with_llm(
                    provider=provider,
                    api_key=llm_config["api_key"],
                    model=llm_config.get("modello", "gpt-4-turbo-preview"),
                    temperature=llm_config.get("temperatura", 0.7),
                    system_prompt=system_prompt,
                    user_prompt=titolo_formatted
                )
                break  # Success, exit retry loop
            except Exception as e:
                last_error = e
                logger.warning(f"Generation attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
        
        if content:
            # Generate SEO metadata
            seo_metadata = generate_seo_metadata(titolo_formatted, content, kb, combo)
            
            article_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            
            article_doc = {
                "id": article_id,
                "client_id": request.client_id,
                "titolo": titolo_formatted,
                "contenuto": content,
                "stato": "generated",
                "wordpress_post_id": None,
                "created_at": now,
                "published_at": None,
                "combination": combo,
                # SEO Metadata
                "seo_metadata": seo_metadata
            }
            
            await db.articles.insert_one(article_doc)
            generated_articles.append(ArticleResponse(**{k: v for k, v in article_doc.items() if k != 'seo_metadata'}))
            
        else:
            logger.error(f"Error generating article after {max_retries} attempts: {last_error}")
            article_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            
            article_doc = {
                "id": article_id,
                "client_id": request.client_id,
                "titolo": titolo_formatted,
                "contenuto": f"Errore nella generazione dopo {max_retries} tentativi: {str(last_error)}",
                "stato": "failed",
                "wordpress_post_id": None,
                "created_at": now,
                "published_at": None
            }
            await db.articles.insert_one(article_doc)
            generated_articles.append(ArticleResponse(**article_doc))
    
    # Update ultimo_run
    await db.clients.update_one(
        {"id": request.client_id},
        {"$set": {"ultimo_run": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"articles": generated_articles, "generated": len([a for a in generated_articles if a.stato == "generated"])}

@api_router.post("/articles/publish")
async def publish_articles(request: ArticlePublish, current_user: dict = Depends(get_current_user)):
    """
    Pubblica articoli su WordPress con supporto per tag, categorie e meta SEO.
    Include gestione errori robusta e retry automatico.
    """
    published = []
    failed = []
    
    for article_id in request.article_ids:
        article = await db.articles.find_one({"id": article_id}, {"_id": 0})
        if not article:
            failed.append({
                "id": article_id, 
                "error": "Articolo non trovato",
                "error_code": "NOT_FOUND"
            })
            continue
        
        if current_user["role"] != "admin" and current_user.get("client_id") != article["client_id"]:
            failed.append({
                "id": article_id, 
                "error": "Accesso non autorizzato",
                "error_code": "UNAUTHORIZED"
            })
            continue
        
        client = await db.clients.find_one({"id": article["client_id"]}, {"_id": 0})
        if not client:
            failed.append({
                "id": article_id, 
                "error": "Cliente non trovato",
                "error_code": "CLIENT_NOT_FOUND"
            })
            continue
        
        config = client.get("configuration", {})
        wp_config = config.get("wordpress", {})
        
        # Validate WordPress configuration
        if not wp_config.get("url_api"):
            failed.append({
                "id": article_id, 
                "error": "URL API WordPress non configurato",
                "error_code": "WP_URL_MISSING"
            })
            continue
            
        if not wp_config.get("utente") or not wp_config.get("password_applicazione"):
            failed.append({
                "id": article_id, 
                "error": "Credenziali WordPress non configurate",
                "error_code": "WP_CREDENTIALS_MISSING"
            })
            continue
        
        try:
            # Get SEO metadata from article
            seo_metadata = article.get("seo_metadata", {})
            
            # Publish to WordPress with SEO metadata
            result = await publish_to_wordpress(
                url=wp_config["url_api"],
                username=wp_config["utente"],
                password=wp_config["password_applicazione"],
                title=article["titolo"],
                content=article["contenuto"],
                wp_status=wp_config.get("stato_pubblicazione", "draft"),
                seo_metadata=seo_metadata,
                tags=seo_metadata.get("tags", [])
            )
            
            now = datetime.now(timezone.utc).isoformat()
            await db.articles.update_one(
                {"id": article_id},
                {"$set": {
                    "stato": "published",
                    "wordpress_post_id": str(result["post_id"]),
                    "wordpress_link": result.get("link"),
                    "wordpress_slug": result.get("slug"),
                    "published_at": now
                }}
            )
            
            published.append({
                "id": article_id, 
                "wordpress_post_id": result["post_id"],
                "link": result.get("link"),
                "slug": result.get("slug")
            })
            
            logger.info(f"Article {article_id} published successfully to WordPress (post_id: {result['post_id']})")
            
        except Exception as e:
            error_msg = str(e)
            error_code = "PUBLISH_ERROR"
            
            # Categorize error
            if "401" in error_msg or "Autenticazione" in error_msg:
                error_code = "WP_AUTH_ERROR"
            elif "403" in error_msg or "Permessi" in error_msg:
                error_code = "WP_PERMISSION_ERROR"
            elif "404" in error_msg or "non trovato" in error_msg.lower():
                error_code = "WP_ENDPOINT_ERROR"
            elif "Timeout" in error_msg or "timeout" in error_msg.lower():
                error_code = "WP_TIMEOUT"
            elif "Impossibile connettersi" in error_msg:
                error_code = "WP_CONNECTION_ERROR"
            
            logger.error(f"Error publishing article {article_id}: {error_msg}")
            failed.append({
                "id": article_id, 
                "error": error_msg,
                "error_code": error_code
            })
            
            # Update article state to failed
            await db.articles.update_one(
                {"id": article_id},
                {"$set": {
                    "stato": "publish_failed",
                    "publish_error": error_msg,
                    "publish_error_at": datetime.now(timezone.utc).isoformat()
                }}
            )
    
    return {
        "published": published, 
        "failed": failed,
        "summary": {
            "total_requested": len(request.article_ids),
            "published_count": len(published),
            "failed_count": len(failed)
        }
    }

@api_router.delete("/articles/{article_id}")
async def delete_article(article_id: str, current_user: dict = Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    
    if current_user["role"] != "admin" and current_user.get("client_id") != article["client_id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    await db.articles.delete_one({"id": article_id})
    return {"message": "Articolo eliminato"}

# ============== STATISTICS ENDPOINTS ==============

@api_router.get("/stats/overview")
async def get_overview_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "admin":
        total_clients = await db.clients.count_documents({})
        active_clients = await db.clients.count_documents({"attivo": True})
        total_articles = await db.articles.count_documents({})
        published_articles = await db.articles.count_documents({"stato": "published"})
        generated_articles = await db.articles.count_documents({"stato": "generated"})
        
        # Recent clients
        recent_clients = await db.clients.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
        
        return {
            "total_clients": total_clients,
            "active_clients": active_clients,
            "total_articles": total_articles,
            "published_articles": published_articles,
            "generated_articles": generated_articles,
            "recent_clients": recent_clients
        }
    else:
        client_id = current_user.get("client_id")
        total_articles = await db.articles.count_documents({"client_id": client_id})
        published_articles = await db.articles.count_documents({"client_id": client_id, "stato": "published"})
        generated_articles = await db.articles.count_documents({"client_id": client_id, "stato": "generated"})
        
        return {
            "total_articles": total_articles,
            "published_articles": published_articles,
            "generated_articles": generated_articles
        }

# ============== HELPER FUNCTIONS ==============

def build_system_prompt(kb: dict, tone: dict, seo: dict, client_name: str, advanced_prompt: dict = None) -> str:
    """
    Costruisce un prompt di sistema completo per la generazione di articoli SEO.
    Basato sulla logica del notebook SEO_Batch_MultiCliente.
    """
    lingua = seo.get("lingua", "italiano")
    lunghezza = seo.get("lunghezza_minima_parole", 1500)
    include_faq = seo.get("include_faq_in_fondo", False)
    
    # Tone and style parameters
    registro = tone.get("registro", "professionale_accessibile")
    persona = tone.get("persona_narrativa", "seconda_singolare")
    tono_desc = tone.get("descrizione_tono_libera", "")
    aggettivi = tone.get("aggettivi_brand", [])
    parole_vietate = tone.get("parole_vietate", [])
    frasi_vietate = tone.get("frasi_vietate", [])
    
    # Knowledge base parameters
    descrizione = kb.get("descrizione_attivita", "")
    storia = kb.get("storia_brand", "")
    citta = kb.get("citta_principale", "")
    regione = kb.get("regione", "")
    territorio = kb.get("descrizione_geografica", "")
    punti_interesse = kb.get("punti_di_interesse_locali", [])
    punti_forza = kb.get("punti_di_forza", [])
    target_primario = kb.get("pubblico_target_primario", "")
    target_secondario = kb.get("pubblico_target_secondario", "")
    cta = kb.get("call_to_action_principale", "")
    
    # Build persona instruction
    persona_map = {
        "seconda_singolare": "Usa sempre la seconda persona singolare (tu, il tuo, ti)",
        "prima_plurale": "Usa sempre la prima persona plurale (noi, il nostro, ci)",
        "terza_neutrale": "Usa uno stile impersonale e neutro (si consiglia, è possibile)"
    }
    persona_instruction = persona_map.get(persona, persona_map["seconda_singolare"])
    
    # Build registro description
    registro_map = {
        "formale": "Mantieni un tono formale e istituzionale, adatto a un contesto professionale",
        "professionale_accessibile": "Sii professionale ma accessibile, evita tecnicismi eccessivi",
        "amichevole_conversazionale": "Usa un tono amichevole e conversazionale, come parlare con un amico",
        "entusiasta_coinvolgente": "Sii entusiasta e coinvolgente, trasmetti energia e motivazione",
        "autorevole_tecnico": "Mantieni un tono autorevole e tecnico, mostra competenza nel settore"
    }
    registro_desc = registro_map.get(registro, registro_map["professionale_accessibile"])
    
    # Build the comprehensive system prompt
    prompt = f"""RUOLO: Sei un esperto copywriter SEO italiano specializzato in contenuti ottimizzati per i motori di ricerca. Scrivi ESCLUSIVAMENTE in {lingua}.

=== IDENTITÀ DEL BRAND ===
AZIENDA: {client_name}
{descrizione}

STORIA: {storia}

TARGET PRIMARIO: {target_primario}
TARGET SECONDARIO: {target_secondario}

=== TERRITORIO E LOCALIZZAZIONE ===
- Città principale: {citta}
- Regione: {regione}
- Descrizione territorio: {territorio}
- Punti di interesse locali: {', '.join(punti_interesse) if punti_interesse else 'N/A'}

Quando scrivi, menziona dettagli locali specifici per rafforzare la rilevanza geografica.

=== PUNTI DI FORZA DA EVIDENZIARE ===
{chr(10).join(['• ' + p for p in punti_forza]) if punti_forza else '• Qualità del servizio'}

=== TONO E STILE ===
REGISTRO: {registro_desc}
PERSONA NARRATIVA: {persona_instruction}
{f'ISTRUZIONI AGGIUNTIVE: {tono_desc}' if tono_desc else ''}
AGGETTIVI DEL BRAND: {', '.join(aggettivi) if aggettivi else 'professionale, affidabile, esperto'}

=== DIVIETI ASSOLUTI ===
PAROLE VIETATE: {', '.join(parole_vietate) if parole_vietate else 'Nessuna restrizione specifica'}
FRASI VIETATE: {', '.join(frasi_vietate) if frasi_vietate else 'Nessuna restrizione specifica'}

NON usare MAI:
- Frasi generiche come "Certo!", "Ecco qui", "Posso aiutarti"
- Linguaggio troppo promozionale o superlativo senza sostanza
- Riferimenti diretti ai competitor

=== STRUTTURA HTML RICHIESTA ===
Output SOLO in formato HTML valido. Inizia SEMPRE con <h1>.

Struttura obbligatoria:
1. <h1> - Titolo principale SEO ottimizzato con la keyword target
2. <p> - Paragrafo introduttivo accattivante (150-200 parole)
3. <h2> - Sezioni principali (almeno 3-4)
4. <h3> - Sottosezioni per approfondimenti
5. <ul><li> - Elenchi puntati per caratteristiche e vantaggi
6. <strong> - Evidenzia 2-3 parole chiave per paragrafo
7. <p> finale con call to action

{'8. <h2>Domande Frequenti</h2> con 3-5 FAQ rilevanti in formato <h3>Domanda</h3><p>Risposta</p>' if include_faq else ''}

=== REGOLE SEO TECNICHE ===
1. LUNGHEZZA: Minimo {lunghezza} parole
2. PARAGRAFI: 200-250 parole ciascuno, mai blocchi troppo lunghi
3. KEYWORD: Inserisci la keyword principale nel titolo H1, nei primi 100 caratteri, in almeno un H2
4. KEYWORD DENSITY: Usa la keyword 1-2 volte per paragrafo, in modo naturale
5. LOCALIZZAZIONE: Menziona la città/zona target almeno 3-4 volte
6. SEMANTICA: Usa sinonimi e termini correlati per ampliare la copertura semantica
7. LEGGIBILITÀ: Frasi brevi (max 20-25 parole), forma attiva, linguaggio diretto
8. TECNICISMI: Spiega sempre i termini tecnici in modo semplice tra parentesi

=== CALL TO ACTION ===
{cta if cta else 'Contattaci per maggiori informazioni'}

Inserisci la CTA in modo naturale nel paragrafo conclusivo.
"""

    # Add advanced prompt if provided (secondo livello)
    if advanced_prompt:
        secondo_livello = advanced_prompt.get("secondo_livello_prompt", "")
        keyword_template = advanced_prompt.get("keyword_injection_template", "")
        
        if secondo_livello:
            prompt += f"\n=== ISTRUZIONI AVANZATE ===\n{secondo_livello}\n"
        
        if keyword_template:
            prompt += f"\n=== TEMPLATE KEYWORD ===\n{keyword_template}\n"

    prompt += "\n=== ISTRUZIONE FINALE ===\nGenera un articolo SEO completo, dettagliato e ottimizzato basato sul titolo fornito. L'articolo deve essere pronto per la pubblicazione su WordPress."

    return prompt


def generate_seo_metadata(title: str, content: str, kb: dict, combination: dict) -> dict:
    """
    Genera metadati SEO per l'articolo: meta description, tags, slug.
    """
    cta = kb.get("call_to_action_principale", "")
    citta = kb.get("citta_principale", "")
    
    # Generate meta description (max 160 chars)
    meta_desc = f"{title}. {cta}"[:155] + "..." if len(f"{title}. {cta}") > 155 else f"{title}. {cta}"
    
    # Generate tags from combination and knowledge base
    tags = []
    if combination.get("servizio"):
        tags.append(combination["servizio"])
    if combination.get("citta"):
        tags.append(combination["citta"])
    if combination.get("tipo"):
        tags.append(combination["tipo"])
    if citta:
        tags.append(citta)
    
    # Add additional tags from knowledge base
    punti_forza = kb.get("punti_di_forza", [])
    if punti_forza:
        tags.extend(punti_forza[:2])  # Add first 2 strengths as tags
    
    # Generate slug from title
    import re
    slug = title.lower()
    slug = re.sub(r'[àáâãäå]', 'a', slug)
    slug = re.sub(r'[èéêë]', 'e', slug)
    slug = re.sub(r'[ìíîï]', 'i', slug)
    slug = re.sub(r'[òóôõö]', 'o', slug)
    slug = re.sub(r'[ùúûü]', 'u', slug)
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s]+', '-', slug)
    slug = slug[:100]  # Limit slug length
    
    return {
        "meta_description": meta_desc,
        "tags": list(set(tags)),  # Remove duplicates
        "slug": slug,
        "focus_keyword": f"{combination.get('servizio', '')} {combination.get('citta', '')}".strip()
    }

# LLM Provider configurations
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
    """Unified LLM generation function supporting multiple providers"""
    
    async with httpx.AsyncClient() as client:
        if provider == "anthropic":
            # Anthropic has different API format
            response = await client.post(
                LLM_PROVIDERS["anthropic"]["base_url"],
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "max_tokens": 4000,
                    "system": system_prompt,
                    "messages": [
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": temperature
                },
                timeout=120.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Anthropic API error: {response.status_code} - {response.text}")
            
            data = response.json()
            return data["content"][0]["text"]
        
        elif provider == "deepseek":
            # DeepSeek uses OpenAI-compatible API
            response = await client.post(
                LLM_PROVIDERS["deepseek"]["base_url"],
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": temperature,
                    "max_tokens": 4000
                },
                timeout=120.0
            )
            
            if response.status_code != 200:
                raise Exception(f"DeepSeek API error: {response.status_code} - {response.text}")
            
            data = response.json()
            return data["choices"][0]["message"]["content"]
        
        elif provider == "perplexity":
            # Perplexity uses OpenAI-compatible API
            response = await client.post(
                LLM_PROVIDERS["perplexity"]["base_url"],
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": temperature,
                    "max_tokens": 4000
                },
                timeout=120.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Perplexity API error: {response.status_code} - {response.text}")
            
            data = response.json()
            return data["choices"][0]["message"]["content"]
        
        else:  # OpenAI (default)
            response = await client.post(
                LLM_PROVIDERS["openai"]["base_url"],
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": temperature,
                    "max_tokens": 4000
                },
                timeout=120.0
            )
            
            if response.status_code != 200:
                raise Exception(f"OpenAI API error: {response.status_code} - {response.text}")
            
            data = response.json()
            return data["choices"][0]["message"]["content"]

# Backward compatibility alias
async def generate_with_openai(api_key: str, model: str, temperature: float, system_prompt: str, user_prompt: str) -> str:
    return await generate_with_llm("openai", api_key, model, temperature, system_prompt, user_prompt)

# Endpoint to get available LLM providers and models
@api_router.get("/llm-providers")
async def get_llm_providers():
    return {
        "providers": [
            {
                "id": "openai",
                "name": "OpenAI",
                "models": [
                    {"id": "gpt-4-turbo-preview", "name": "GPT-4 Turbo (Raccomandato)"},
                    {"id": "gpt-4o", "name": "GPT-4o"},
                    {"id": "gpt-4", "name": "GPT-4"},
                    {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo (Economico)"}
                ]
            },
            {
                "id": "anthropic",
                "name": "Claude (Anthropic)",
                "models": [
                    {"id": "claude-sonnet-4-5-20250929", "name": "Claude Sonnet 4.5"},
                    {"id": "claude-3-5-haiku-20241022", "name": "Claude Haiku 3.5"},
                    {"id": "claude-3-opus-20240229", "name": "Claude Opus 3"}
                ]
            },
            {
                "id": "deepseek",
                "name": "DeepSeek",
                "models": [
                    {"id": "deepseek-chat", "name": "DeepSeek Chat"},
                    {"id": "deepseek-coder", "name": "DeepSeek Coder"},
                    {"id": "deepseek-reasoner", "name": "DeepSeek Reasoner (R1)"}
                ]
            },
            {
                "id": "perplexity",
                "name": "Perplexity",
                "models": [
                    {"id": "sonar-pro", "name": "Sonar Pro (Con Ricerca Web)"},
                    {"id": "sonar", "name": "Sonar"},
                    {"id": "llama-3.1-sonar-large-128k-online", "name": "Llama 3.1 Sonar Large"}
                ]
            }
        ]
    }

async def publish_to_wordpress(
    url: str, 
    username: str, 
    password: str, 
    title: str, 
    content: str, 
    wp_status: str = "draft",
    seo_metadata: dict = None,
    categories: List[int] = None,
    tags: List[str] = None
) -> dict:
    """
    Pubblica un articolo su WordPress tramite REST API.
    Supporta tag, categorie e metadati SEO per Yoast/RankMath.
    
    Args:
        url: WordPress REST API endpoint (e.g., https://site.com/wp-json/wp/v2/posts)
        username: WordPress username
        password: Application password
        title: Article title
        content: HTML content
        wp_status: Post status (draft, publish, pending)
        seo_metadata: Dict with meta_description, focus_keyword, slug
        categories: List of category IDs
        tags: List of tag names (will be created if not exist)
    
    Returns:
        Dict with post_id and status
    """
    
    async with httpx.AsyncClient() as http_client:
        # Build the post data
        post_data = {
            "title": title,
            "content": content,
            "status": wp_status
        }
        
        # Add slug if provided
        if seo_metadata and seo_metadata.get("slug"):
            post_data["slug"] = seo_metadata["slug"]
        
        # Add categories if provided
        if categories:
            post_data["categories"] = categories
        
        # Handle tags - WordPress REST API accepts tag names directly with "tags" endpoint
        # or we can pass tag IDs. For simplicity, we'll use tag names with a separate call
        tag_ids = []
        if tags:
            # Get base URL for tags endpoint
            base_url = url.replace("/posts", "")
            
            for tag_name in tags:
                try:
                    # Check if tag exists
                    search_response = await http_client.get(
                        f"{base_url}/tags",
                        auth=(username, password),
                        params={"search": tag_name},
                        timeout=10.0
                    )
                    
                    if search_response.status_code == 200:
                        existing_tags = search_response.json()
                        # Find exact match
                        tag_found = None
                        for t in existing_tags:
                            if t.get("name", "").lower() == tag_name.lower():
                                tag_found = t
                                break
                        
                        if tag_found:
                            tag_ids.append(tag_found["id"])
                        else:
                            # Create new tag
                            create_response = await http_client.post(
                                f"{base_url}/tags",
                                auth=(username, password),
                                json={"name": tag_name},
                                timeout=10.0
                            )
                            if create_response.status_code in [200, 201]:
                                new_tag = create_response.json()
                                tag_ids.append(new_tag["id"])
                except Exception as e:
                    logger.warning(f"Error handling tag '{tag_name}': {e}")
                    continue
        
        if tag_ids:
            post_data["tags"] = tag_ids
        
        # Add SEO metadata as excerpt (meta description)
        if seo_metadata and seo_metadata.get("meta_description"):
            post_data["excerpt"] = seo_metadata["meta_description"]
        
        # Try to add Yoast/RankMath SEO meta if available
        # These require the respective plugins to be active
        if seo_metadata:
            meta_fields = {}
            
            # Yoast SEO meta fields
            if seo_metadata.get("meta_description"):
                meta_fields["_yoast_wpseo_metadesc"] = seo_metadata["meta_description"]
            if seo_metadata.get("focus_keyword"):
                meta_fields["_yoast_wpseo_focuskw"] = seo_metadata["focus_keyword"]
            
            # RankMath SEO meta fields (alternative)
            if seo_metadata.get("meta_description"):
                meta_fields["rank_math_description"] = seo_metadata["meta_description"]
            if seo_metadata.get("focus_keyword"):
                meta_fields["rank_math_focus_keyword"] = seo_metadata["focus_keyword"]
            
            if meta_fields:
                post_data["meta"] = meta_fields
        
        # Make the API call with retry logic
        max_retries = 3
        last_error = None
        
        for attempt in range(max_retries):
            try:
                response = await http_client.post(
                    url,
                    auth=(username, password),
                    json=post_data,
                    timeout=60.0
                )
                
                if response.status_code in [200, 201]:
                    data = response.json()
                    return {
                        "post_id": data.get("id"),
                        "link": data.get("link"),
                        "slug": data.get("slug"),
                        "status": "success"
                    }
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
                    raise  # Don't retry auth/permission errors
            
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
        
        raise Exception(last_error or "Errore sconosciuto nella pubblicazione")

# ============== ADMIN PASSWORD MANAGEMENT ==============

# Global admin password for accessing advanced features
ADMIN_MASTER_PASSWORD = os.environ.get('ADMIN_MASTER_PASSWORD', 'seo_admin_2024')

class VerifyPasswordRequest(BaseModel):
    password: str
    client_id: Optional[str] = None

@api_router.post("/verify-admin-password")
async def verify_admin_password(request: VerifyPasswordRequest, current_user: dict = Depends(get_current_user)):
    """Verify admin master password for accessing advanced features"""
    if request.password == ADMIN_MASTER_PASSWORD:
        return {"valid": True, "access_level": "admin"}
    return {"valid": False}

@api_router.post("/verify-prompt-password")
async def verify_prompt_password(request: VerifyPasswordRequest, current_user: dict = Depends(get_current_user)):
    """Verify client-specific password for prompt editing"""
    if not request.client_id:
        raise HTTPException(status_code=400, detail="client_id richiesto")
    
    # Admin master password always works
    if request.password == ADMIN_MASTER_PASSWORD:
        return {"valid": True, "access_level": "admin"}
    
    # Check client-specific password
    client = await db.clients.find_one({"id": request.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    config = client.get("configuration", {})
    advanced = config.get("advanced_prompt", {})
    client_password = advanced.get("prompt_password", "")
    
    if client_password and request.password == client_password:
        return {"valid": True, "access_level": "client"}
    
    return {"valid": False}

# ============== ADVANCED PROMPT MANAGEMENT ==============

class UpdateAdvancedPromptRequest(BaseModel):
    password: str
    secondo_livello_prompt: Optional[str] = None
    keyword_injection_template: Optional[str] = None
    prompt_password: Optional[str] = None  # Only admin can set this

@api_router.put("/clients/{client_id}/advanced-prompt")
async def update_advanced_prompt(
    client_id: str, 
    request: UpdateAdvancedPromptRequest, 
    current_user: dict = Depends(get_current_user)
):
    """Update advanced prompt settings (password protected)"""
    # Verify password
    is_admin = request.password == ADMIN_MASTER_PASSWORD
    
    if not is_admin:
        client = await db.clients.find_one({"id": client_id}, {"_id": 0})
        if not client:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
        
        config = client.get("configuration", {})
        advanced = config.get("advanced_prompt", {})
        client_password = advanced.get("prompt_password", "")
        
        if not client_password or request.password != client_password:
            raise HTTPException(status_code=403, detail="Password non valida")
    
    # Build update
    update_data = {}
    if request.secondo_livello_prompt is not None:
        update_data["configuration.advanced_prompt.secondo_livello_prompt"] = request.secondo_livello_prompt
    if request.keyword_injection_template is not None:
        update_data["configuration.advanced_prompt.keyword_injection_template"] = request.keyword_injection_template
    
    # Only admin can change the prompt_password
    if is_admin and request.prompt_password is not None:
        update_data["configuration.advanced_prompt.prompt_password"] = request.prompt_password
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    
    result = await db.clients.update_one({"id": client_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    return {"message": "Prompt avanzato aggiornato", "is_admin": is_admin}

# ============== APIFY SERP SCRAPING ==============

class SerpScrapingRequest(BaseModel):
    keyword: str
    country: str = "it"  # Country code
    language: str = "it"  # Language code
    num_results: int = 4

@api_router.post("/clients/{client_id}/serp-analysis")
async def analyze_serp(
    client_id: str,
    request: SerpScrapingRequest,
    current_user: dict = Depends(get_current_user)
):
    """Scrape top SERP results for a keyword using Apify"""
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    config = client.get("configuration", {})
    apify_config = config.get("apify", {})
    api_key = apify_config.get("api_key")
    
    if not api_key:
        raise HTTPException(status_code=400, detail="API Key Apify non configurata")
    
    actor_id = apify_config.get("actor_id", "apify/google-search-scraper")
    
    try:
        # Call Apify Google Search Scraper
        async with httpx.AsyncClient() as http_client:
            # Start actor run
            run_response = await http_client.post(
                f"https://api.apify.com/v2/acts/{actor_id}/runs",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "queries": request.keyword,
                    "maxPagesPerQuery": 1,
                    "resultsPerPage": request.num_results,
                    "countryCode": request.country,
                    "languageCode": request.language,
                    "mobileResults": False
                },
                timeout=30.0
            )
            
            if run_response.status_code not in [200, 201]:
                raise Exception(f"Apify error: {run_response.status_code} - {run_response.text}")
            
            run_data = run_response.json()
            run_id = run_data["data"]["id"]
            
            # Wait for completion (poll)
            for _ in range(30):  # Max 30 attempts (60 seconds)
                await asyncio.sleep(2)
                
                status_response = await http_client.get(
                    f"https://api.apify.com/v2/actor-runs/{run_id}",
                    headers={"Authorization": f"Bearer {api_key}"},
                    timeout=10.0
                )
                
                status_data = status_response.json()
                run_status = status_data["data"]["status"]
                
                if run_status == "SUCCEEDED":
                    break
                elif run_status in ["FAILED", "ABORTED", "TIMED-OUT"]:
                    raise Exception(f"Apify run failed: {run_status}")
            
            # Get results
            dataset_id = status_data["data"]["defaultDatasetId"]
            results_response = await http_client.get(
                f"https://api.apify.com/v2/datasets/{dataset_id}/items",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=30.0
            )
            
            results = results_response.json()
            
            # Parse and format results
            serp_results = []
            for item in results:
                organic = item.get("organicResults", [])
                for result in organic[:request.num_results]:
                    serp_results.append({
                        "position": result.get("position"),
                        "title": result.get("title"),
                        "url": result.get("url"),
                        "description": result.get("description"),
                        "displayed_url": result.get("displayedUrl")
                    })
            
            # Store in database for reference
            serp_doc = {
                "id": str(uuid.uuid4()),
                "client_id": client_id,
                "keyword": request.keyword,
                "country": request.country,
                "results": serp_results,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.serp_analyses.insert_one(serp_doc)
            
            return {
                "keyword": request.keyword,
                "country": request.country,
                "results": serp_results,
                "analysis_id": serp_doc["id"]
            }
            
    except Exception as e:
        logger.error(f"SERP analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore analisi SERP: {str(e)}")

@api_router.get("/clients/{client_id}/serp-history")
async def get_serp_history(client_id: str, current_user: dict = Depends(get_current_user)):
    """Get SERP analysis history for a client"""
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    analyses = await db.serp_analyses.find(
        {"client_id": client_id}, 
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    return {"analyses": analyses}

# ============== XLSX UPLOAD & SEO ANALYSIS ==============

@api_router.post("/clients/{client_id}/upload-xlsx")
async def upload_xlsx(
    client_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload XLSX file and extract SEO data"""
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File deve essere .xlsx o .xls")
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Extract potential keyword columns
        columns = df.columns.tolist()
        
        # Detect common SEO-related columns
        keyword_columns = [c for c in columns if any(k in c.lower() for k in ['keyword', 'parola', 'chiave', 'query', 'servizio', 'citta', 'città', 'zona', 'tipo'])]
        
        # Extract unique values from each column
        extracted_data = {}
        for col in columns:
            unique_values = df[col].dropna().unique().tolist()
            # Convert to strings and limit
            extracted_data[col] = [str(v) for v in unique_values[:500]]
        
        # Auto-detect keyword combinations
        suggestions = {
            "servizi": [],
            "citta_e_zone": [],
            "tipi_o_qualificatori": []
        }
        
        for col in columns:
            col_lower = col.lower()
            values = extracted_data[col][:100]  # Limit to 100
            
            if any(k in col_lower for k in ['servizio', 'service', 'prodotto', 'product']):
                suggestions["servizi"].extend(values)
            elif any(k in col_lower for k in ['citta', 'città', 'city', 'zona', 'area', 'location', 'luogo']):
                suggestions["citta_e_zone"].extend(values)
            elif any(k in col_lower for k in ['tipo', 'type', 'qualificatore', 'categoria', 'category']):
                suggestions["tipi_o_qualificatori"].extend(values)
        
        # Remove duplicates
        for key in suggestions:
            suggestions[key] = list(set(suggestions[key]))
        
        # Store upload record
        upload_doc = {
            "id": str(uuid.uuid4()),
            "client_id": client_id,
            "filename": file.filename,
            "columns": columns,
            "row_count": len(df),
            "extracted_data": extracted_data,
            "suggestions": suggestions,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.xlsx_uploads.insert_one(upload_doc)
        
        return {
            "upload_id": upload_doc["id"],
            "filename": file.filename,
            "columns": columns,
            "row_count": len(df),
            "keyword_columns_detected": keyword_columns,
            "suggestions": suggestions,
            "preview": df.head(10).to_dict(orient="records")
        }
        
    except Exception as e:
        logger.error(f"XLSX upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore elaborazione file: {str(e)}")

@api_router.post("/clients/{client_id}/apply-xlsx-suggestions")
async def apply_xlsx_suggestions(
    client_id: str,
    upload_id: str = Form(...),
    apply_servizi: bool = Form(True),
    apply_citta: bool = Form(True),
    apply_tipi: bool = Form(True),
    merge_mode: str = Form("append"),  # append or replace
    current_user: dict = Depends(get_current_user)
):
    """Apply XLSX suggestions to client keyword combinations"""
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    # Get upload data
    upload = await db.xlsx_uploads.find_one({"id": upload_id, "client_id": client_id}, {"_id": 0})
    if not upload:
        raise HTTPException(status_code=404, detail="Upload non trovato")
    
    suggestions = upload.get("suggestions", {})
    
    # Get current client config
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    config = client.get("configuration", {})
    current_keywords = config.get("keyword_combinations", {})
    
    # Apply suggestions based on mode
    update_data = {}
    
    if apply_servizi and suggestions.get("servizi"):
        if merge_mode == "replace":
            new_servizi = suggestions["servizi"]
        else:
            new_servizi = list(set(current_keywords.get("servizi", []) + suggestions["servizi"]))
        update_data["configuration.keyword_combinations.servizi"] = new_servizi
    
    if apply_citta and suggestions.get("citta_e_zone"):
        if merge_mode == "replace":
            new_citta = suggestions["citta_e_zone"]
        else:
            new_citta = list(set(current_keywords.get("citta_e_zone", []) + suggestions["citta_e_zone"]))
        update_data["configuration.keyword_combinations.citta_e_zone"] = new_citta
    
    if apply_tipi and suggestions.get("tipi_o_qualificatori"):
        if merge_mode == "replace":
            new_tipi = suggestions["tipi_o_qualificatori"]
        else:
            new_tipi = list(set(current_keywords.get("tipi_o_qualificatori", []) + suggestions["tipi_o_qualificatori"]))
        update_data["configuration.keyword_combinations.tipi_o_qualificatori"] = new_tipi
    
    if not update_data:
        return {"message": "Nessuna modifica applicata"}
    
    await db.clients.update_one({"id": client_id}, {"$set": update_data})
    
    return {
        "message": "Suggerimenti applicati",
        "merge_mode": merge_mode,
        "applied": {
            "servizi": apply_servizi,
            "citta_e_zone": apply_citta,
            "tipi_o_qualificatori": apply_tipi
        }
    }

@api_router.get("/clients/{client_id}/xlsx-uploads")
async def get_xlsx_uploads(client_id: str, current_user: dict = Depends(get_current_user)):
    """Get XLSX upload history"""
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    uploads = await db.xlsx_uploads.find(
        {"client_id": client_id},
        {"_id": 0, "extracted_data": 0}  # Exclude large data
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return {"uploads": uploads}

# ============== SEO SESSION HISTORY ==============

@api_router.post("/clients/{client_id}/seo-sessions")
async def create_seo_session(
    client_id: str,
    session: SEOSessionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Save current SEO configuration as a session for history"""
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    # Get client data
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    config = client.get("configuration", {})
    
    # Get keyword combinations from session or current config
    keywords = session.keywords or config.get("keyword_combinations", {})
    
    # Get advanced prompt from session or current config
    advanced_prompt = session.advanced_prompt or config.get("advanced_prompt", {})
    
    # Get SERP analyses if provided
    serp_data = []
    if session.serp_analyses:
        serp_docs = await db.serp_analyses.find(
            {"id": {"$in": session.serp_analyses}, "client_id": client_id},
            {"_id": 0}
        ).to_list(100)
        serp_data = serp_docs
    
    # Generate session name if not provided
    session_name = session.session_name or f"Sessione {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}"
    
    # Create session document
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    session_doc = {
        "id": session_id,
        "client_id": client_id,
        "session_name": session_name,
        "keywords": keywords,
        "serp_analyses": serp_data,
        "advanced_prompt": advanced_prompt,
        "notes": session.notes,
        "articles_generated": 0,
        "created_at": now
    }
    
    await db.seo_sessions.insert_one(session_doc)
    
    return SEOSessionResponse(**session_doc)

@api_router.get("/clients/{client_id}/seo-sessions")
async def get_seo_sessions(
    client_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all SEO sessions history for a client"""
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    sessions = await db.seo_sessions.find(
        {"client_id": client_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    return {"sessions": sessions}

@api_router.get("/clients/{client_id}/seo-sessions/{session_id}")
async def get_seo_session(
    client_id: str,
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific SEO session"""
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    session = await db.seo_sessions.find_one(
        {"id": session_id, "client_id": client_id},
        {"_id": 0}
    )
    
    if not session:
        raise HTTPException(status_code=404, detail="Sessione non trovata")
    
    return SEOSessionResponse(**session)

@api_router.post("/clients/{client_id}/seo-sessions/{session_id}/restore")
async def restore_seo_session(
    client_id: str,
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Restore a saved SEO session to current configuration"""
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    session = await db.seo_sessions.find_one(
        {"id": session_id, "client_id": client_id},
        {"_id": 0}
    )
    
    if not session:
        raise HTTPException(status_code=404, detail="Sessione non trovata")
    
    # Restore keywords and advanced prompt to current config
    update_data = {}
    if session.get("keywords"):
        update_data["configuration.keyword_combinations"] = session["keywords"]
    if session.get("advanced_prompt"):
        update_data["configuration.advanced_prompt.secondo_livello_prompt"] = session["advanced_prompt"].get("secondo_livello_prompt", "")
        update_data["configuration.advanced_prompt.keyword_injection_template"] = session["advanced_prompt"].get("keyword_injection_template", "")
    
    if update_data:
        await db.clients.update_one({"id": client_id}, {"$set": update_data})
    
    return {"message": "Sessione ripristinata", "session_name": session["session_name"]}

@api_router.delete("/clients/{client_id}/seo-sessions/{session_id}")
async def delete_seo_session(
    client_id: str,
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a SEO session from history"""
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    result = await db.seo_sessions.delete_one({"id": session_id, "client_id": client_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sessione non trovata")
    
    return {"message": "Sessione eliminata"}

@api_router.post("/clients/{client_id}/save-and-generate")
async def save_and_generate(
    client_id: str,
    session_name: str = "",
    notes: str = "",
    generate_articles: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """Save current config as session and optionally generate articles"""
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    # Get client data
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    config = client.get("configuration", {})
    keywords = config.get("keyword_combinations", {})
    advanced_prompt = config.get("advanced_prompt", {})
    
    # Get recent SERP analyses (last 24 hours)
    from datetime import timedelta
    yesterday = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    serp_docs = await db.serp_analyses.find(
        {"client_id": client_id, "created_at": {"$gte": yesterday}},
        {"_id": 0}
    ).to_list(20)
    
    # Generate session name
    if not session_name:
        session_name = f"Sessione {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}"
    
    # Create session
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    session_doc = {
        "id": session_id,
        "client_id": client_id,
        "session_name": session_name,
        "keywords": keywords,
        "serp_analyses": serp_docs,
        "advanced_prompt": {
            "secondo_livello_prompt": advanced_prompt.get("secondo_livello_prompt", ""),
            "keyword_injection_template": advanced_prompt.get("keyword_injection_template", "")
        },
        "notes": notes,
        "articles_generated": 0,
        "created_at": now
    }
    
    await db.seo_sessions.insert_one(session_doc)
    
    # Generate articles if requested
    generated_count = 0
    if generate_articles:
        # Get all combinations
        servizi = keywords.get("servizi", [])
        citta = keywords.get("citta_e_zone", [])
        tipi = keywords.get("tipi_o_qualificatori", [])
        
        combinations = []
        for combo in itertools.product(servizi, citta, tipi):
            combinations.append({
                "servizio": combo[0],
                "citta": combo[1],
                "tipo": combo[2]
            })
        
        generated_count = len(combinations)
        
        # Update session with article count
        await db.seo_sessions.update_one(
            {"id": session_id},
            {"$set": {"articles_generated": generated_count, "combinations": combinations}}
        )
    
    return {
        "session_id": session_id,
        "session_name": session_name,
        "message": "Sessione salvata con successo",
        "keywords_saved": {
            "servizi": len(keywords.get("servizi", [])),
            "citta": len(keywords.get("citta_e_zone", [])),
            "tipi": len(keywords.get("tipi_o_qualificatori", []))
        },
        "serp_analyses_saved": len(serp_docs),
        "combinations_ready": generated_count
    }

# ============== SEED DATA ==============

@api_router.post("/seed")
async def seed_data():
    """Initialize demo data"""
    # Create admin user if not exists
    admin = await db.users.find_one({"email": "admin@seoengine.it"})
    if not admin:
        admin_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        await db.users.insert_one({
            "id": admin_id,
            "email": "admin@seoengine.it",
            "password": hash_password("admin123"),
            "name": "Admin SEO",
            "role": "admin",
            "client_id": None,
            "created_at": now
        })
    
    return {"message": "Seed completato"}

# ============== MAIN APP ==============

@api_router.get("/")
async def root():
    return {"message": "Programmatic SEO Engine API", "version": "1.0"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
