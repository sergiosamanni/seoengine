"""
Spintax Engine for SEO Programmatica
=====================================
Supports the following syntax:
  {option1|option2|option3}           -> picks one randomly
  {option1|{nested1|nested2}|option3} -> nested spintax

Usage:
  from spintax import resolve, count_variants, generate_all_variants

  resolved = resolve("{Discover|Find} the best service in {Milan|Rome}")
  # -> "Discover the best service in Milan" (random)

  count = count_variants("{A|B} {C|D}")
  # -> 4

  template = build_spintax_template(base_text, city_name)
  # injects spintax variants into the text
"""

import re
import random
from typing import List, Optional


# ── Core spin resolver ─────────────────────────────────────────────────────────

def resolve(template: str, seed: Optional[int] = None) -> str:
    """
    Resolve a spintax template into a single variant.
    Works recursively so nested spintax is fully resolved.
    
    Args:
        template: spintax string like "{Hello|Hi} {world|there}"
        seed: optional random seed for reproducibility
    """
    if seed is not None:
        rng = random.Random(seed)
    else:
        rng = random

    def _spin(text: str) -> str:
        # Match only { ... } groups that contain at least one '|'
        # This prevents breaking JSON objects like {"key": "value"}
        pattern = re.compile(r'\{([^{}]*\|[^{}]*)\}')
        while pattern.search(text):
            text = pattern.sub(lambda m: rng.choice(m.group(1).split('|')), text)
        return text

    return _spin(template)


def count_variants(template: str) -> int:
    """
    Count the total number of unique combinations in a spintax template.
    """
    pattern = re.compile(r'\{([^{}]*\|[^{}]*)\}')
    count = 1
    for match in pattern.finditer(template):
        options = match.group(1).split('|')
        count *= len(options)
    return count


def generate_n_variants(template: str, n: int, deduplicate: bool = True) -> List[str]:
    """
    Generate up to n unique resolved variants from a spintax template.
    """
    results = []
    seen = set()
    max_attempts = n * 10

    for i in range(max_attempts):
        variant = resolve(template)
        if not deduplicate or variant not in seen:
            seen.add(variant)
            results.append(variant)
            if len(results) >= n:
                break

    return results


# ── Spintax builder helpers ────────────────────────────────────────────────────

def spin(options: List[str]) -> str:
    """Create a spintax group from a list of options."""
    return '{' + '|'.join(options) + '}'


VERBI_AZIONE = ["Scopri", "Trova", "Ottieni", "Richiedi", "Accedi a", "Scegli", "Prova", "Affidate a noi"]
AGGETTIVI_QUALITA = ["migliore", "professionale", "affidabile", "certificato", "esperto", "leader"]
AGGETTIVI_SERVIZIO = ["top", "eccellente", "di qualità", "garantito", "innovativo"]
CALL_TO_ACTION = ["Richiedi un preventivo gratuito", "Contattaci ora", "Scopri di più", "Prenota una consulenza", "Richiedi informazioni"]
INTRO_BENEFICIO = ["Grazie a noi", "Con la nostra esperienza", "Affidandoti a noi", "Scegliendo il nostro servizio"]

def inject_location_spintax(text: str, primary_city: str, alt_cities: Optional[List[str]] = None) -> str:
    """
    Replace a city name in text with a spintax group of city variants.
    Useful when the template has the primary city and you want to make it
    location-variable across combinations.
    """
    if not primary_city:
        return text
    cities = [primary_city]
    if alt_cities:
        cities.extend(alt_cities)
    city_spin = spin(cities)
    return text.replace(primary_city, city_spin)


def build_spintax_headline(keyword: str, city: str = "") -> str:
    """
    Generate a spintax headline template for a given keyword and city.
    """
    verbi = spin(["Scopri", "Trova", "Ottieni", "Richiedi"])
    qualita = spin(["il migliore", "il più affidabile", "un servizio professionale di"])
    loc = f" a {city}" if city else ""
    return f"{verbi} {qualita} {keyword}{loc}"


def build_spintax_template(
    base_html: str,
    keyword: str,
    city: str = "",
    servizio: str = "",
    tipo: str = "",
) -> str:
    """
    Post-processes generated landing page HTML to inject spintax variations
    into key areas (H1, CTAs, intro paragraphs) while leaving the structural
    HTML intact.

    Strategy:
      - H1 gets a spintax headline
      - CTA button text gets spintax options
      - First <p> after H1 gets a spintax intro
      - Strategic keywords get inline spintax synonyms
    """
    import re as re_module

    # 1. Spin the H1 headline
    h1_pattern = re_module.compile(r'(<h1[^>]*>)(.*?)(</h1>)', re_module.IGNORECASE | re_module.DOTALL)
    def replace_h1(m):
        original = m.group(2).strip()
        verbo = spin(["Scopri", "Trova", "Scegli", "Richiedi", "Ottieni"])
        qualita = spin(["il migliore", "il più affidabile", "un servizio professionale di", "l'eccellenza nel"])
        loc = f" a {city}" if city else ""
        spinned = f"{verbo} {qualita} {keyword}{loc}"
        return f'{m.group(1)}{spinned}{m.group(3)}'
    base_html = h1_pattern.sub(replace_h1, base_html, count=1)

    # 2. Spin CTA button texts (wp-block-button__link)
    btn_pattern = re_module.compile(r'(<a[^>]*class="[^"]*wp-block-button__link[^"]*"[^>]*>)(.*?)(</a>)', re_module.IGNORECASE | re_module.DOTALL)
    def replace_btn(m):
        original = m.group(2).strip()
        cta_spin = spin(["Richiedi un preventivo gratuito", "Contattaci ora", "Prenota una consulenza", "Scopri di più"])
        return f'{m.group(1)}{cta_spin}{m.group(3)}'
    base_html = btn_pattern.sub(replace_btn, base_html, count=2)

    # 3. Spin the first <p> inside hero-block (subtitle)
    intro_pattern = re_module.compile(
        r'(class="hero-block"[^>]*>.*?<p[^>]*>)(.*?)(</p>)',
        re_module.IGNORECASE | re_module.DOTALL
    )
    def replace_intro(m):
        intro_verbo = spin(["Siamo specializzati in", "Offriamo", "Ci occupiamo di", "Ti proponiamo"])
        intro_qualita = spin(["soluzioni professionali", "servizi di alta qualità", "un'esperienza senza pari", "risultati concreti"])
        loc = f" a {city}" if city else ""
        spinned = f"{intro_verbo} {keyword}{loc} — {intro_qualita} per ogni tua esigenza."
        return f'{m.group(1)}{spinned}{m.group(3)}'
    base_html = intro_pattern.sub(replace_intro, base_html, count=1)

    return base_html
