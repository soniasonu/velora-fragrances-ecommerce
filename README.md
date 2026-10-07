# Velora Fragrances

A full-stack e-commerce platform for a fragrance brand built with Django, Django REST Framework, MySQL, and vanilla HTML/CSS/JavaScript.

## Why I Built This

This project was built to showcase end-to-end full-stack development in a realistic business workflow. I wanted to create something that goes beyond a tutorial by implementing:
- relational database design
- REST API development
- session-based authentication
- cart and checkout flow
- payment integration
- AI-powered product discovery grounded in real catalog data
- order tracking and customer-facing commerce workflows

This project reflects my ability to move from product idea to working application, API design, and deployment-ready implementation.

Live Demo: https://velora-fragrances.netlify.app

Backend API: https://velora-fragrances-ecommerce-2.onrender.com/api/perfumes/

> Note: The backend is hosted on a free plan and may go to sleep after inactivity. The first request can take around 50 seconds to load. After that, it works normally.

---  

## Features

### Storefront
- Product catalog stored in MySQL and rendered dynamically from the API
- Category filters for Men, Women, Oud, and Gift Sets
- Best Sellers section
- Product detail page with scent notes, quantity selection, and related products
- Product rating and review count on each card

### AI Search & Chat
- Natural-language search such as: "woody perfume for office under $100"
- AI assistant ("Aria") that recommends products conversationally
- Search and chat are grounded in the actual database instead of inventing products or prices
- Graceful fallback to standard keyword search when AI is unavailable

### Accounts
- Real signup/login/logout with Django sessions
- Passwords hashed using PBKDF2
- Login state persists across page loads and throughout the site

### Cart, Checkout & Orders
- Cart is tied to the logged-in user in MySQL
- Shipping address collection and validation at checkout
- Two payment methods:
  - Razorpay test mode (Card/UPI)
  - Cash on Delivery
- Order history with item list, shipping information, and order status

### Reviews
- Logged-in users can rate and review products
- One review per user per product
- Submitting again updates the existing review instead of duplicating it
- Average rating is computed live and displayed across the site

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, Django, Django REST Framework |
| Database | MySQL |
| Auth | Django session-based authentication |
| Payments | Razorpay (test mode) |
| AI | Groq API (Llama/OpenAI-compatible chat completions) |
| Frontend | HTML, CSS, JavaScript |

---

## Project Structure

```text
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
    ├── aiven-ca.pem
    ├── config/                  # Django settings and URL routing
    ├── accounts/                # Signup, login, logout, session auth
    ├── perfumes/                # Product catalog, reviews, AI search, AI chat
    ├── orders/                  # Cart, checkout, Razorpay, order history
    └── staticfiles/             # Collected static files
```

---

## Architecture

### High-level flow
```text
Frontend (HTML/CSS/JS)
    ↓
Django REST API
    ↓
Business Logic (accounts, perfumes, orders)
    ↓
MySQL Database
```

### Main backend apps
- `accounts` – signup, login, logout, session-based authentication
- `perfumes` – product catalog, reviews, AI search, AI chat
- `orders` – cart, checkout, Razorpay payment flow, order history

### Core design decisions
- Reviews are constrained so each user can leave only one review per product
- Orders store a snapshot of the purchased product details for historical accuracy
- Cart is tied to the logged-in user instead of browser storage
- AI search is grounded in the real product catalog before generating a response

---

## Setup

### Prerequisites
- Python 3.8+
- MySQL Server
- Optional: Groq API key for AI search/chat
- Optional: Razorpay test-mode key for card/UPI payments

---

### 1. Clone the project
```bash
git clone https://github.com/soniasonu/velora-fragrances-ecommerce.git
cd velora-fragrances-ecommerce/backend
```

### 2. Create a virtual environment
```bash
python -m venv venv
```

For Windows:
```bash
venv\Scripts\activate
```

For macOS/Linux:
```bash
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Create the database
```sql
CREATE DATABASE velora_db CHARACTER SET utf8mb4;
```

### 5. Configure environment variables
```bash
# Windows
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

Then update `.env` with your database credentials and optional keys:
```env
DB_NAME=velora_db
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=127.0.0.1
DB_PORT=3306

GROQ_API_KEY=your_groq_api_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

> Both AI and payment integrations are optional. The app falls back gracefully if they are unavailable.

### 6. Run database migrations
```bash
python manage.py migrate
```

### 7. Seed the catalog
```bash
python manage.py seed_perfumes
```

### 8. Run the backend
```bash
python manage.py runserver
```

Backend will be available at:
```text
http://127.0.0.1:8000
```

### 9. Run the frontend
Open the frontend with a static file server or VS Code Live Server:

```bash
cd ../frontend
python -m http.server 5500
```

Then open:
```text
http://127.0.0.1:5500
```

---

## API Overview

### Authentication
- `POST /api/auth/signup/`
- `POST /api/auth/login/`
- `POST /api/auth/logout/`
- `GET /api/auth/me/`

### Products
- `GET /api/perfumes/`
- `GET /api/perfumes/<id>/`
- `POST /api/search/`
- `POST /api/chat/`

### Reviews
- `GET /api/perfumes/<id>/reviews/`
- `POST /api/perfumes/<id>/reviews/`

### Cart and Orders
- `GET /api/cart/`
- `POST /api/cart/add/`
- `POST /api/cart/update/`
- `POST /api/cart/remove/`
- `POST /api/orders/checkout/`
- `POST /api/orders/verify-payment/`
- `GET /api/orders/`

---

## Known Limitations

This project is intentionally honest about where it can improve:

- No automated test suite yet
- Cart requires login; guest cart is not implemented
- Reviews do not require verified purchase
- `Order.user` cascades on delete; production would use `PROTECT`
- No inventory/stock tracking
- Backend is hosted on a free tier and may have cold starts

---

## Future Improvements

- Add automated tests
- Implement guest cart with merge-on-login
- Track inventory and stock
- Add email notifications for orders
- Improve admin dashboard and reporting
- Add wishlist and recommendation features
- Improve deployment and autoscaling

---

## Author

Built by Sonia

- GitHub: https://github.com/soniasonu
- LinkedIn: https://linkedin.com/in/soniajayesh

---

## License

This project is for educational and portfolio use.
