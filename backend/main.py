from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from tavily import TavilyClient
from dotenv import load_dotenv
import os
import json
import re
import magic
import pdfplumber
import io


from prompts.analysis_prompt import SYSTEM_PROMPT

load_dotenv()

import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

logger.info("Starting up...")
logger.info(f"GOOGLE_API_KEY set: {bool(os.getenv('GOOGLE_API_KEY'))}")
logger.info(f"TAVILY_API_KEY set: {bool(os.getenv('TAVILY_API_KEY'))}")

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.harpoon.online",
        "https://harpoon.online",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}

async def find_alternatives(loan_details: dict) -> dict:
    loan_type = loan_details.get("loan_type", "personal loan")
    apr = loan_details.get("apr", "")

    if apr:
        query = f"best {loan_type} rates 2026 alternatives to {apr} APR"
    else:
        query = f"best {loan_type} rates 2026 low APR consumer options"

    try:
        response = tavily.search(
            query=query,
            search_depth="basic",
            max_results=5,
            include_answer=True
        )

        sources = []
        for result in response.get("results", []):
            sources.append({
                "title": result.get("title"),
                "url": result.get("url"),
                "summary": result.get("content", "")[:300]
            })

        return {
            "search_summary": response.get("answer", ""),
            "sources": sources
        }

    except Exception as e:
        print(f"Tavily search failed: {e}")
        return {}

# ── PII stripping (mirrors the JS version) ──────────────────────────────────
PII_PATTERNS = [
    (r'\b\d{3}[-\s]\d{2}[-\s]\d{4}\b|\b\d{9}\b(?=\s|$)',          'REDACTED_SSN'),
    (r'\b[A-Z0-9]{4}[-\s]?[A-Z0-9]{3}[-\s]?[A-Z0-9]{4}\b',        'REDACTED_MEDICARE_ID'),
    (r'\b(?:Member|Policy|Group|Subscriber)\s*(?:#|No\.?|ID)?\s*[A-Z0-9]{6,15}\b', 'REDACTED_INSURANCE_ID'),
    (r'\b(?:Account|Patient|Acct|Claim|Invoice|Bill)\s*(?:#|No\.?|Number|Num)?\s*[A-Z0-9\-]{4,20}\b', 'REDACTED_ACCOUNT_NUM'),
    (r'\b(?:DOB|Date of Birth|Birthdate|Birth Date)[:\s]*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b', 'REDACTED_DOB'),
    (r'\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\b',                       'REDACTED_DATE'),
    (r'(?:\+1[\s\-]?)?\(?\d{3}\)?[\s\-\.]\d{3}[\s\-\.]\d{4}\b',    'REDACTED_PHONE'),
    (r'\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b',      'REDACTED_EMAIL'),
    (r'\b\d{1,5}\s+(?:[A-Z][a-z]+\s){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Place|Pl|Parkway|Pkwy)\.?\b', 'REDACTED_ADDRESS'),
    (r'\b\d{5}(?:-\d{4})?\b',                                        'REDACTED_ZIP'),
    (r'\b(?:Patient|Name|Guarantor|Insured|Subscriber)[:\s]+[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+\b', 'REDACTED_NAME'),
    (r'\b(?:\d{4}[-\s]?){3}\d{4}\b',                                 'REDACTED_CREDIT_CARD'),
    (r'\b(?:NPI)[:\s#]*\d{10}\b',                                    'REDACTED_NPI'),
]

def strip_pii(text: str) -> tuple[str, int]:
    count = 0
    for pattern, replacement in PII_PATTERNS:
        matches = re.findall(pattern, text, flags=re.IGNORECASE)
        count += len(matches)
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text, count

LARGE_LLM = "gemini-3-flash-preview"
CONTEST_LLM = "gemma-4-31b-it"

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
PDF_TYPES = {"application/pdf"}
CONTEST_MODE = True  # fixed typo

def detect_content_type(contents: bytes, declared: str) -> str:
    """Use file magic bytes to detect true content type, ignoring what the browser claims."""
    try:
        detected = magic.from_buffer(contents, mime=True)
        return detected
    except Exception:
        return declared  # fall back to declared if magic fails

@app.post("/analyze")
async def analyze_document(
    file: UploadFile = File(...),
    cleanedText: Optional[str] = Form(None)
):
    logger.info(f"Received file: name={file.filename}, declared_type={file.content_type}, size={file.size}")
    logger.info(f"cleanedText present: {cleanedText is not None}, length: {len(cleanedText) if cleanedText else 0}")
    
    contents = await file.read()
    logger.info(f"Read {len(contents)} bytes from upload")
    
    # Detect true content type from file bytes, not browser header
    true_content_type = detect_content_type(contents, file.content_type)
    logger.info(f"Declared content_type: {file.content_type} | Detected: {true_content_type}")

    try:
        if true_content_type in IMAGE_TYPES:
            ocr_response = client.models.generate_content(
                model=LARGE_LLM,
                contents=[
                    types.Part.from_bytes(data=contents, mime_type=true_content_type),
                    "Extract all text from this document exactly as it appears. Return only the raw text, no commentary."
                ]
            )
            extracted_text = ocr_response.text.strip()
            logger.info(f"OCR output length: {len(extracted_text)} chars")
            clean_text, redaction_count = strip_pii(extracted_text)

            llm = CONTEST_LLM if CONTEST_MODE else LARGE_LLM
            response = client.models.generate_content(
                model=llm,
                contents=[clean_text, SYSTEM_PROMPT]
            )

        elif cleanedText:
            logger.info(f"cleanedText length: {len(cleanedText)} chars")
            redaction_count = None
            response = client.models.generate_content(
                model=LARGE_LLM,
                contents=[cleanedText, SYSTEM_PROMPT]
            )

        elif true_content_type in PDF_TYPES:
            # No cleanedText (likely iOS/Safari) — extract text server-side
            
            try:
                with pdfplumber.open(io.BytesIO(contents)) as pdf:
                    raw_text = "\n".join(
                        page.extract_text() or "" for page in pdf.pages
                    )
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Could not extract text from PDF: {str(e)}")
            
            if not raw_text.strip():
                raise HTTPException(status_code=400, detail="PDF appears to be scanned or image-based. Please upload a photo of the document instead.")
            
            clean_text, redaction_count = strip_pii(raw_text)
            response = client.models.generate_content(
                model=LARGE_LLM,
                contents=[clean_text, SYSTEM_PROMPT]
            )

        else:
            # Plain text fallback
            try:
                raw_text = contents.decode("utf-8", errors="strict")
            except UnicodeDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file type: {true_content_type}. Please upload a PDF, image, or text file."
                )
            clean_text, redaction_count = strip_pii(raw_text)
            response = client.models.generate_content(
                model=LARGE_LLM,
                contents=[clean_text, SYSTEM_PROMPT]
            )

        # ... rest of your parsing logic unchanged
        result_text = response.text.strip()
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
        result_text = result_text.strip()

        parsed = json.loads(result_text)

        if parsed.get("category") == "CREDIT_AGREEMENT" and parsed.get("loan_details"):
            parsed["alternatives"] = await find_alternatives(parsed["loan_details"])
        else:
            parsed["alternatives"] = None

        parsed["redaction_count"] = redaction_count
        return parsed

    except Exception as e:
        import traceback
        print(f"Full error: {traceback.format_exc()}")
        raise

    finally:
        del contents