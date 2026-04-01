from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth import get_current_user
import logging
import os
from helpers import generate_with_llm

logger = logging.getLogger("server")
router = APIRouter(prefix="/chat", tags=["AI Strategist"])

@router.post("/{client_id}")
async def chat_with_strategist(client_id: str, request: dict, current_user: dict = Depends(get_current_user)):
    """Chat with the AI Strategist about a specific client."""
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    user_message = request.get("message")
    if not user_message:
        raise HTTPException(status_code=400, detail="Messaggio mancante")
    
    # 1. Get Client Info & Config
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    config = client.get("configuration") or {}
    llm_config = config.get("llm") or config.get("openai") or {}
    api_key = llm_config.get("api_key") or os.environ.get("OPENAI_API_KEY")
    
    if not api_key:
        raise HTTPException(status_code=400, detail="Configurazione API Key mancante per questo cliente.")
        
    provider = llm_config.get("provider", "openai")
    model = llm_config.get("modello", "gpt-4o")
    
    # 2. Get Context (GSC data, KB, etc.)
    # We could fetch recent GSC data here to provide better context
    gsc_status = config.get("gsc", {}).get("connected", False)
    context_info = f"Cliente: {client['nome']}. Sito: {client['sito_web']}. Settore: {client['settore']}."
    if gsc_status:
        context_info += " Google Search Console è collegato."

    system_prompt = f"""Sei lo Strategist AI di SEOEngine. Il tuo compito è aiutare l'utente a definire strategie SEO, 
    trovare opportunità di contenuto e analizzare le performance del cliente. 
    Sii professionale, analitico e orientato ai risultati.
    
    Contesto attuale: {context_info}
    """
    
    try:
        response = await generate_with_llm(provider, api_key, model, 0.7, system_prompt, user_message)
        # Log the interaction if needed
        return {"status": "success", "message": response}
    except Exception as e:
        logger.error(f"Chat AI error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore nella generazione della risposta: {str(e)}")
