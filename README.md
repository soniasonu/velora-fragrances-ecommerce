# Velora Fragrances

A full-stack e-commerce site for a perfume brand — built with **Django, Django REST Framework and MySQL** on the backend, and plain **HTML / CSS / JavaScript** on the frontend. Includes real authentication, a shopping cart and checkout flow with **Razorpay** payments, an **AI-powered natural-language product search and chat assistant**, and a star-rating review system.

> Built as a portfolio project to demonstrate practical full-stack skills: relational data modeling, a REST API, session-based authentication, third-party payment integration, and grounded AI features that never invent data outside the real product catalog.

---
Live Demo
Website: https://velora-fragrances.netlify.app
Backend API (sample endpoint): https://velora-fragrances-ecommerce-2.onrender.com/api/perfumes/

Note: I host the backend on a free plan, so it goes to sleep when nobody is using it. The first time you open the site it can take around 50 seconds to load. After that it works normally.

## Features

**Storefront**
- Product catalog stored in MySQL, rendered live from the API (not hardcoded HTML)
- Category filters (For Men / For Women / Oud / Gift Sets) and a Best Sellers section
- Product detail page: large image, scent notes, quantity picker, inline reviews, and related products
- Star ratings and review counts shown on every product card

**AI Search & Chat**
- Natural-language search bar — type a full sentence (*"woody perfume for office under $100"*) and get real, filtered results
- Floating AI chat assistant ("Aria") that recommends products conversationally
- Both features are grounded in the real database: the AI is only ever given actual matching products as context, and is explicitly instructed never to mention a product, price, or detail that isn't real
- Falls back to plain keyword search automatically if the AI API is unavailable

**Accounts**
- Real signup/login/logout with Django sessions — passwords hashed with PBKDF2, never stored in plain text
- Login state persists across page loads and across the whole site

**Cart, Checkout & Orders**
- Cart tied to the logged-in user's account in MySQL (not browser storage)
- Shipping address captured and validated at checkout
- Two payment methods:
  - **Card/UPI via Razorpay** (test mode) — real hosted payment popup, signature verified server-side before any order is marked paid
  - **Cash on Delivery**
- Order history page showing past orders, items, status, and shipping address

**Reviews**
- Logged-in users can rate and review any product (1–5 stars + comment)
- One review per user per product — resubmitting updates it rather than duplicating
- Average rating computed live and shown across the site

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, Django, Django REST Framework |
| Database | MySQL |
| Auth | Django sessions (cookie-based) |
| Payments | Razorpay (test mode) |
| AI | Groq API (Llama models, OpenAI-compatible chat completions) |
| Frontend | HTML, CSS, vanilla JavaScript (no framework/build step) |

---

## Project Structure

```
velora-fragrances/
├── frontend/
│   ├── index.html
│   ├── collections.html
│   ├── product-detail.html
│   ├── order-history.html
│   ├── style.css
│   ├── panels.css
│   ├── script.js
│   └── image/
│
└── backend/
    ├── manage.py
    ├── requirements.txt
    ├── .env.example
    ├── velora_backend/        # Django project settings
    ├── accounts/              # signup, login, logout, session auth
    ├── perfumes/               # product catalog, AI search, AI chat, reviews
    └── orders/                 # cart, checkout, Razorpay payments, order history
```

---

## Setup

### Prerequisites
- Python 3.8+
- MySQL Server
- A free [Groq API key](https://console.groq.com) (optional — enables the AI search/chat; both fall back gracefully without one)
- A free [Razorpay test-mode API key](https://dashboard.razorpay.com) (optional — enables card/UPI checkout; Cash on Delivery works without it)

### 1. Clone and set up the backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

pip install -r requirements.txt
```

### 2. Create the database

```sql
CREATE DATABASE velora_db CHARACTER SET utf8mb4;
```

### 3. Configure environment variables

```bash
copy .env.example .env         # Windows
# cp .env.example .env         # Mac/Linux
```

Edit `.env` and fill in your MySQL password. Add `GROQ_API_KEY` and `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` if you have them — both are optional at first run.

### 4. Migrate and seed the catalog

```bash
python manage.py migrate
python manage.py seed_perfumes
```

### 5. (Optional) Create an admin login

```bash
python manage.py createsuperuser
```

### 6. Run the backend

```bash
python manage.py runserver
```

### 7. Run the frontend

Open `frontend/index.html` with VS Code's **Live Server** extension (or any static file server). By default the frontend expects the backend at `http://127.0.0.1:8000` and itself runs on `http://127.0.0.1:5500` — if your Live Server uses a different port, add it to `CORS_ALLOWED_ORIGINS` in `.env` and restart the backend.

---


## Known Limitations / Roadmap

This is an honest list — these are things I'm aware of and would address next, not blind spots:

- No automated test suite yet (tested manually and via direct API calls during development)
- Cart requires login; no guest cart with merge-on-login
- Reviews don't require a verified purchase
- `Order.user` cascades on delete — a production version should use `PROTECT` to preserve financial records
- No inventory/stock tracking

---

## Author

Built by Sonia — [GitHub](https://github.com/soniasonu) · [LinkedIn](https://linkedin.com/in/soniajayesh)
