from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from tavily import TavilyClient
from dotenv import load_dotenv
import os
import json

from prompts.analysis_prompt import SYSTEM_PROMPT

load_dotenv()

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.post("/analyze")
async def analyze_document(file: UploadFile = File(...)):
    contents = await file.read()

    response = client.models.generate_content(
        model="gemma-4-31b-it",
        contents=[
            types.Part.from_bytes(data=contents, mime_type=file.content_type),
            SYSTEM_PROMPT
        ]
    )

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

    return parsed