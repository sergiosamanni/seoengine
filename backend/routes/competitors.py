from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import pandas as pd
import io
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional
from database import db
from auth import get_current_user

logger = logging.getLogger("server")
router = APIRouter()

@router.post("/clients/{client_id}/upload-keyword-research")
async def upload_keyword_research(client_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
        
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="File deve essere .xlsx, .xls o .csv")
        
    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
            
        columns = df.columns.tolist()
        logger.info(f"Uploading keyword research for {client_id}. Columns: {columns}")
        
        # Mapping helper
        def get_col(candidates):
            for c in columns:
                if c.lower().strip() in [cand.lower().strip() for cand in candidates]:
                    return c
            return None

        # Detect columns based on image/common naming
        kw_col = get_col(['Keyword', 'Keywords', 'Parola Chiave'])
        pos_col = get_col(['Position', 'Posizione'])
        vol_col = get_col(['Search Vol', 'Search Volume', 'Volume', 'Ricerca'])
        diff_col = get_col(['Keyword D', 'Keyword Difficulty', 'Difficulty', 'KD', 'Difficoltà'])
        cpc_col = get_col(['CPC', 'Cost Per Click'])
        url_col = get_col(['URL', 'Reference URL', 'Link'])
        intent_col = get_col(['Keyword Intents', 'Intents', 'Intent', 'Intento'])
        
        if not kw_col:
            raise HTTPException(status_code=400, detail="Colonna 'Keyword' non trovata nel file.")
            
        rows = []
        for _, row in df.iterrows():
            if pd.isna(row[kw_col]): continue
            
            # Process intents (could be comma separated)
            intents = []
            if intent_col and not pd.isna(row[intent_col]):
                raw_intent = str(row[intent_col])
                intents = [i.strip() for i in raw_intent.replace(',', ' ').split() if i.strip()]
            
            rows.append({
                "keyword": str(row[kw_col]),
                "position": int(row[pos_col]) if pos_col and not pd.isna(row[pos_col]) else None,
                "search_volume": int(row[vol_col]) if vol_col and not pd.isna(row[vol_col]) else 0,
                "difficulty": int(row[diff_col]) if diff_col and not pd.isna(row[diff_col]) else 0,
                "cpc": float(row[cpc_col]) if cpc_col and not pd.isna(row[cpc_col]) else 0.0,
                "url": str(row[url_col]) if url_col and not pd.isna(row[url_col]) else None,
                "intents": intents
            })
            
        if not rows:
            raise HTTPException(status_code=400, detail="Nessun dato valido trovato nel file.")
            
        # Store in db
        upload_id = str(uuid.uuid4())
        doc = {
            "id": upload_id,
            "client_id": client_id,
            "filename": file.filename,
            "row_count": len(rows),
            "data": rows,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # We replace any existing keyword research for this client or append?
        # User said "ampliare la base dati", so maybe append or keep multiple uploads.
        # Let's keep one main repository per client for now to avoid duplicates.
        await db.client_keywords.update_one(
            {"client_id": client_id},
            {
                "$set": {
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "filename": file.filename
                },
                "$addToSet": {"data": {"$each": rows}}
            },
            upsert=True
        )
        
        return {"status": "success", "rows_added": len(rows), "total_rows": len(rows)}
        
    except Exception as e:
        logger.error(f"Error uploading keyword research: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/clients/{client_id}/keyword-research")
async def get_keyword_research(client_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
        
    doc = await db.client_keywords.find_one({"client_id": client_id}, {"_id": 0})
    if not doc:
        return {"data": []}
    return doc
