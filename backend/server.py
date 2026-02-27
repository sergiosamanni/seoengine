from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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

class ClientConfiguration(BaseModel):
    wordpress: Optional[WordPressConfig] = None
    openai: Optional[OpenAIConfig] = None
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

@api_router.post("/articles/generate")
async def generate_articles(request: ArticleGenerate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and current_user.get("client_id") != request.client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    client = await db.clients.find_one({"id": request.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    config = client.get("configuration", {})
    openai_config = config.get("openai", {})
    
    if not openai_config.get("api_key"):
        raise HTTPException(status_code=400, detail="API Key OpenAI non configurata")
    
    # Build system prompt from configuration
    kb = config.get("knowledge_base", {})
    tone = config.get("tono_e_stile", {})
    seo = config.get("seo", {})
    
    system_prompt = build_system_prompt(kb, tone, seo, client["nome"])
    
    generated_articles = []
    
    for combo in request.combinations:
        titolo = f"{combo['servizio']} {combo['tipo']} a {combo['citta']}"
        titolo_formatted = titolo.title()
        
        try:
            content = await generate_with_openai(
                api_key=openai_config["api_key"],
                model=openai_config.get("modello", "gpt-4-turbo-preview"),
                temperature=openai_config.get("temperatura", 0.7),
                system_prompt=system_prompt,
                user_prompt=titolo_formatted
            )
            
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
                "combination": combo
            }
            
            await db.articles.insert_one(article_doc)
            generated_articles.append(ArticleResponse(**article_doc))
            
        except Exception as e:
            logger.error(f"Error generating article: {e}")
            article_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            
            article_doc = {
                "id": article_id,
                "client_id": request.client_id,
                "titolo": titolo_formatted,
                "contenuto": f"Errore nella generazione: {str(e)}",
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
    published = []
    failed = []
    
    for article_id in request.article_ids:
        article = await db.articles.find_one({"id": article_id}, {"_id": 0})
        if not article:
            failed.append({"id": article_id, "error": "Articolo non trovato"})
            continue
        
        if current_user["role"] != "admin" and current_user.get("client_id") != article["client_id"]:
            failed.append({"id": article_id, "error": "Accesso non autorizzato"})
            continue
        
        client = await db.clients.find_one({"id": article["client_id"]}, {"_id": 0})
        if not client:
            failed.append({"id": article_id, "error": "Cliente non trovato"})
            continue
        
        config = client.get("configuration", {})
        wp_config = config.get("wordpress", {})
        
        if not wp_config.get("url_api") or not wp_config.get("utente") or not wp_config.get("password_applicazione"):
            failed.append({"id": article_id, "error": "WordPress non configurato"})
            continue
        
        try:
            post_id = await publish_to_wordpress(
                url=wp_config["url_api"],
                username=wp_config["utente"],
                password=wp_config["password_applicazione"],
                title=article["titolo"],
                content=article["contenuto"],
                status=wp_config.get("stato_pubblicazione", "draft")
            )
            
            now = datetime.now(timezone.utc).isoformat()
            await db.articles.update_one(
                {"id": article_id},
                {"$set": {
                    "stato": "published",
                    "wordpress_post_id": str(post_id),
                    "published_at": now
                }}
            )
            
            published.append({"id": article_id, "wordpress_post_id": post_id})
            
        except Exception as e:
            logger.error(f"Error publishing article {article_id}: {e}")
            failed.append({"id": article_id, "error": str(e)})
    
    return {"published": published, "failed": failed}

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

def build_system_prompt(kb: dict, tone: dict, seo: dict, client_name: str) -> str:
    lingua = seo.get("lingua", "italiano")
    lunghezza = seo.get("lunghezza_minima_parole", 1500)
    registro = tone.get("registro", "professionale_accessibile")
    persona = tone.get("persona_narrativa", "seconda_singolare")
    tono_desc = tone.get("descrizione_tono_libera", "")
    aggettivi = ", ".join(tone.get("aggettivi_brand", []))
    parole_vietate = ", ".join(tone.get("parole_vietate", []))
    frasi_vietate = ", ".join(tone.get("frasi_vietate", []))
    
    descrizione = kb.get("descrizione_attivita", "")
    storia = kb.get("storia_brand", "")
    citta = kb.get("citta_principale", "")
    regione = kb.get("regione", "")
    territorio = kb.get("descrizione_geografica", "")
    punti_interesse = ", ".join(kb.get("punti_di_interesse_locali", []))
    punti_forza = "\n- ".join(kb.get("punti_di_forza", []))
    target_primario = kb.get("pubblico_target_primario", "")
    cta = kb.get("call_to_action_principale", "")
    
    prompt = f"""Rispondi ESCLUSIVAMENTE in {lingua}. Sei un esperto copywriter SEO specializzato in contenuti ottimizzati per i motori di ricerca.

AZIENDA: {client_name}
{descrizione}
{storia}

TERRITORIO:
- Città principale: {citta}, {regione}
- Descrizione: {territorio}
- Punti di interesse: {punti_interesse}

PUNTI DI FORZA:
- {punti_forza}

TARGET: {target_primario}

STILE E TONO:
- Registro: {registro}
- Persona narrativa: {persona}
- {tono_desc}
- Aggettivi del brand da far emergere: {aggettivi}

REGOLE DI SCRITTURA:
1. Output SOLO in formato HTML, inizia direttamente con il tag <h1>
2. Lunghezza minima: {lunghezza} parole
3. Usa intestazioni (h2, h3), elenchi puntati e paragrafi di 200-250 parole
4. Parole da EVITARE: {parole_vietate}
5. Frasi da EVITARE: {frasi_vietate}
6. NON iniziare MAI con frasi generiche tipo "Certo", "Posso aiutarti"
7. Usa frasi brevi e voce attiva
8. Metti in grassetto 2-3 parole significative per paragrafo
9. Includi parole chiave naturalmente nel testo
10. Spiega i termini tecnici in modo semplice

CALL TO ACTION: {cta}

Genera un articolo SEO completo e dettagliato basato sul titolo fornito."""

    return prompt

async def generate_with_openai(api_key: str, model: str, temperature: float, system_prompt: str, user_prompt: str) -> str:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
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

async def publish_to_wordpress(url: str, username: str, password: str, title: str, content: str, status: str = "draft") -> int:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            auth=(username, password),
            json={
                "title": title,
                "content": content,
                "status": status
            },
            timeout=30.0
        )
        
        if response.status_code not in [200, 201]:
            raise Exception(f"WordPress API error: {response.status_code} - {response.text}")
        
        data = response.json()
        return data.get("id")

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
