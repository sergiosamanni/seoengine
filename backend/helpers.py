"""Shared helper functions for article generation, publishing, scraping, and logging."""
import os
import re
import logging
import asyncio
import httpx
import json
from datetime import datetime, timezone
from typing import List
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET
from urllib.parse import urlparse
from database import db


logger = logging.getLogger("server")


# ============== HTML SANITIZATION & GUTENBERG ==============

def clean_llm_output(raw: str) -> str:
    """Clean LLM output: remove markdown fences, full HTML doc structure, extract body content."""
    content = raw.strip()
    # Remove markdown code fences (```html ... ``` or ```...```)
    content = re.sub(r'^```\w*\s*\n?', '', content)
    content = re.sub(r'\n?```\s*$', '', content)
    content = content.strip()
    # Remove META_DESCRIPTION comment if present
    content = re.sub(r'<!--\s*META_DESCRIPTION:.*?-->', '', content, flags=re.DOTALL).strip()
    # If it's a full HTML document, extract body/article content
    if '<html' in content.lower() or '<!doctype' in content.lower():
        soup = BeautifulSoup(content, 'html.parser')
        # Try to find article or body
        article = soup.find('article')
        if article:
            content = article.decode_contents()
        else:
            body = soup.find('body')
            if body:
                content = body.decode_contents()
        content = content.strip()
    # Remove standalone <title> tags
    content = re.sub(r'<title[^>]*>.*?</title>', '', content, flags=re.DOTALL | re.IGNORECASE).strip()
    return content


def convert_to_gutenberg_blocks(html_content: str, remove_h1: bool = True) -> str:
    """Convert plain HTML to WordPress Gutenberg block format.
    Each element becomes its own block. H1 is removed (WP title handles it)."""
    content = clean_llm_output(html_content)
    soup = BeautifulSoup(content, 'html.parser')
    blocks = []
    for el in soup.children:
        if isinstance(el, str):
            text = el.strip()
            if not text:
                continue
            # Skip raw text that looks like artifacts
            if text in ('html', 'HTML') or text.startswith('```'):
                continue
            blocks.append(f'<!-- wp:paragraph -->\n<p>{text}</p>\n<!-- /wp:paragraph -->')
            continue
        tag = el.name
        if not tag:
            continue
        # Skip structural tags that shouldn't be in content
        if tag in ('html', 'head', 'body', 'article', 'meta', 'title', 'link', 'script', 'style'):
            continue
        if tag == 'h1':
            if remove_h1:
                continue  # Skip H1 - WP title handles it
            blocks.append(f'<!-- wp:heading {{"level":1}} -->\n{str(el)}\n<!-- /wp:heading -->')
        elif tag in ('h2', 'h3', 'h4', 'h5', 'h6'):
            level = int(tag[1])
            blocks.append(f'<!-- wp:heading {{"level":{level}}} -->\n{str(el)}\n<!-- /wp:heading -->')
        elif tag == 'p':
            inner = el.decode_contents().strip()
            if inner:
                blocks.append(f'<!-- wp:paragraph -->\n<p>{inner}</p>\n<!-- /wp:paragraph -->')
        elif tag == 'ul':
            blocks.append(f'<!-- wp:list -->\n{str(el)}\n<!-- /wp:list -->')
        elif tag == 'ol':
            blocks.append(f'<!-- wp:list {{"ordered":true}} -->\n{str(el)}\n<!-- /wp:list -->')
        elif tag == 'blockquote':
            blocks.append(f'<!-- wp:quote -->\n{str(el)}\n<!-- /wp:quote -->')
        elif tag == 'figure':
            blocks.append(f'<!-- wp:image -->\n{str(el)}\n<!-- /wp:image -->')
        elif tag == 'table':
            blocks.append(f'<!-- wp:table -->\n<figure class="wp-block-table">{str(el)}</figure>\n<!-- /wp:table -->')
        elif tag == 'hr':
            blocks.append('<!-- wp:separator -->\n<hr class="wp-block-separator"/>\n<!-- /wp:separator -->')
        elif tag == 'div':
            # Recursively process div children
            for child in el.children:
                if isinstance(child, str):
                    t = child.strip()
                    if t:
                        blocks.append(f'<!-- wp:paragraph -->\n<p>{t}</p>\n<!-- /wp:paragraph -->')
                elif child.name:
                    sub_html = str(child)
                    sub_blocks = convert_to_gutenberg_blocks(sub_html, remove_h1=remove_h1)
                    if sub_blocks.strip():
                        blocks.append(sub_blocks)
        else:
            inner = str(el).strip()
            if inner:
                blocks.append(f'<!-- wp:html -->\n{inner}\n<!-- /wp:html -->')
    return '\n\n'.join(blocks)


def distribute_images_in_blocks(blocks_str: str, image_blocks: list) -> str:
    """Distribute image blocks evenly among paragraph blocks."""
    if not image_blocks:
        return blocks_str
    # Split into individual blocks
    parts = re.split(r'\n\n(?=<!-- wp:)', blocks_str)
    if len(parts) < 2:
        return blocks_str + '\n\n' + '\n\n'.join(image_blocks)
    # Find paragraph block indices (good places to insert images after)
    para_indices = [i for i, p in enumerate(parts) if '<!-- wp:paragraph -->' in p]
    if not para_indices or len(para_indices) < 2:
        # Fallback: just append
        return blocks_str + '\n\n' + '\n\n'.join(image_blocks)
    # Calculate evenly spaced insertion points (skip first paragraph)
    usable = para_indices[1:]  # Don't insert after the very first paragraph
    step = max(1, len(usable) // (len(image_blocks) + 1))
    insert_positions = []
    for idx, img in enumerate(image_blocks):
        pos_idx = min((idx + 1) * step, len(usable) - 1)
        insert_positions.append((usable[pos_idx], img))
    # Insert in reverse order to maintain indices
    for pos, img_block in reversed(insert_positions):
        parts.insert(pos + 1, img_block)
    return '\n\n'.join(parts)


# ============== ACTIVITY LOG ==============

async def log_activity(client_id: str, action: str, status: str, details: dict = None):
    from uuid import uuid4
    if status in ("success", "failed"):
        match_filter = {"client_id": client_id, "action": action, "status": "running"}
        if details and details.get("titolo"):
            match_filter["details.titolo"] = details["titolo"]
        updated = await db.activity_logs.find_one_and_update(
            match_filter,
            {"$set": {"status": status, "details": details or {}, "completed_at": datetime.now(timezone.utc).isoformat()}},
            sort=[("timestamp", -1)]
        )
        if updated:
            return
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
    "google": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        "models": ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"]
    },
    "groq": {
        "base_url": "https://api.groq.com/openai/v1/chat/completions",
        "models": ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it"]
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


async def generate_with_rotation(llm_config: dict, system_prompt: str, user_prompt: str) -> str:
    """Try primary model, then rotate through available free-tier providers if quota is reached."""
    # List of configs to try in order
    rotation_queue = []
    
    # 1. Primary from config
    primary_provider = llm_config.get("provider", "openai")
    primary_key = llm_config.get("api_key")
    primary_model = llm_config.get("modello", "gpt-4-turbo-preview")
    
    if primary_key:
        rotation_queue.append({
            "provider": primary_provider, 
            "api_key": primary_key, 
            "model": primary_model
        })
    
    # 2. Check for alternative keys in config or env
    keys = {
        "google": llm_config.get("google_api_key") or os.environ.get("GOOGLE_API_KEY"),
        "groq": llm_config.get("groq_api_key") or os.environ.get("GROQ_API_KEY"),
        "deepseek": llm_config.get("deepseek_api_key") or os.environ.get("DEEPSEEK_API_KEY"),
        "openai": llm_config.get("api_key") # Already has primary or alternative
    }
    
    # Models to try for each free provider
    free_models = {
        "google": "gemini-1.5-flash",
        "groq": "llama-3.3-70b-versatile",
        "deepseek": "deepseek-chat",
        "openai": "gpt-4o-mini"
    }

    # Add available free providers to rotation (if they aren't the primary one already)
    for prov in ["google", "groq", "deepseek", "openai"]:
        if keys.get(prov) and prov != primary_provider:
             rotation_queue.append({
                 "provider": prov,
                 "api_key": keys[prov],
                 "model": free_models[prov]
             })
             
    last_err = None
    for attempt in rotation_queue:
        try:
            logger.info(f"LLM Attempt: {attempt['provider']}/{attempt['model']}")
            return await generate_with_llm(
                attempt["provider"], 
                attempt["api_key"], 
                attempt["model"], 
                llm_config.get("temperatura", 0.7), 
                system_prompt, 
                user_prompt
            )
        except Exception as e:
            err_str = str(e).lower()
            if "429" in err_str or "quota" in err_str or "exhaust" in err_str or "limit" in err_str:
                logger.warning(f"LLM Provider {attempt['provider']} exhausted (Rate Limit). Trying next...")
                last_err = e
                continue
            else:
                logger.error(f"LLM Provider {attempt['provider']} failed: {e}")
                last_err = e
                # Fixed errors (like prompt blocked) should stop rotation usually, but for reliability we continue
                continue
                
    raise last_err or Exception("All LLM providers failed and no rotation was possible.")


async def generate_with_openai(api_key: str, model: str, temperature: float, system_prompt: str, user_prompt: str) -> str:
    return await generate_with_llm("openai", api_key, model, temperature, system_prompt, user_prompt)


async def generate_image_pollinations(prompt: str, user_id: str, model: str = "flux") -> dict:
    """Generate an image using Pollinations.ai (Free, no key required).
    
    Available models: flux (default), flux-realism, turbo, stable-diffusion
    """
    import uuid
    import random
    import urllib.parse
    from storage import put_object, APP_NAME
    
    # Pollinations can fail with 500 if the prompt is too long or has too many special chars
    safe_prompt = prompt[:500] if len(prompt) > 500 else prompt
    
    seed = random.randint(1, 1000000)
    encoded_prompt = urllib.parse.quote(safe_prompt)
    image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?model={model}&width=1024&height=1024&nologo=true&seed={seed}"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }
    
    async with httpx.AsyncClient(follow_redirects=True) as client:
        try:
            logger.info(f"Pollinations/{model} request (len={len(safe_prompt)}): {image_url[:100]}...")
            response = await client.get(image_url, headers=headers, timeout=90.0)
            
            if response.status_code != 200:
                logger.error(f"Pollinations/{model} error status: {response.status_code}")
                if response.status_code == 500:
                   await asyncio.sleep(1)
                   tiny_prompt = prompt[:200]
                   tiny_url = f"https://image.pollinations.ai/prompt/{urllib.parse.quote(tiny_prompt)}?model={model}&width=1024&height=1024&nologo=true&seed={seed+1}"
                   logger.info(f"Retrying Pollinations/{model} with tiny prompt...")
                   response = await client.get(tiny_url, headers=headers, timeout=60.0)
                   if response.status_code != 200:
                       raise Exception(f"Pollinations/{model} retry failed: {response.status_code}")
                else:
                    raise Exception(f"Pollinations/{model} error: {response.status_code}")
            
            file_id = str(uuid.uuid4())
            path = f"{APP_NAME}/uploads/{user_id}/{file_id}.jpg"
            content_type = "image/jpeg"
            result = put_object(path, response.content, content_type)
            file_doc = {
                "id": file_id,
                "storage_path": result["path"],
                "original_filename": f"pollinations-{model}-{file_id[:8]}.jpg",
                "content_type": content_type,
                "size": len(response.content),
                "user_id": user_id,
                "is_deleted": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.files.insert_one(file_doc)
            return {"id": file_id, "url": image_url, "storage_path": result["path"], "provider": f"pollinations_{model}"}
        except Exception as e:
            logger.error(f"Pollinations/{model} generation failed: {e}")
            raise


async def generate_image_horde(prompt: str, user_id: str) -> dict:
    """Generate an image using AI Horde (Free, anonymous)."""
    import uuid
    import asyncio
    from storage import put_object, APP_NAME
    
    # 512x512 is faster for anonymous
    payload = {
        "prompt": prompt,
        "params": {
            "n": 1,
            "steps": 20,
            "width": 512,
            "height": 512,
            "sampler_name": "k_euler"
        },
        "models": ["stable_diffusion"]
    }
    headers = {"apikey": "0000000000", "Client-Agent": "SEOEngine:v1:agent"}
    
    async with httpx.AsyncClient() as client:
        try:
            logger.info("Requesting image from AI Horde...")
            submit_res = await client.post("https://stablehorde.net/api/v2/generate/async", json=payload, headers=headers, timeout=30.0)
            if submit_res.status_code != 202:
                raise Exception(f"Horde submit failed: {submit_res.status_code}")
            
            job_id = submit_res.json()["id"]
            
            # Poll for results (max 60s)
            for _ in range(12):
                await asyncio.sleep(5)
                status_res = await client.get(f"https://stablehorde.net/api/v2/generate/status/{job_id}", headers=headers, timeout=10.0)
                if status_res.status_code == 200:
                    data = status_res.json()
                    if data.get("done"):
                        generations = data.get("generations", [])
                        if generations:
                            img_url = generations[0]["img"]
                            # Horde returns base64 or URL. Usually base64 for anonymous? No, it's a URL to webui or similar.
                            # If it's a URL, download it.
                            img_response = await client.get(img_url, timeout=30.0)
                            if img_response.status_code == 200:
                                file_id = str(uuid.uuid4())
                                path = f"{APP_NAME}/uploads/{user_id}/{file_id}.webp"
                                content_type = "image/webp"
                                result = put_object(path, img_response.content, content_type)
                                file_doc = {
                                    "id": file_id,
                                    "storage_path": result["path"],
                                    "original_filename": f"horde-{file_id[:8]}.webp",
                                    "content_type": content_type,
                                    "size": len(img_response.content),
                                    "user_id": user_id,
                                    "is_deleted": False,
                                    "created_at": datetime.now(timezone.utc).isoformat()
                                }
                                await db.files.insert_one(file_doc)
                                return {"id": file_id, "url": img_url, "storage_path": result["path"], "provider": "horde"}
            raise Exception("Horde polling timed out")
        except Exception as e:
            logger.error(f"Horde generation failed: {e}")
            raise

async def generate_image_together(prompt: str, user_id: str, api_key: str = None) -> dict:
    """Generate an image using Together.ai Flux-Schnell (free tier available)."""
    import uuid
    import base64
    from storage import put_object, APP_NAME
    
    key = api_key or os.environ.get("TOGETHER_API_KEY", "")
    if not key:
        raise Exception("No Together.ai API key available")
    
    payload = {
        "model": "black-forest-labs/FLUX.1-schnell-Free",
        "prompt": prompt[:1000],
        "width": 1024,
        "height": 1024,
        "steps": 4,
        "n": 1,
        "response_format": "b64_json"
    }
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    
    async with httpx.AsyncClient() as client:
        try:
            logger.info("Requesting image from Together.ai Flux-Schnell...")
            response = await client.post(
                "https://api.together.xyz/v1/images/generations",
                headers=headers, json=payload, timeout=90.0
            )
            if response.status_code != 200:
                raise Exception(f"Together.ai error: {response.status_code} - {response.text[:200]}")
            
            data = response.json()
            b64_data = data["data"][0].get("b64_json", "")
            if not b64_data:
                raise Exception("Together.ai returned no image data")
            
            img_bytes = base64.b64decode(b64_data)
            file_id = str(uuid.uuid4())
            path = f"{APP_NAME}/uploads/{user_id}/{file_id}.png"
            content_type = "image/png"
            result = put_object(path, img_bytes, content_type)
            file_doc = {
                "id": file_id,
                "storage_path": result["path"],
                "original_filename": f"together-flux-{file_id[:8]}.png",
                "content_type": content_type,
                "size": len(img_bytes),
                "user_id": user_id,
                "is_deleted": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.files.insert_one(file_doc)
            return {"id": file_id, "url": "", "storage_path": result["path"], "provider": "together_flux"}
        except Exception as e:
            logger.error(f"Together.ai generation failed: {e}")
            raise


async def generate_image_with_fallback(prompt: str, user_id: str, openai_key: str = None, together_key: str = None) -> dict:
    """Try multiple image generation providers in sequence with smart fallback.
    
    Chain: DALL-E (if key) → Pollinations/flux-realism → Pollinations/turbo → Together.ai/Flux-Schnell → AI Horde
    """
    errors = []
    
    # 1. Try DALL-E if OpenAI key is provided
    if openai_key and len(openai_key) > 20:
        try:
            logger.info("Attempting image generation with DALL-E 3...")
            result = await generate_image_dalle(openai_key, prompt, user_id)
            result["provider"] = "dalle"
            logger.info("✓ DALL-E 3 succeeded")
            return result
        except Exception as e:
            err_msg = f"DALL-E failed: {str(e)}"
            logger.warning(err_msg)
            errors.append(err_msg)

    # 2. Try Pollinations with flux-realism model (Free, high quality)
    try:
        logger.info("Attempting image generation with Pollinations (flux-realism)...")
        result = await generate_image_pollinations(prompt, user_id, model="flux-realism")
        logger.info("✓ Pollinations flux-realism succeeded")
        return result
    except Exception as e:
        err_msg = f"Pollinations flux-realism failed: {str(e)}"
        logger.warning(err_msg)
        errors.append(err_msg)

    # 3. Try Pollinations with turbo model (faster, free)
    try:
        logger.info("Attempting image generation with Pollinations (turbo)...")
        result = await generate_image_pollinations(prompt, user_id, model="turbo")
        logger.info("✓ Pollinations turbo succeeded")
        return result
    except Exception as e:
        err_msg = f"Pollinations turbo failed: {str(e)}"
        logger.warning(err_msg)
        errors.append(err_msg)

    # 4. Try Together.ai Flux-Schnell (free tier)
    env_together_key = together_key or os.environ.get("TOGETHER_API_KEY", "")
    if env_together_key:
        try:
            logger.info("Attempting image generation with Together.ai Flux-Schnell...")
            result = await generate_image_together(prompt, user_id, env_together_key)
            logger.info("✓ Together.ai Flux-Schnell succeeded")
            return result
        except Exception as e:
            err_msg = f"Together.ai Flux failed: {str(e)}"
            logger.warning(err_msg)
            errors.append(err_msg)

    # 5. Try AI Horde (completely anonymous free)
    try:
        logger.info("Attempting image generation with AI Horde...")
        result = await generate_image_horde(prompt[:300], user_id)
        logger.info("✓ AI Horde succeeded")
        return result
    except Exception as e:
        err_msg = f"AI Horde failed: {str(e)}"
        logger.warning(err_msg)
        errors.append(err_msg)
        
    combined_errors = "; ".join(errors)
    logger.error(f"Image generation total failure: {combined_errors}")
    raise Exception(f"Tutti i provider di generazione immagine hanno fallito: {combined_errors}")


async def generate_image_dalle(api_key: str, prompt: str, user_id: str) -> dict:
    """Generate an image using DALL-E 3, download it, and store it in our system."""
    import uuid
    from storage import put_object, APP_NAME
    
    url = "https://api.openai.com/v1/images/generations"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": "dall-e-3",
        "prompt": prompt,
        "n": 1,
        "size": "1024x1024",
        "quality": "standard",
        "response_format": "url"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"DALL-E request for prompt: {prompt[:50]}...")
            response = await client.post(url, headers=headers, json=payload, timeout=120.0)
            if response.status_code != 200:
                error_body = response.text
                logger.error(f"DALL-E API Error: {response.status_code} - {error_body}")
                raise Exception(f"DALL-E API error: {response.status_code}")
            
            data = response.json()
            image_url = data["data"][0]["url"]
            
            # Download image
            img_response = await client.get(image_url)
            if img_response.status_code != 200:
                raise Exception(f"Failed to download generated image: {img_response.status_code}")
                
            # Store image
            file_id = str(uuid.uuid4())
            path = f"{APP_NAME}/uploads/{user_id}/{file_id}.png"
            content_type = "image/png"
            
            result = put_object(path, img_response.content, content_type)
            
            # Create file record
            file_doc = {
                "id": file_id,
                "storage_path": result["path"],
                "original_filename": f"dalle-{file_id[:8]}.png",
                "content_type": content_type,
                "size": len(img_response.content),
                "user_id": user_id,
                "is_deleted": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.files.insert_one(file_doc)
            
            return {"id": file_id, "url": image_url, "storage_path": result["path"]}
            
        except Exception as e:
            logger.error(f"DALL-E generation failed: {e}")
            raise


# ============== SEO METADATA ==============

def generate_seo_metadata(title: str, content: str, kb: dict, combination: dict) -> dict:
    citta = kb.get("citta_principale", "")
    servizio = combination.get("servizio", "")
    tipo = combination.get("tipo", "")
    focus_kw = f"{servizio} {combination.get('citta', '')}".strip()

    # Build optimized meta description (150-160 chars) with keyword + semantic context + CTA
    parts = []
    if servizio:
        parts.append(servizio.capitalize())
    if combination.get("citta"):
        parts.append(f"a {combination['citta'].capitalize()}")
    if tipo and tipo not in ("informazionale", "commerciale", "transazionale"):
        parts.append(tipo)

    cta = kb.get("call_to_action_principale", "")
    punti_forza = kb.get("punti_di_forza", [])
    vantaggio = punti_forza[0] if punti_forza else ""

    if parts:
        intro = " ".join(parts)
        if vantaggio:
            meta_desc = f"{intro}: {vantaggio.rstrip('.')}."
        else:
            meta_desc = f"{intro}: scopri tutto quello che devi sapere."
        if cta and len(meta_desc) + len(cta) + 2 <= 160:
            meta_desc = f"{meta_desc} {cta.rstrip('.')}."
    else:
        meta_desc = f"{title}."
        if cta:
            meta_desc = f"{meta_desc} {cta.rstrip('.')}."

    # Trim to max 155 chars, ending with a complete word and sentence
    if len(meta_desc) > 155:
        # Cut at 152 to leave room for "."
        cut = meta_desc[:152]
        # Find last space to end on a complete word
        last_space = cut.rfind(' ')
        if last_space > 80:
            cut = cut[:last_space]
        # Find last sentence-ending punctuation
        for end_char in ['.', '!', '?', ':']:
            last_end = cut.rfind(end_char)
            if last_end > 80:
                meta_desc = cut[:last_end + 1]
                break
        else:
            meta_desc = cut.rstrip(',;- ') + "."
    elif len(meta_desc) < 120 and citta:
        meta_desc = meta_desc.rstrip('.') + f" a {citta}."

    tags = []
    if servizio:
        tags.append(servizio)
    if combination.get("citta"):
        tags.append(combination["citta"])
    if tipo and tipo not in ("informazionale", "commerciale", "transazionale"):
        tags.append(tipo)
    if citta:
        tags.append(citta)
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
        "focus_keyword": focus_kw
    }


# ============== WORDPRESS PUBLISH ==============

async def publish_to_wordpress(url: str, username: str, password: str, title: str, content: str,
                                wp_status: str = "draft", seo_metadata: dict = None,
                                categories: List[int] = None, tags: List[str] = None,
                                wp_type: str = "post", image_ids: List[str] = None, schedule_date: str = None) -> dict:
    from storage import get_object
    async with httpx.AsyncClient() as http_client:
        base_url = url.replace("/posts", "")
        endpoint = f"{base_url}/pages" if wp_type == "page" else url

        # Upload images to WordPress media library
        wp_media_ids = []
        if image_ids:
            for img_id in image_ids:
                try:
                    record = await db.files.find_one({"id": img_id, "is_deleted": False}, {"_id": 0})
                    if not record:
                        continue
                    img_data, _ = get_object(record["storage_path"])
                    ct = record.get("content_type", "image/jpeg")
                    fname = record.get("original_filename", f"{img_id}.jpg")
                    media_resp = await http_client.post(
                        f"{base_url}/media",
                        auth=(username, password),
                        headers={"Content-Type": ct, "Content-Disposition": f'attachment; filename="{fname}"'},
                        content=img_data, timeout=60.0
                    )
                    if media_resp.status_code in [200, 201]:
                        wp_media_ids.append(media_resp.json()["id"])
                except Exception as e:
                    logger.warning(f"Error uploading image {img_id} to WP: {e}")

        # Convert content to Gutenberg blocks FIRST
        gutenberg_content = convert_to_gutenberg_blocks(content)

        # Insert non-featured images distributed evenly among paragraphs
        if len(wp_media_ids) > 1:
            img_blocks = []
            for mid in wp_media_ids[1:]:
                try:
                    media_info = await http_client.get(f"{base_url}/media/{mid}", auth=(username, password), timeout=10.0)
                    src_url = media_info.json().get("source_url", "") if media_info.status_code == 200 else ""
                except Exception:
                    src_url = ""
                img_blocks.append(f'<!-- wp:image {{"id":{mid},"sizeSlug":"large"}} -->\n<figure class="wp-block-image size-large"><img src="{src_url}" alt="" class="wp-image-{mid}"/></figure>\n<!-- /wp:image -->')
            gutenberg_content = distribute_images_in_blocks(gutenberg_content, img_blocks)

        if schedule_date and wp_status == "publish":
            wp_status = "future"
            
        post_data = {"title": title, "content": gutenberg_content, "status": wp_status}
        if schedule_date:
            post_data["date"] = schedule_date
        if wp_media_ids:
            post_data["featured_media"] = wp_media_ids[0]
        if seo_metadata and seo_metadata.get("slug"):
            post_data["slug"] = seo_metadata["slug"]
        if categories and wp_type == "post":
            post_data["categories"] = categories

        tag_ids = []
        if tags and wp_type == "post":
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
                response = await http_client.post(endpoint, auth=(username, password), json=post_data, timeout=60.0)
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


async def update_wordpress_post(url: str, username: str, password: str, post_id: str, content: str, wp_type: str = "post") -> bool:
    async with httpx.AsyncClient() as http_client:
        base_url = url.replace("/posts", "")
        endpoint = f"{base_url}/pages/{post_id}" if wp_type == "page" else f"{url}/{post_id}"
        
        gutenberg_content = convert_to_gutenberg_blocks(content)
        post_data = {"content": gutenberg_content}
        
        for attempt in range(3):
            try:
                response = await http_client.post(endpoint, auth=(username, password), json=post_data, timeout=30.0)
                if response.status_code in [200, 201]:
                    return True
            except Exception as e:
                pass
            await asyncio.sleep(1)
        return False

# ============== SYSTEM PROMPT BUILDER ==============

def build_system_prompt(kb: dict, tone: dict, seo: dict, client_name: str,
                        advanced_prompt: dict = None, strategy: dict = None,
                        content_type: str = "articolo_blog", brief_override: dict = None,
                        existing_articles: list = None) -> str:
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
Output SOLO come frammento HTML. NON generare un documento completo.

REGOLE CRITICHE:
- NON usare mai tag ```html, ```, <html>, <head>, <body>, <article>, <title>, <meta>, <!DOCTYPE>
- NON avvolgere il contenuto in markdown code blocks
- Inizia DIRETTAMENTE con il primo tag HTML del contenuto (es. <h1>)
- Usa UN SOLO tag <h1> in tutto il documento per il titolo principale
- Ogni paragrafo deve essere un <p> separato (non raggruppare piu paragrafi)

"""

    if content_type == "landing_page":
        prompt += """Struttura LANDING PAGE:
1. <h1> - Headline principale con keyword + beneficio (UNICO)
2. <p> - Sottotitolo che amplifica la proposta di valore
3. <h2> - Problema del target
4. <h2> - La soluzione (il servizio/prodotto)
5. <h2> - Vantaggi chiave (con <ul><li> elenco puntato)
6. <h2> - Come funziona (3-4 step)
7. <h2> - Testimonianze o social proof
8. <p> - CTA finale forte e diretta
NOTA: Una landing page ha una sola CTA ripetuta 2-3 volte. Niente navigazione, niente distrazioni.
"""
    elif content_type == "pillar_page":
        prompt += f"""Struttura PILLAR PAGE (contenuto esaustivo 2500-4000 parole):
1. <h1> - Guida completa sulla keyword principale (UNICO)
2. <p> - Introduzione ampia al tema (200-300 parole)
3. <h2> - Indice dei contenuti (con link interni se possibile)
4. <h2> - Almeno 6-8 sezioni principali che coprono ogni aspetto
5. <h3> - Sottosezioni dettagliate per ogni H2
6. <ul><li> - Elenchi per confronti, vantaggi, checklist
7. <strong> - Evidenzia concetti chiave
{'8. <h2>Domande Frequenti</h2> con 5-8 FAQ dettagliate' if include_faq else ''}
9. <p> - Conclusione con riepilogo e CTA
NOTA: La pillar page deve essere la risorsa piu completa disponibile sul tema. Copri ogni angolo.
"""
    else:
        prompt += f"""Struttura obbligatoria ARTICOLO BLOG:
1. <h1> - Titolo principale SEO ottimizzato (UNICO in tutto il testo)
2. <p> - Paragrafo introduttivo (150-200 parole)
3. <h2> - Sezioni principali (almeno 3-4)
4. <h3> - Sottosezioni per approfondimenti
5. <ul><li> - Elenchi puntati per vantaggi
6. <strong> - Evidenzia 2-3 concetti chiave per paragrafo
7. <p> finale con call to action
{'8. <h2>Domande Frequenti</h2> con 3-5 FAQ' if include_faq else ''}
"""

    prompt += f"""

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

    if existing_articles and len(existing_articles) > 0:
        links_list = "\n".join([f'- {l.get("titolo")}: {l.get("url")}' for l in existing_articles[:10]])
        prompt += f"""
=== LINK INTERNI DA INTEGRARE (STRATEGICO) ===
Inserisci TASSATIVAMENTE ALMENO 3 link interni ai seguenti articoli correlati per evitare contenuti orfani e spingere il link juice.

REGOLE SEO PER I LINK INTERNI:
1. Inserisci ALMENO 3 link verso altrettanti articoli diversi della lista.
2. Utilizza anchor text SEMANTICI e NATURALI (non usare 'clicca qui' o 'leggi questo articolo').
3. Distribuisci i link all'interno del contenuto dove hanno senso logico.

{links_list}
REGOLE LINK:
- Usa il titolo dell'articolo o varianti naturali come anchor text.
- NON forzare il link se non e pertinente.
- I link devono essere in formato <a href="URL">TESTO</a>.
"""

    if advanced_prompt:
        secondo_livello = advanced_prompt.get("secondo_livello_prompt", "")
        keyword_template = advanced_prompt.get("keyword_injection_template", "")
        if secondo_livello:
            prompt += f"\n=== ISTRUZIONI AVANZATE ===\n{secondo_livello}\n"
        if keyword_template:
            prompt += f"\n=== TEMPLATE KEYWORD ===\n{keyword_template}\n"
    if existing_articles:
        prompt += "\n=== CONTESTO LINK INTERNI (OBBLIGATORIO) ===\n"
        prompt += "INSERISCI ALMENO 3 LINK INTERNI scegliendo tra questi candidati. DEVI integrare i link naturalmente nei paragrafi (NON alla fine):\n"
        for ea in existing_articles[:15]:
            prompt += f"- ARTICOLO CORRELATO: {ea['titolo']} | URL: {ea['url']}\n"
        prompt += """
REGOLE MANDATORIE PER I LINK INTERNI:
1. DEVI inserire almeno 3 collegamenti ipertestuali <a> nel corpo dell'articolo.
2. Usa anchor text rilevanti e brevi (3-5 parole). Esempio: "servizio di <a href='URL'>noleggio auto a lungo termine</a>".
3. Distribuisci i link in paragrafi diversi, non tutti nello stesso punto.
4. NON usare mai anchor text generici ("clicca qui", "leggi tutto", ecc).
"""

    prompt += "\n=== ISTRUZIONE FINALE ===\nGenera un contenuto SEO completo, dettagliato e ottimizzato. Applica il modello di copywriting indicato, integra le leve psicologiche e rispetta tutte le regole SEO on-page.\n\n=== META DESCRIPTION ===\nAlla FINE del contenuto HTML, aggiungi un blocco separato:\n<!-- META_DESCRIPTION: [scrivi qui una meta description di 150-160 caratteri, con keyword principale, intento di ricerca e call to action implicita] -->"
    return prompt


# ============== INTERNAL LINKING ==============

async def generate_internal_link_update(provider: str, api_key: str, model: str, temperature: float, 
                                        old_article_title: str, old_article_content: str, 
                                        new_article_title: str, new_article_keyword: str, new_article_url: str) -> str:
    """Generates a new paragraph to be appended to an old article, which links to the new article."""
    system_prompt = """Sei un esperto SEO responsabile dell'internal linking.
Il tuo compito è scrivere UN SINGOLO PARAGRAFO (2-3 frasi) da aggiungere alla fine di un articolo esistente per linkare un nuovo articolo appena pubblicato sullo stesso sito.
REGOLE RIGIDE:
1. Usa "anchor text" SEO-friendly: breve (max 5 parole), rilevante e pertinente (exact-match o varianti naturali di keyword per il nuovo articolo).
2. Evita anchor text generici ("clicca qui", "leggi di più", "questo articolo").
3. Assicurati che il paragrafo si leghi in modo naturale ("Se ti è piaciuto questo argomento...", "Per approfondire...", ecc.).
4. Restituisci SOLO IL PARAGRAFO in formato HTML (<p>...</p>), senza nient'altro, e includi il link: <a href="URL">anchor text</a>.
"""
    user_prompt = f"""
ARTICOLO ESISTENTE:
Titolo: {old_article_title}

NUOVO ARTICOLO DA LINKARE:
Titolo: {new_article_title}
Keyword Rilevante: {new_article_keyword}
URL: {new_article_url}

Scrivi il paragrafo HTML con il link interno.
"""
    try:
        content = await generate_with_llm(provider, api_key, model, temperature, system_prompt, user_prompt)
        return clean_llm_output(content)
    except Exception as e:
        import logging
        logging.getLogger("server").error(f"Error generating internal link update: {e}")
        return ""


# ============== SERP SCRAPING ==============

async def scrape_google_serp(keyword: str, country: str = "it", num_results: int = 5) -> list:
    """Search SERP using DuckDuckGo Lite with retry + scrape page content."""
    import asyncio
    from urllib.parse import unquote, urlparse, parse_qs

    results = []
    search_urls = []

    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    ]

    for attempt in range(3):
        try:
            ua = user_agents[attempt % len(user_agents)]
            async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers={"User-Agent": ua}) as http:
                resp = await http.get("https://lite.duckduckgo.com/lite/",
                    params={"q": keyword, "kl": f"{country}-{country}"})
                if resp.status_code != 200:
                    logger.warning(f"DDG attempt {attempt+1}: status {resp.status_code}")
                    await asyncio.sleep(2 * (attempt + 1))
                    continue
                soup = BeautifulSoup(resp.text, "lxml")
                snippets = [td.get_text(strip=True) for td in soup.find_all("td", class_="result-snippet")]
                idx = 0
                for a in soup.find_all("a", class_="result-link"):
                    if len(search_urls) >= num_results:
                        break
                    raw_href = a.get("href", "")
                    title = a.get_text(strip=True)
                    if "uddg=" in raw_href:
                        parsed = parse_qs(urlparse(raw_href).query)
                        real_url = unquote(parsed.get("uddg", [raw_href])[0])
                    else:
                        real_url = raw_href
                    if real_url and title and "duckduckgo.com" not in real_url:
                        desc = snippets[idx] if idx < len(snippets) else ""
                        search_urls.append({"url": real_url, "title": title, "description": desc})
                        idx += 1
                if search_urls:
                    break
                logger.warning(f"DDG attempt {attempt+1}: 0 results, retrying...")
                await asyncio.sleep(2 * (attempt + 1))
        except Exception as e:
            logger.warning(f"DDG attempt {attempt+1} error: {e}")
            await asyncio.sleep(2 * (attempt + 1))

    if not search_urls:
        logger.warning(f"SERP search failed after 3 attempts for '{keyword}'")
        return []

    async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers={
        "User-Agent": user_agents[0]
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


async def scrape_website_info(urls: list, max_pages: int = 6) -> dict:
    from urllib.parse import urljoin, urlparse
    info = {
        "descrizione_attivita": "", "servizi": [], "citta_principale": "", "regione": "",
        "punti_di_forza": [], "contatti": {}, "pagine_analizzate": [],
        "raw_titles": [], "raw_headings": [], "raw_meta_descriptions": [],
        "full_text_corpus": ""
    }
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    
    pages_to_visit = []
    base_urls = []
    for u in urls:
        if not u or not isinstance(u, str): continue
        u = u.strip()
        if not u: continue
        base_url = u.rstrip("/")
        if not base_url.startswith("http"):
            base_url = "https://" + base_url
        pages_to_visit.append(base_url)
        base_urls.append(base_url)
        
    if not pages_to_visit:
        return info

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
                
                # Accumulate text for LLM analysis (limited to ~2000 chars per page to avoid context bloat)
                info["full_text_corpus"] += f"\n--- PAGE: {page_url} ---\n{body_text[:2000]}\n"

                if page_url in base_urls and not info["descrizione_attivita"]:
                    info["descrizione_attivita"] = body_text[:800]
                page_domain = urlparse(page_url).netloc
                for a in soup.find_all("a", href=True):
                    full_url = urljoin(page_url, a["href"])
                    parsed = urlparse(full_url)
                    if parsed.netloc == page_domain and full_url not in visited:
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
                
                # Basic heuristic fallback
                italian_cities = ["roma", "milano", "napoli", "torino", "palermo", "genova", "bologna",
                                  "firenze", "bari", "catania", "venezia", "verona", "salerno", "avellino",
                                  "caserta", "benevento", "padova", "trieste", "brescia", "parma", "modena"]
                body_lower = body_text.lower()
                if not info["citta_principale"]:
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


async def extract_structured_kb_with_llm(scraped_data: dict, provider: str, api_key: str, model: str) -> dict:
    """Uses LLM to transform raw scraped website data into a structured Knowledge Base."""
    prompt = f"""Estrai informazioni aziendali strutturate dai seguenti dati scansionati dal sito web.
Dati grezzi (Titoli, Meta, Heading e porzioni di testo):
TITOLI: {", ".join(scraped_data.get("raw_titles", []))}
META DESC: {", ".join(scraped_data.get("raw_meta_descriptions", []))}
HEADING: {", ".join(scraped_data.get("raw_headings", []))}
TESTO CORPO:
{scraped_data.get("full_text_corpus", "")[:6000]}

Restituisci un oggetto JSON con i seguenti campi (usa stringhe vuote o liste vuote se non trovi info):
- descrizione_attivita: (riassunto di 2-3 paragrafi di cosa fa l'azienda)
- storia_brand: (brevi info sulla storia o missione se presenti)
- citta_principale: (città dove opera o sede principale)
- regione: (regione italiana)
- descrizione_geografica: (breve descrizione del territorio in cui opera)
- punti_di_interesse_locali: (lista di luoghi famosi vicini menzionati)
- punti_di_forza: (lista di 3-5 vantaggi competitivi)
- pubblico_target_primario: (chi è il cliente tipo)
- pubblico_target_secondario: (altre categorie di clienti)
- call_to_action_principale: (es. "Richiedi un preventivo gratuito", "Contattaci su WhatsApp")
- servizi: (lista dei 5-8 servizi principali offerti)

IMPORTANTE: Rispondi SOLO con il JSON puro, senza markdown block.
"""
    try:
        response = await generate_with_llm(provider, api_key, model, 0.3, prompt, "Knowledge Base Extraction")
        # Clean potential markdown
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r'^```(json)?\s*', '', cleaned)
            cleaned = re.sub(r'\s*```$', '', cleaned)
        data = json.loads(cleaned)
        return data
    except Exception as e:
        logger.error(f"Error in extract_structured_kb_with_llm: {e}")
        return {}


# ============== SITEMAP PARSING ==============

def _guess_title_from_url(url: str) -> str:
    """Guess a readable title from a URL slug."""
    parsed = urlparse(url)
    path = parsed.path.strip("/")
    if not path:
        return "Home"
    slug = path.split("/")[-1]
    title = slug.replace("-", " ").replace("_", " ").capitalize()
    return title


async def get_sitemap_links(sitemap_url: str) -> List[dict]:
    """Fetch and parse a sitemap (or index) to extract URLs."""
    links = []
    visited_sitemaps = set()

    async def _parse(url: str):
        if url in visited_sitemaps or not url.startswith("http"):
            return
        visited_sitemaps.add(url)
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    return
                # Use a more lenient approach for namespaces
                content = resp.content
                import xml.etree.ElementTree as ET
                try:
                    root = ET.fromstring(content)
                except ET.ParseError:
                    # Try cleaning up common issues
                    content_str = resp.text.strip()
                    root = ET.fromstring(content_str)

                tag_lower = root.tag.lower()
                
                # Helper to find tags regardless of namespace
                def find_all_tags(element, target):
                    results = []
                    for child in element.iter():
                        if child.tag.split('}')[-1] == target:
                            results.append(child)
                    return results

                # If sitemap index
                if "sitemapindex" in tag_lower:
                    locs = find_all_tags(root, "loc")
                    for loc in locs:
                        if loc.text:
                            await _parse(loc.text.strip())
                # If regular sitemap
                elif "urlset" in tag_lower:
                    locs = find_all_tags(root, "loc")
                    for loc in locs:
                        if loc.text:
                            url_val = loc.text.strip()
                            links.append({
                                "url": url_val,
                                "titolo": _guess_title_from_url(url_val),
                                "keyword": ""
                            })
        except Exception as e:
            logger.warning(f"Error parsing sitemap {url}: {e}")

    await _parse(sitemap_url)
    return links


async def get_internal_linking_context(client_id: str, config: dict, target_keyword: str) -> List[dict]:
    """Get the best 10-15 internal link candidates from DB and Sitemap."""
    # 1. Fetch from DB
    cursor = db.articles.aggregate([
        {"$match": {"client_id": client_id, "stato": "published", "wordpress_link": {"$regex": "^https?://"}}},
        {"$sort": {"published_at": -1}},
        {"$group": {
            "_id": "$wordpress_link",
            "titolo": {"$first": "$titolo"},
            "keyword": {"$first": "$seo_metadata.focus_keyword"}
        }},
        {"$limit": 30}
    ])
    db_links = []
    async for a in cursor:
        db_links.append({"titolo": a["titolo"], "url": a["_id"], "keyword": a.get("keyword", "")})
    
    # 2. Fetch from Sitemap
    # Check multiple possible config locations
    sitemap_url = config.get("seo", {}).get("sitemap_url") or config.get("knowledge_base", {}).get("sitemap_url")
    sitemap_links = []
    if sitemap_url:
        sitemap_links = await get_sitemap_links(sitemap_url)
    
    # 3. Combine and Deduplicate
    all_links = {l["url"]: l for l in db_links}
    for l in sitemap_links:
        if l["url"] not in all_links:
            # Avoid linking to sitemap itself or very common non-content pages
            ignored = [".xml", "wp-content", "/tag/", "/category/", "/author/"]
            if not any(x in l["url"] for x in ignored):
                all_links[l["url"]] = l
            
    # 4. Filter by relevance to the target keyword and exclude current
    target_lower = target_keyword.lower()
    kws = [k.lower() for k in target_keyword.split() if len(k) > 2]
    scored = []
    for url, l in all_links.items():
        # Exclude current URL if possible (by simple string match on url/title)
        if target_lower in l["titolo"].lower() or l["titolo"].lower() in target_lower:
            continue
            
        score = 0
        text = (l["titolo"] + " " + url).lower()
        for kw in kws:
            if kw in text:
                score += 1
        # Boost DB articles slightly as they are usually more relevant
        if any(db_l["url"] == url for db_l in db_links):
            score += 0.5
        scored.append((score, l))
    
    scored.sort(key=lambda x: x[0], reverse=True)
    results = [x[1] for x in scored[:15]]
    logger.info(f"Internal linking context for '{target_keyword}': {len(results)} links found (DB: {len(db_links)}, Sitemap: {len(sitemap_links)}).")
    return results
