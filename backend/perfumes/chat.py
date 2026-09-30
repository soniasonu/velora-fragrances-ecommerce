"""
Conversational AI assistant for the floating chat widget.

Unlike ai_search.py (which turns a query into structured filters for
exact database filtering), this module has an open-ended conversation
with the shopper — but every reply is grounded in a real list of
matching products pulled from MySQL first, passed to the AI as context,
with an explicit instruction never to mention anything outside that
list. This is what stops the assistant from inventing a perfume, price,
or scent note that doesn't actually exist in the store.

Uses the same Groq API as ai_search.py — see that file for setup notes.
"""

import requests
from django.conf import settings

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = """You are Aria, the friendly AI fragrance concierge for Velora
Fragrances, a luxury perfume boutique.

Help shoppers find perfumes, answer questions about scents and notes, and
point them toward the right part of the site (the Collections page for
browsing, filters for men/women/oud/gift sets).

Hard rules:
- ONLY mention products that appear in the "Relevant products" list given to
  you. Never invent a product name, price, or scent note that isn't listed.
- The "Relevant products" list is a SAMPLE of up to 5 items relevant to the
  shopper's current message — it is NOT the full catalog. A separate line
  tells you the true total number of products in the store. If asked how
  many products the store carries in total, use that total figure, never
  the count of items in the sample list.
- If nothing in the sample list fits what they're asking for, say so
  honestly and suggest they browse the Collections page or try describing
  what they want differently — do not make something up to fill the gap.
- Keep replies warm and conversational, 2 to 4 sentences. Not a wall of text.
- If asked something unrelated to fragrances or the store, gently steer the
  conversation back rather than answering it at length.
"""


def get_chat_reply(message: str, history: list, matched_products: list, total_catalog_count: int) -> str:
    """
    message: the shopper's latest message
    history: list of {"role": "user"|"assistant", "content": "..."} from
             earlier in this conversation (frontend keeps and resends this)
    matched_products: Perfume model instances already fetched from the DB
                       that seem relevant to this message (capped at 5 —
                       a sample for grounding, not the whole catalog)
    total_catalog_count: the real total number of products in the store,
                          so the AI can answer "how many do you have?"
                          correctly instead of confusing it with the size
                          of the sample list above
    """
    if not settings.GROQ_API_KEY:
        return (
            "I'm not fully set up yet — the store owner needs to add a "
            "GROQ_API_KEY. In the meantime, try the search bar or browse "
            "the Collections page!"
        )

    if matched_products:
        products_context = "\n".join(
            f"- {p.name} (${p.price}, {p.get_category_display()}): {p.description}"
            for p in matched_products
        )
    else:
        products_context = "No matching products were found in our catalog for this request."

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    # Keep only the last few turns so the request stays small and fast —
    # a shopping-assistant chat rarely needs deep history to stay coherent.
    for turn in history[-6:]:
        role = turn.get("role")
        content = turn.get("content")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    messages.append({
        "role": "user",
        "content": (
            f"Total products in our catalog: {total_catalog_count}\n\n"
            f"Relevant products (sample, not the full catalog):\n{products_context}\n\n"
            f"Shopper says: {message}"
        ),
    })

    try:
        response = requests.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.GROQ_MODEL,
                "temperature": 0.7,
                "messages": messages,
            },
            timeout=10,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        return "Sorry, I'm having trouble connecting right now. Please try again in a moment."
