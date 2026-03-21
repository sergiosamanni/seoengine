"""Object storage integration for image uploads."""
import os
import uuid
import requests
import logging

logger = logging.getLogger(__name__)

STORAGE_URL = os.environ.get("STORAGE_API_URL", "")
STORAGE_AUTH_KEY = os.environ.get("STORAGE_API_KEY")
APP_NAME = "seo-engine"
storage_key = None

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg",
    "png": "image/png", "webp": "image/webp"
}


LOCAL_UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "local_uploads")

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    if not STORAGE_AUTH_KEY or not STORAGE_URL:
        logger.info("No storage credentials found, fallback to local system")
        os.makedirs(LOCAL_UPLOADS_DIR, exist_ok=True)
        return "local"
        
    resp = requests.post(f"{STORAGE_URL}/init", json={"api_key": STORAGE_AUTH_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    logger.info("Remote object storage initialized")
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if key == "local":
        # Create directory structure
        full_path = os.path.join(LOCAL_UPLOADS_DIR, path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        # Save file to disk
        with open(full_path, "wb") as f:
            f.write(data)
            
        # Also store content_type
        meta_path = full_path + ".meta"
        with open(meta_path, "w") as f:
            f.write(content_type)
            
        return {"path": path, "size": len(data)}
        
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple:
    key = init_storage()
    if key == "local":
        full_path = os.path.join(LOCAL_UPLOADS_DIR, path)
        if not os.path.exists(full_path):
            raise Exception("File not found locally")
            
        with open(full_path, "rb") as f:
            data = f.read()
            
        meta_path = full_path + ".meta"
        content_type = "application/octet-stream"
        if os.path.exists(meta_path):
            with open(meta_path, "r") as f:
                content_type = f.read().strip()
                
        return data, content_type
        
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
