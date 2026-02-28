"""Image upload routes."""
import uuid
import jwt
import os
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, HTTPException, Response, Query
from database import db
from storage import put_object, get_object, ALLOWED_EXTENSIONS, MAX_FILE_SIZE, APP_NAME

router = APIRouter(prefix="/uploads", tags=["uploads"])

JWT_SECRET = os.environ.get('JWT_SECRET', 'seo-engine-secret-key-2024')


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        return None


@router.post("")
async def upload_image(file: UploadFile = File(...), token: str = Query(None)):
    user = _decode_token(token) if token else None
    if not user:
        raise HTTPException(status_code=401, detail="Non autorizzato")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Formato non supportato. Usa: {', '.join(ALLOWED_EXTENSIONS)}")

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File troppo grande. Max 5MB.")

    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/uploads/{user['user_id']}/{file_id}.{ext}"
    content_type = file.content_type or f"image/{ext}"

    result = put_object(path, data, content_type)

    doc = {
        "id": file_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "user_id": user["user_id"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.files.insert_one(doc)

    return {"id": file_id, "path": result["path"], "filename": file.filename, "size": len(data)}


@router.get("/files/{file_id}")
async def get_file(file_id: str, auth: str = Query(None)):
    user = _decode_token(auth) if auth else None
    if not user:
        raise HTTPException(status_code=401, detail="Non autorizzato")

    record = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File non trovato")

    data, content_type = get_object(record["storage_path"])
    return Response(content=data, media_type=record.get("content_type", content_type))
