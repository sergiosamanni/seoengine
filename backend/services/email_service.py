"""Centralized Email Notification Service for SEOEngine.
Sends async HTML email notifications to configured admin recipients.
Uses SMTP (compatible with Gmail, Outlook, any provider).
"""
import asyncio
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone
from database import db

logger = logging.getLogger("server")


async def _get_email_config() -> dict:
    """Retrieve notification email config from global_settings."""
    settings = await db.global_settings.find_one({"id": "global"}, {"_id": 0})
    if not settings:
        return {}
    return settings.get("notifications", {})


async def send_notification_email(
    subject: str,
    body_html: str,
    event_type: str = "general",
    bypass_toggle: bool = False
):
    """Send an email notification to all configured recipients.
    
    Args:
        subject: Email subject line
        body_html: HTML body content (will be wrapped in template)
        event_type: 'client_article' | 'autopilot' | 'general' | 'test'
        bypass_toggle: If True, skip the per-type toggle check (for test emails)
    """
    try:
        config = await _get_email_config()
        if not config:
            logger.debug("Email notifications not configured, skipping.")
            return False

        smtp_config = config.get("smtp", {})
        recipients = config.get("recipients", [])
        toggles = config.get("toggles", {})

        # Validate basics
        if not recipients:
            logger.debug("No email recipients configured, skipping.")
            return False
        if not smtp_config.get("host") or not smtp_config.get("username"):
            logger.debug("SMTP not configured, skipping email.")
            return False

        # Check toggle for this event type (unless bypassed for test)
        if not bypass_toggle:
            if event_type == "client_article" and not toggles.get("client_articles", True):
                logger.debug("Client article email toggle is OFF.")
                return False
            if event_type == "autopilot" and not toggles.get("autopilot", True):
                logger.debug("Autopilot email toggle is OFF.")
                return False

        # Build full HTML email with template
        full_html = _wrap_in_template(subject, body_html)

        # Send via SMTP
        import aiosmtplib

        from_email = smtp_config.get("from_email", smtp_config["username"])
        port = int(smtp_config.get("port", 587))
        use_tls = smtp_config.get("use_tls", True)

        for recipient in recipients:
            try:
                msg = MIMEMultipart("alternative")
                msg["From"] = f"SEOEngine <{from_email}>"
                msg["To"] = recipient
                msg["Subject"] = subject
                msg.attach(MIMEText(full_html, "html", "utf-8"))

                await aiosmtplib.send(
                    msg,
                    hostname=smtp_config["host"],
                    port=port,
                    username=smtp_config["username"],
                    password=smtp_config["password"],
                    start_tls=use_tls,
                    timeout=15
                )
                logger.info(f"✉ Email sent to {recipient}: {subject}")
            except Exception as e:
                logger.error(f"Failed to send email to {recipient}: {e}")

        return True

    except ImportError:
        logger.warning("aiosmtplib not installed. Email notifications disabled.")
        return False
    except Exception as e:
        logger.error(f"Email notification error: {e}")
        return False


def _wrap_in_template(subject: str, body_html: str) -> str:
    """Wrap body content in a professional HTML email template."""
    now = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")
    return f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#1a2332 0%,#2d4a3e 100%);padding:28px 32px;text-align:center;">
      <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:600;letter-spacing:-0.5px;">⚡ SEOEngine</h1>
      <p style="color:#8bc5a3;font-size:13px;margin:6px 0 0;font-weight:400;">Notifica Automatica</p>
    </td>
  </tr>
  <!-- Body -->
  <tr>
    <td style="padding:32px;">
      {body_html}
    </td>
  </tr>
  <!-- Footer -->
  <tr>
    <td style="background:#f8fafb;padding:18px 32px;border-top:1px solid #e8ecf0;">
      <p style="color:#8a94a6;font-size:11px;margin:0;text-align:center;">
        Inviata automaticamente da SEOEngine · {now}<br>
        <a href="#" style="color:#3d9970;text-decoration:none;">Gestisci Notifiche</a>
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>"""


# ============== PRE-BUILT NOTIFICATION TEMPLATES ==============

async def notify_client_article_generated(
    client_name: str, 
    article_title: str, 
    wordpress_link: str = "",
    keyword: str = ""
):
    """Notify admins that a client generated an article via their portal."""
    link_html = ""
    if wordpress_link:
        link_html = f"""
        <tr>
          <td style="padding:8px 0;">
            <a href="{wordpress_link}" style="display:inline-block;background:#3d9970;color:#fff;text-decoration:none;padding:10px 22px;border-radius:6px;font-size:14px;font-weight:500;">
              🔗 Visualizza Articolo
            </a>
          </td>
        </tr>"""

    body = f"""
    <h2 style="color:#1a2332;font-size:18px;margin:0 0 16px;">📝 Nuovo Articolo Generato</h2>
    <p style="color:#4a5568;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Il cliente <strong style="color:#1a2332;">{client_name}</strong> ha generato un nuovo articolo 
      tramite il portale clienti.
    </p>
    <table style="width:100%;background:#f8fafb;border-radius:8px;padding:16px;" cellpadding="8">
      <tr>
        <td style="color:#8a94a6;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Titolo</td>
        <td style="color:#1a2332;font-size:14px;font-weight:600;">{article_title}</td>
      </tr>
      <tr>
        <td style="color:#8a94a6;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Cliente</td>
        <td style="color:#1a2332;font-size:14px;">{client_name}</td>
      </tr>
      <tr>
        <td style="color:#8a94a6;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Keyword</td>
        <td style="color:#1a2332;font-size:14px;">{keyword or 'N/A'}</td>
      </tr>
      {link_html}
    </table>
    """
    await send_notification_email(
        subject=f"📝 {client_name} ha generato: {article_title}",
        body_html=body,
        event_type="client_article"
    )


async def notify_autopilot_scan_complete(
    client_name: str,
    tasks_count: int,
    task_summaries: list = None
):
    """Notify admins about autopilot scan results."""
    tasks_html = ""
    if task_summaries:
        rows = ""
        for t in task_summaries[:5]:  # Max 5 in email
            rows += f"""
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e8ecf0;color:#1a2332;font-size:13px;">{t.get('title', '')}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e8ecf0;color:#8a94a6;font-size:13px;">{t.get('type', '')}</td>
            </tr>"""
        tasks_html = f"""
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <thead>
            <tr style="background:#f8fafb;">
              <th style="padding:8px 12px;text-align:left;color:#8a94a6;font-size:11px;text-transform:uppercase;">Task</th>
              <th style="padding:8px 12px;text-align:left;color:#8a94a6;font-size:11px;text-transform:uppercase;">Tipo</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>"""

    body = f"""
    <h2 style="color:#1a2332;font-size:18px;margin:0 0 16px;">🤖 Autopilot: Scansione Completata</h2>
    <p style="color:#4a5568;font-size:14px;line-height:1.6;margin:0 0 20px;">
      L'autopilot SEO ha completato l'analisi per <strong style="color:#1a2332;">{client_name}</strong> 
      e ha trovato <strong style="color:#3d9970;">{tasks_count}</strong> suggerimenti in attesa di approvazione.
    </p>
    {tasks_html}
    <p style="color:#8a94a6;font-size:13px;margin:16px 0 0;">
      Accedi alla dashboard per approvare o rifiutare i task.
    </p>
    """
    await send_notification_email(
        subject=f"🤖 Autopilot: {tasks_count} task per {client_name}",
        body_html=body,
        event_type="autopilot"
    )
