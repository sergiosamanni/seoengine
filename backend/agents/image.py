import json
import logging
from typing import Dict, Any, Optional
from .base import BaseAgent

logger = logging.getLogger("agents")

class ImageAgent(BaseAgent):
    """
    Agent responsible for crafting high-quality image generation prompts
    based on article metadata and brand identity.
    """
    
    def __init__(self, client_id: str, llm_config: Dict[str, Any]):
        super().__init__(name="ImageArtist", client_id=client_id, llm_config=llm_config)
    
    async def craft_prompt(self, article_title: str, branding: Dict[str, Any]) -> str:
        """
        Generates a detailed prompt for an image generation model.
        """
        await self.log("running", {"article": article_title})
        
        style = branding.get("style", "cinematic")
        primary_color = branding.get("palette_primary", "#4F46E5")
        secondary_color = branding.get("palette_secondary", "#10B981")
        custom_instr = branding.get("custom_instructions", "")
        
        system_prompt = f"""Sei un Art Director e Prompt Engineer esperto. 
Il tuo compito è trasformare il titolo di un articolo in un prompt dettagliato per un modello di generazione immagini (come Midjourney o DALL-E).

REGOLE DI STILE:
- Stile Visivo: {style}
- Palette Colori: Colori dominanti {primary_color} e {secondary_color}.
- Atmosfera: Professionale, accattivante, adatta a un blog aziendale.
- Istruzioni Custom: {custom_instr}

REQUISITI DEL PROMPT:
- Rispondi SOLO con il prompt in INGLESE.
- Descrivi il soggetto, la luce, la composizione e lo stile.
- Non includere testo nell'immagine.
- Assicurati che il design sia moderno e "premium".
"""

        user_prompt = f"TITOLO ARTICOLO: {article_title}"
        
        try:
            image_prompt = await self.chat(system_prompt, user_prompt)
            await self.log("success", {"crafted_prompt": image_prompt[:100]})
            return image_prompt.strip()
        except Exception as e:
            await self.log("failed", {"error": str(e)})
            # Fallback prompt
            return f"A professional {style} image representing {article_title}, with {primary_color} accents."
