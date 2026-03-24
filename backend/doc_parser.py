import io
import pandas as pd
from pydocx import PyDocX
from pypdf import PdfReader
from docx import Document
import logging

logger = logging.getLogger("server")

async def parse_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF using pypdf."""
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        logger.error(f"PDF parsing error: {e}")
        raise Exception(f"Errore durante la lettura del PDF: {str(e)}")

async def parse_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX using python-docx."""
    try:
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join([para.text for para in doc.paragraphs]).strip()
    except Exception as e:
        logger.error(f"DOCX parsing error: {e}")
        raise Exception(f"Errore durante la lettura del DOCX: {str(e)}")

async def parse_csv_xlsx(file_bytes: bytes, filename: str) -> str:
    """Extract text from CSV or XLSX using pandas."""
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(file_bytes))
        else:
            df = pd.read_excel(io.BytesIO(file_bytes))
        
        # Convert to a readable string format (e.g., CSV-like or just rows)
        return df.to_csv(index=False)
    except Exception as e:
        logger.error(f"CSV/XLSX parsing error: {e}")
        raise Exception(f"Errore durante la lettura del file Excel/CSV: {str(e)}")

async def extract_content_from_file(file_bytes: bytes, filename: str) -> str:
    """Routes to the correct parser based on extension."""
    ext = filename.split('.')[-1].lower()
    if ext == 'pdf':
        return await parse_pdf(file_bytes)
    elif ext in ['docx', 'doc']:
        return await parse_docx(file_bytes)
    elif ext in ['xlsx', 'xls', 'csv']:
        return await parse_csv_xlsx(file_bytes, filename)
    else:
        raise Exception(f"Formato file .{ext} non supportato")
