import asyncio
import motor.motor_asyncio
import os
import sys

# Load .env
env_path = "/Users/sergiosamanni/.gemini/antigravity/scratch/seoengine/backend/.env"
with open(env_path) as f:
    for line in f:
        if "=" in line and not line.startswith("#"):
            key, val = line.strip().split("=", 1)
            os.environ[key] = val

# Add backend to path to import agents
sys.path.append("/Users/sergiosamanni/.gemini/antigravity/scratch/seoengine/backend")
from agents.landing_agent import LandingAgent

UPDATED_HTML = """
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --color-primary:    #F6C900;
    --color-secondary:  #383838;
    --color-accent:     #FF4400;
    --color-bg:         #FFFFFF;
    --color-bg-alt:     #F5F5F5;
    --color-text:       #222222;
    --color-text-light: #666666;
    --font-heading:     'Inter', sans-serif;
    --font-body:        'Inter', sans-serif;
    --radius:           8px;
    --shadow:           0 4px 24px rgba(0,0,0,0.08);
    --max-width:        1200px;
    --spacing-section:  80px;
  }
  body { font-family: var(--font-body); color: var(--color-text); background: var(--color-bg); line-height: 1.6; }
  h1, h2, h3, h4 { font-family: var(--font-heading); line-height: 1.2; font-weight: 700; }
  h1 { font-size: clamp(2.5rem, 6vw, 4rem); margin-bottom: 24px; }
  h2 { font-size: clamp(1.8rem, 4vw, 2.8rem); margin-bottom: 32px; }
  h3 { font-size: 1.5rem; margin-bottom: 16px; }
  p  { font-size: 1.1rem; color: var(--color-text-light); max-width: 65ch; margin-bottom: 24px; }
  .lp-container { max-width: var(--max-width); margin: 0 auto; padding: 0 24px; }
  .lp-section   { padding: var(--spacing-section) 0; }
  .lp-grid-2    { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
  .lp-grid-3    { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
  .lp-flex      { display: flex; align-items: center; gap: 16px; }
  .lp-center    { text-align: center; }
  .lp-center p  { margin: 0 auto 32px auto; }
  img { max-width: 100%; height: auto; display: block; border-radius: var(--radius); }
  .lp-btn { display: inline-block; padding: 16px 40px; border-radius: var(--radius); font-weight: 600; font-size: 1.1rem; text-decoration: none; cursor: pointer; transition: all 0.2s ease; border: none; }
  .lp-btn-primary   { background: var(--color-primary); color: var(--color-secondary); }
  .lp-btn-primary:hover   { filter: brightness(1.1); transform: translateY(-2px); }
  .lp-card { background: var(--color-bg-alt); border-radius: var(--radius); padding: 40px; box-shadow: var(--shadow); height: auto; overflow: visible; }
  .lp-hero { background: var(--color-bg-alt); padding: calc(var(--spacing-section) * 2) 0; }
  
  /* Fix contrasto testo hero */
  .lp-hero p {
    color: var(--color-text);
    font-size: 1.15rem;
    max-width: 55ch;
  }

  /* Fix spazio eccessivo tra sezioni */
  .lp-section + .lp-section {
    padding-top: 40px;
  }

  /* Hero image fallback */
  .lp-hero-img {
    background: linear-gradient(135deg, #f0f0f0, #d0d0d0);
    min-height: 320px;
    border-radius: var(--radius);
    overflow: hidden;
  }
  .lp-hero-img img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* CTA secondaria */
  .lp-cta-soft {
    display: block;
    margin-top: 16px;
    color: rgba(255,255,255,0.75);
    font-size: 0.9rem;
    text-decoration: underline;
    text-underline-offset: 3px;
    text-align: center;
  }

  /* Footer leggibilità */
  .lp-footer {
    padding: 60px 0;
    background: #333;
    font-size: 0.875rem;
    line-height: 1.7;
    color: rgba(255,255,255,0.8);
    margin-top: 40px;
  }
  .lp-footer a {
    color: rgba(255,255,255,0.65);
    text-decoration: none;
  }
  .lp-footer a:hover {
    color: #fff;
  }

  /* FAQ accordion JS-ready */
  .lp-faq-item { border-bottom: 1px solid #e0e0e0; }
  .lp-faq-question {
    width: 100%;
    background: none;
    border: none;
    text-align: left;
    padding: 20px 0;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--color-text);
  }
  .lp-faq-answer {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease, padding 0.3s ease;
    color: var(--color-text-light);
    font-size: 0.95rem;
  }
  .lp-faq-item.open .lp-faq-answer {
    max-height: 300px;
    padding-bottom: 20px;
  }
  .lp-faq-question::after {
    content: '+';
    font-size: 1.4rem;
    font-weight: 300;
    transition: transform 0.3s ease;
  }
  .lp-faq-item.open .lp-faq-question::after {
    transform: rotate(45deg);
  }

  @media (max-width: 768px) {
    .lp-grid-2, .lp-grid-3 { grid-template-columns: 1fr; }
    :root { --spacing-section: 60px; }
    h1 { font-size: 2.5rem; }
  }
</style>

<div class="premium-landing-v4">
  <!-- HERO SECTION -->
  <section class="lp-hero">
    <div class="lp-container lp-grid-2">
      <div>
        <h1>Noleggio carrello elevatore a lungo termine: l'investimento intelligente per la tua produttività</h1>
        <p>Rendi prevedibile il tuo costo operativo e liberati da manutenzione, riparazioni e obsolescenza. Scegli il piano flessibile su misura per il tuo cantiere o magazzino, con attrezzature premium e assistenza dedicata 24/7.</p>
        <a href="#cta-finale" class="lp-btn lp-btn-primary">Richiedi un preventivo personalizzato</a>
      </div>
      <div class="lp-hero-img">
        <img src="https://images.unsplash.com/photo-1566462602386-9b8e2c3b16c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt="Carrello elevatore professionale in opera in un magazzino moderno">
      </div>
    </div>
  </section>

  <!-- FEATURES SECTION -->
  <section class="lp-section">
    <div class="lp-container">
      <h2 class="lp-center">Perché le aziende leader scelgono il nostro noleggio a lungo termine</h2>
      <div class="lp-grid-3">
        <div class="lp-card">
          <h3>🚀 Attrezzature Top di Gamma</h3>
          <p>Collaboriamo esclusivamente con i migliori marchi (JLG, Genie, Haulotte, Platform Basket, Fronteq). Macchinari ad alte prestazioni, affidabili e all'avanguardia per garantirti il massimo dell'efficienza.</p>
        </div>
        <div class="lp-card">
          <h3>🔧 Assistenza Totale</h3>
          <p>Consulenza tecnica personalizzata e assistenza rapida ed efficace, anche direttamente in cantiere. La manutenzione è sempre nostra responsabilità. Servizio post-noleggio dedicato.</p>
        </div>
        <div class="lp-card">
          <h3>📈 Logistica Senza Pensieri</h3>
          <p>Preventivi rapidi, trasporto e pronta consegna. Sedi operative multiple (Forlì, Ravenna, Melfi) per una copertura nazionale e un supporto sempre vicino a te.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- CONTENT SECTION -->
  <section class="lp-section" style="background-color: var(--color-bg-alt);">
    <div class="lp-container lp-grid-2">
      <div>
        <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt="Operatore che utilizza una piattaforma aerea in un cantiere edile">
      </div>
      <div>
        <h2>Più di un semplice noleggio, una partnership strategica</h2>
        <p><strong>UN Rent S.r.l.</strong> è specializzata nel noleggio di attrezzature per il sollevamento e l'accesso in quota. Offriamo soluzioni integrate per cantieri e aziende: piattaforme aeree (semoventi, articolate, elettriche, diesel, ragno), sollevatori telescopici (fissi e rotativi) e, naturalmente, <strong>carrelli elevatori diesel per noleggi a lungo termine</strong>.</p>
        <p>Il nostro modello ti permette di convertire un costo capitale imprevedibile (acquisto, manutenzione, fermi macchina) in un canale operativo fisso e scalabile. Hai la flessibilità di adeguare la flotta alle esigenze del progetto senza immobilizzare capitale.</p>
        <a href="#cta-finale" class="lp-btn lp-btn-primary">Parla con un nostro esperto</a>
      </div>
    </div>
  </section>

  <!-- FAQ SECTION -->
  <section class="lp-section">
    <div class="lp-container">
      <h2 class="lp-center">Domande Frequenti sul Noleggio a Lungo Termine</h2>
      <div style="max-width: 800px; margin: 0 auto;">
        <div class="lp-faq-item">
          <button class="lp-faq-question">Quali sono i vantaggi del noleggio a lungo termine rispetto all'acquisto?</button>
          <div class="lp-faq-answer">
            <p>Il noleggio a lungo termine ti libera dall'investimento iniziale, dai costi di manutenzione straordinaria, dall'obsolescenza tecnologica e dai problemi di rivendita. Tutto è incluso in un canale mensile fisso, migliorando il tuo cash flow e la pianificazione di budget.</p>
          </div>
        </div>
        <div class="lp-faq-item">
          <button class="lp-faq-question">Posso modificare il contratto durante il periodo di noleggio?</button>
          <div class="lp-faq-answer">
            <p>Assolutamente sì. I nostri piani sono concepiti per essere flessibili. In base alle tue esigenze di cantiere, possiamo valutare insieme l'upgrade o il downgrade dell'attrezzatura, o aggiungere macchinari supplementari.</p>
          </div>
        </div>
        <div class="lp-faq-item">
          <button class="lp-faq-question">Chi si occupa della manutenzione e delle eventuali riparazioni?</button>
          <div class="lp-faq-answer">
            <p>Noi. La manutenzione ordinaria e straordinaria, le riparazioni e le sostituzioni di parti usurate sono completamente a nostro carico. In caso di guasto, interveniamo rapidamente per minimizzare i tuoi fermi produttivi.</p>
          </div>
        </div>
        <div class="lp-faq-item">
          <button class="lp-faq-question">Fornite anche la formazione per gli operatori?</button>
          <div class="lp-faq-answer">
            <p>Sì. Offriamo servizi di formazione continua per il nostro personale e per i nostri clienti. Possiamo formare i tuoi operatori all'uso sicuro ed efficiente delle attrezzature noleggiate, nel rispetto delle normative vigenti.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- FINAL CTA SECTION -->
  <section id="cta-finale" class="lp-section lp-center" style="background-color: var(--color-secondary); color: #fff;">
    <div class="lp-container">
      <h2 style="color: #fff;">Pronto a ottimizzare i costi e potenziare la tua operatività?</h2>
      <p style="color: rgba(255,255,255,0.9);">Invia la tua richiesta. Un nostro consulente ti contatterà entro 2 ore lavorative per definire insieme il piano di noleggio a lungo termine perfetto per le tue esigenze.</p>
      <a href="tel:+39000000000" class="lp-btn lp-btn-primary" style="background-color: var(--color-primary); color: var(--color-secondary); font-size: 1.2rem; padding: 20px 50px;">📞 Chiamaci Ora +39 000 000000</a>
      <a href="#contatti" class="lp-cta-soft">Oppure invia la tua richiesta online</a>
      <p style="margin-top: 24px; color: rgba(255,255,255,0.7);">Oppure <a href="mailto:info@azienda.it" style="color: var(--color-primary); text-decoration: underline;">scrivi a info@azienda.it</a></p>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="lp-footer">
    <div class="lp-container lp-grid-3">
      <div>
        <h3 style="color: #fff;">UN Rent S.r.l.</h3>
        <p style="color: rgba(255,255,255,0.6);">Noleggio piattaforme aeree, sollevatori telescopici e carrelli elevatori.</p>
      </div>
      <div>
        <h3 style="color: #fff;">Contatti</h3>
        <ul style="list-style: none;">
          <li>📍 Via dell'Artigianato, Forlì</li>
          <li>📞 +39 0543 000000</li>
          <li>📧 <a href="mailto:info@unrent.it" style="color: var(--color-primary);">info@unrent.it</a></li>
        </ul>
      </div>
      <div>
        <h3 style="color: #fff;">Legal</h3>
        <ul style="list-style: none;">
          <li><a href="#">Privacy Policy</a></li>
          <li><a href="#">Cookie Policy</a></li>
        </ul>
      </div>
    </div>
  </footer>
</div>

<script>
  document.querySelectorAll('.lp-faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.lp-faq-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
</script>
"""

async def main():
    client = motor.motor_asyncio.AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    
    # Get client config
    client_id = "2b0c0f49-c8c0-4d9f-bb42-8510f097b780"
    article_id = "c5c2f992-4754-4b83-973b-a018e1997571"
    wp_page_id = 9378
    
    client_doc = await db.clients.find_one({"id": client_id})
    if not client_doc:
        print("Client not found")
        return
        
    config = client_doc.get("configuration", {})
    wp_cfg = config.get("wordpress", {})
    llm_cfg = config.get("llm", {}) or config.get("openai", {})
    
    # Initialize Agent
    agent = LandingAgent(client_id, llm_cfg)
    agent.set_wp_config(
        wp_cfg["url_api"].replace("/posts", ""), 
        wp_cfg["utente"], 
        wp_cfg["password_applicazione"]
    )
    
    # Perform Update on WP
    print(f"Updating WP Page {wp_page_id}...")
    title = "Noleggia un carrello elevatore a lungo termine"
    slug = "noleggio-carrello-elevatore-lungo-termine"
    
    pub_res = await agent.wp_publish_page(title, slug, UPDATED_HTML, page_id=wp_page_id)
    
    if pub_res.get("success"):
        print(f"WP Update successful: {pub_res['url']}")
        
        # Update Article in DB
        await db.articles.update_one(
            {"id": article_id},
            {"$set": {
                "contenuto": UPDATED_HTML,
                "contenuto_html": UPDATED_HTML,
                "stato": "published",
                "published_at": "2026-03-15T15:53:56+01:00"
            }}
        )
        print("DB Record updated.")
    else:
        print(f"WP Update failed: {pub_res.get('error')}")

if __name__ == "__main__":
    asyncio.run(main())
