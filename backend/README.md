# Velora Fragrances — AI Natural-Language Search (Django + MySQL)

Lets a shopper type something like:

> "woody perfume for office under $100"

and get back matching perfumes from your real 25-product catalog —
no dropdowns, no exact keyword matching required.

## How it works

```
Browser (collections.html)
    │ user types a sentence into the search bar
    ▼
POST /api/search/   { "query": "..." }
    │
    ▼
perfumes/ai_search.py
    │ sends the sentence to Groq's free LLM API
    │ gets back: {"category": "men", "max_price": 100, "keywords": ["woody","office"]}
    ▼
perfumes/views.py
    │ builds a Django ORM query from those filters
    │ Perfume.objects.filter(category="men", price__lte=100, ...)
    ▼
MySQL (velora_db)
    ▼
JSON response → rendered as product cards by script.js
```

If the AI call fails for any reason (no API key, rate limit, no internet),
`ai_search.py` falls back to a plain keyword parser automatically. The
endpoint never breaks — it just becomes a normal keyword search instead
of an AI-understood one.

## 1. Install

```bash
cd velora_backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

`mysqlclient` needs MySQL's dev headers to build:
- **Windows:** usually installs fine from the wheel, no extra step.
- **Mac:** `brew install mysql-client pkg-config` first.
- **Linux:** `sudo apt install default-libmysqlclient-dev pkg-config` first.

## 2. Create the database

In MySQL:

```sql
CREATE DATABASE velora_db CHARACTER SET utf8mb4;
```

## 3. Configure

```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `DB_PASSWORD` — your MySQL password
- `GROQ_API_KEY` — free key from https://console.groq.com (sign up, no
  card needed, create an API key). This is what makes the search
  "understand" a sentence instead of just matching exact words.

Without a `GROQ_API_KEY`, the search still works — it just falls back to
keyword matching (see "How it works" above).

## 4. Migrate and seed your real products

```bash
python manage.py migrate
python manage.py seed_perfumes
```

This loads the 25 products pulled from your actual `collections.html`
(Sauvage Eau Forte, Miss Dior, Villain Bukhoor Oud, the gift sets, etc.)
straight into MySQL. Re-run it any time — it updates existing rows by
name rather than duplicating them. Use `--clear` to wipe and reseed:

```bash
python manage.py seed_perfumes --clear
```

## 5. (Optional) Create an admin login

```bash
python manage.py createsuperuser
```

Then visit `http://127.0.0.1:8000/admin/` to add, edit, or remove
perfumes through a normal Django admin screen instead of editing HTML.

## 6. Run the server

```bash
python manage.py runserver
```

## 7. Try it

```bash
curl -X POST http://127.0.0.1:8000/api/search/ \
  -H "Content-Type: application/json" \
  -d '{"query": "something sweet for a date night under $150"}'
```

You should get back JSON with `filters` (what the AI understood) and
`results` (matching perfumes).

Plain listing, useful for sanity-checking the seed data:

```
GET http://127.0.0.1:8000/api/perfumes/
GET http://127.0.0.1:8000/api/perfumes/?category=oud
```

## 8. Connect it to your frontend

See `collections-search-snippet.js` — a small addition to your existing
`script.js` that wires your search bar to `/api/search/` and re-renders
`#collectionGrid` with the results. It keeps your existing filter
buttons working too; typing a sentence and clicking a filter button
both just re-run the same render function.

If you deploy the frontend somewhere other than `127.0.0.1:5500`, add
that origin to `CORS_ALLOWED_ORIGINS` in `.env`.
