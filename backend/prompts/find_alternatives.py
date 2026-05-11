from tavily import TavilyClient
import os

tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

async def find_alternatives(loan_details: dict) -> list:
    if not loan_details:
        return []
    
    loan_type = loan_details.get("loan_type", "personal loan")
    apr = loan_details.get("apr", "")
    lender = loan_details.get("lender", "")
    
    # Strip the % sign for numeric comparison if needed later
    query = f"best {loan_type} rates 2026 alternatives low APR consumer options"
    if apr:
        query = f"best {loan_type} rates 2026 alternatives to {apr} APR"
    
    try:
        response = tavily.search(
            query=query,
            search_depth="basic",
            max_results=5,
            include_answer=True
        )
        
        alternatives = []
        for result in response.get("results", []):
            alternatives.append({
                "title": result.get("title"),
                "url": result.get("url"),
                "summary": result.get("content", "")[:300]  # trim to avoid bloat
            })
        
        return {
            "search_summary": response.get("answer", ""),
            "sources": alternatives
        }
    
    except Exception as e:
        print(f"Tavily search failed: {e}")
        return []