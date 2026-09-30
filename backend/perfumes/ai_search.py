"""
Turns a free-text query like:
    "woody perfume for office under $100"
into structured filters:
    {"category": "men", "max_price": 100, "keywords": ["woody"]}

Uses Groq (https://console.groq.com) — free API tier, OpenAI-compatible
chat completion endpoint, fast inference. No credit card required to
get an API key.

If GROQ_API_KEY isn't set, or the request fails for any reason, this
falls back to a simple keyword-only parse so the search endpoint never
breaks the frontend — it just becomes a plain keyword search instead
of an AI-understood one.
"""

import json
import re

import requests
from django.conf import settings

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = """You convert a shopper's perfume search into JSON filters.

Return ONLY a JSON object, no explanation, no markdown fences, with these keys:
- "category": one of "men", "women", "oud", "gift", or null if not specified/unclear
- "max_price": a number (USD) if the user gives a budget, else null
- "min_price": a number (USD) if the user gives a lower bound, else null
- "keywords": a list of short lowercase words describing the scent, mood, notes
  or occasion (e.g. ["woody", "office", "long-lasting"]). Do not include
  category or price words here.

Examples:
Query: "something sweet and long lasting for a date night under $80"
{"category": null, "max_price": 80, "min_price": null, "keywords": ["sweet", "long-lasting", "date night"]}

Query: "woody perfume for men for office use"
{"category": "men", "max_price": null, "min_price": null, "keywords": ["woody", "office"]}

Query: "gift set for my wife"
{"category": "gift", "max_price": null, "min_price": null, "keywords": []}
"""


def _fallback_filters(query: str) -> dict:
    """No AI available — just pull a price if present and treat the rest as keywords."""
    price_match = re.search(r"(\d+)", query)
    max_price = float(price_match.group(1)) if price_match else None

    category = None
    lowered = query.lower()
    if any(w in lowered for w in ["men", "man", "male", "him", "guy"]):
        category = "men"
    elif any(w in lowered for w in ["women", "woman", "female", "her"]):
        category = "women"
    elif "oud" in lowered:
        category = "oud"
    elif "gift" in lowered:
        category = "gift"

    words = re.findall(r"[a-zA-Z]+", lowered)
    stopwords = {"a", "an", "the", "for", "with", "under", "over", "and", "or",
                 "perfume", "fragrance", "scent", "please", "me", "something",
                 "want", "need", "find", "show"}
    keywords = [w for w in words if w not in stopwords and len(w) > 2]

    return {
        "category": category,
        "max_price": max_price,
        "min_price": None,
        "keywords": keywords[:6],
    }


def get_search_filters(query: str) -> dict:
    """Main entry point. Always returns a filters dict, never raises."""
    if not query or not query.strip():
        return {"category": None, "max_price": None, "min_price": None, "keywords": []}

    if not settings.GROQ_API_KEY:
        return _fallback_filters(query)

    try:
        response = requests.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.GROQ_MODEL,
                "temperature": 0,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f'Query: "{query}"'},
                ],
            },
            timeout=8,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        data = json.loads(content)

        return {
            "category": data.get("category"),
            "max_price": data.get("max_price"),
            "min_price": data.get("min_price"),
            "keywords": data.get("keywords") or [],
        }
    except Exception:
        # Network error, bad API key, rate limit, malformed JSON — any of these
        # degrade gracefully to keyword search rather than a 500 error.
        return _fallback_filters(query)
