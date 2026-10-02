document.addEventListener('DOMContentLoaded', function () {

    /* ================= Config ================= */
    // Django backend. Change this if you deploy the backend somewhere else.
    const API_BASE = (location.hostname === '127.0.0.1' || location.hostname === 'localhost')
        ? 'http://127.0.0.1:8000/api'
        : 'https://velora-fragrances-ecommerce-2.onrender.com/api';

    /* ================= Helpers ================= */
    function toast(message) {
        const t = document.createElement('div');
        t.className = 'toast';
        t.textContent = message;
        document.body.appendChild(t);
        requestAnimationFrame(function () { t.classList.add('show'); });
        setTimeout(function () {
            t.classList.remove('show');
            setTimeout(function () { t.remove(); }, 400);
        }, 2500);
    }

    function starString(avg) {
        const rounded = Math.round(avg || 0);
        return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
    }

    function ratingLineHTML(p) {
        if (!p.review_count) {
            return `<p class="rating-line" data-perfume-id="${p.id}"><span class="stars-empty">☆☆☆☆☆</span> <button type="button" class="review-link" data-id="${p.id}" data-name="${p.name}">Be the first to review</button></p>`;
        }
        return `<p class="rating-line" data-perfume-id="${p.id}"><span class="stars-filled">${starString(p.average_rating)}</span> ${p.average_rating} <button type="button" class="review-link" data-id="${p.id}" data-name="${p.name}">(${p.review_count} review${p.review_count === 1 ? '' : 's'})</button></p>`;
    }

    function productCardHTML(p) {
        return `
            <div class="product-card" data-id="${p.id}" data-category="${p.category}">
                <div class="product-img">
                    <img src="${p.image}" alt="${p.name}">
                    <div class="product-overlay">
                        <button class="add-to-cart" data-id="${p.id}" data-product="${p.name}" data-price="${p.price}" data-img="${p.image}">Add to Cart</button>
                    </div>
                </div>
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <p class="product-desc">${p.description}</p>
                    ${ratingLineHTML(p)}
                    <p class="price">$${Number(p.price).toFixed(2)}</p>
                </div>
            </div>
        `;
    }

    function renderGrid(container, products, emptyMessage) {
        if (!container) return;
        if (!products.length) {
            container.innerHTML = `<p class="empty-msg">${emptyMessage || 'No perfumes found.'}</p>`;
            return;
        }
        container.innerHTML = products.map(productCardHTML).join('');
    }

    /* ================= Mobile menu ================= */
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function (e) {
            e.stopPropagation();
            navLinks.classList.toggle('active');
            hamburger.innerHTML = navLinks.classList.contains('active')
                ? '<i class="fa-solid fa-xmark"></i>'
                : '<i class="fa-solid fa-bars"></i>';
        });

        document.addEventListener('click', function (e) {
            if (!navLinks.contains(e.target) && !hamburger.contains(e.target)) {
                navLinks.classList.remove('active');
                hamburger.innerHTML = '<i class="fa-solid fa-bars"></i>';
            }
        });
    }

    /* ================= Testimonial slider (home page) ================= */
    const slides = document.querySelectorAll('.testimonial-slide');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.testimonial-prev');
    const nextBtn = document.querySelector('.testimonial-next');

    if (slides.length && prevBtn && nextBtn) {
        let current = 0;
        let timer;

        function showSlide(index) {
            current = (index + slides.length) % slides.length;
            slides.forEach(function (s, i) { s.classList.toggle('active', i === current); });
            dots.forEach(function (d, i) { d.classList.toggle('active', i === current); });
        }
        function startAuto() {
            clearInterval(timer);
            timer = setInterval(function () { showSlide(current + 1); }, 5000);
        }

        prevBtn.addEventListener('click', function () { showSlide(current - 1); startAuto(); });
        nextBtn.addEventListener('click', function () { showSlide(current + 1); startAuto(); });
        dots.forEach(function (dot) {
            dot.addEventListener('click', function () {
                showSlide(Number(dot.dataset.slide));
                startAuto();
            });
        });
        showSlide(0);
        startAuto();
    }

    /* ================= Inject search, cart and account panels ================= */
    document.body.insertAdjacentHTML('beforeend', `
        <div class="backdrop" id="backdrop"></div>

        <div class="search-panel" id="searchPanel">
            <form id="searchForm">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="searchInput" placeholder="Search perfumes..." autocomplete="off">
                <button type="button" class="panel-close" data-close aria-label="Close search">&times;</button>
            </form>
        </div>

        <aside class="cart-drawer" id="cartDrawer">
            <div class="drawer-head">
                <h3>Your Bag</h3>
                <button type="button" class="panel-close" data-close aria-label="Close cart">&times;</button>
            </div>
            <div class="drawer-items" id="cartItems"></div>
            <div class="drawer-foot">
                <div class="drawer-total"><span>Total</span><strong id="cartTotal">$0.00</strong></div>
                <button type="button" class="btn btn-primary" id="checkoutBtn">Checkout</button>
            </div>
        </aside>

        <div class="account-modal" id="accountModal">
            <button type="button" class="panel-close" data-close aria-label="Close account">&times;</button>
            <div id="accountBody"></div>
        </div>
    `);

    const backdrop = document.getElementById('backdrop');
    const searchPanel = document.getElementById('searchPanel');
    const cartDrawer = document.getElementById('cartDrawer');
    const accountModal = document.getElementById('accountModal');
    const panels = [searchPanel, cartDrawer, accountModal];

    function closeAll() {
        panels.forEach(function (p) { p.classList.remove('open'); });
        backdrop.classList.remove('open');
    }
    function openPanel(panel) {
        closeAll();
        panel.classList.add('open');
        backdrop.classList.add('open');
    }

    backdrop.addEventListener('click', closeAll);
    document.querySelectorAll('[data-close]').forEach(function (b) {
        b.addEventListener('click', closeAll);
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeAll();
    });

    /* ================= Navbar icons ================= */
    const icons = document.querySelectorAll('.nav-icons .nav-icon');
    const searchIcon = icons[0];
    const cartIcon = document.querySelector('.cart-icon');
    const userIcon = icons[2];
    const cartCount = document.querySelector('.cart-count');

    if (searchIcon) {
        searchIcon.addEventListener('click', function (e) {
            e.preventDefault();
            openPanel(searchPanel);
            setTimeout(function () { document.getElementById('searchInput').focus(); }, 100);
        });
    }
    if (cartIcon) {
        cartIcon.addEventListener('click', async function (e) {
            e.preventDefault();
            await refreshCart();
            openPanel(cartDrawer);
        });
    }
    if (userIcon) {
        userIcon.addEventListener('click', function (e) {
            e.preventDefault();
            renderAccount('login');
            openPanel(accountModal);
        });
    }

    /* ================= Cart (real backend, MySQL-backed, tied to your login) ================= */
    // The cart now lives in the database, linked to your account — it's
    // the same cart whether you're on your phone or your laptop, and it
    // survives a logout/login. Requires being signed in; add-to-cart
    // will prompt the account popup if you aren't.
    let cartData = { items: [], total: 0 };

    async function fetchCart() {
        try {
            const res = await fetch(API_BASE + '/cart/', { credentials: 'include' });
            if (res.status === 401 || res.status === 403) {
                cartData = { items: [], total: 0 };
                return;
            }
            cartData = await res.json();
        } catch (err) {
            cartData = { items: [], total: 0 };
        }
    }

    function renderCart() {
        const list = document.getElementById('cartItems');
        const totalEl = document.getElementById('cartTotal');
        const count = cartData.items.reduce(function (n, i) { return n + i.quantity; }, 0);

        if (cartCount) cartCount.textContent = count;
        totalEl.textContent = '$' + Number(cartData.total).toFixed(2);

        if (!cartData.items.length) {
            list.innerHTML = '<p class="empty-msg">Your bag is empty.</p>';
            return;
        }

        list.innerHTML = cartData.items.map(function (item) {
            return '<div class="cart-item">' +
                '<img src="' + item.perfume.image + '" alt="' + item.perfume.name + '">' +
                '<div class="cart-info">' +
                    '<h4>' + item.perfume.name + '</h4>' +
                    '<span>$' + Number(item.perfume.price).toFixed(2) + '</span>' +
                    '<div class="qty">' +
                        '<button type="button" data-act="dec" data-id="' + item.id + '" data-qty="' + item.quantity + '">&minus;</button>' +
                        '<span>' + item.quantity + '</span>' +
                        '<button type="button" data-act="inc" data-id="' + item.id + '" data-qty="' + item.quantity + '">+</button>' +
                    '</div>' +
                '</div>' +
                '<button type="button" class="remove" data-act="rm" data-id="' + item.id + '" aria-label="Remove">' +
                    '<i class="fa-solid fa-trash"></i></button>' +
            '</div>';
        }).join('');
    }

    async function refreshCart() {
        await fetchCart();
        renderCart();
    }

    document.getElementById('cartItems').addEventListener('click', async function (e) {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const itemId = btn.dataset.id;

        if (btn.dataset.act === 'rm') {
            await fetch(API_BASE + '/cart/remove/', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: itemId }),
            });
        } else {
            const currentQty = Number(btn.dataset.qty);
            const newQty = btn.dataset.act === 'inc' ? currentQty + 1 : currentQty - 1;
            await fetch(API_BASE + '/cart/update/', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: itemId, quantity: newQty }),
            });
        }
        await refreshCart();
    });

    document.getElementById('checkoutBtn').addEventListener('click', function () {
        if (!currentUser) {
            toast('Please log in to check out');
            renderAccount('login');
            openPanel(accountModal);
            return;
        }
        if (!cartData.items.length) { toast('Your bag is empty'); return; }
        openCheckoutModal();
    });

    function openCheckoutModal() {
        const existing = document.getElementById('checkoutModal');
        if (existing) existing.remove();

        const inputStyle = 'width:100%; padding:11px 14px; margin-bottom:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.2); background:rgba(0,0,0,0.3); color:#fff; font-family:inherit; font-size:14px;';

        document.body.insertAdjacentHTML('beforeend', `
            <div class="account-modal open" id="checkoutModal" style="width:min(420px, 92vw); max-height:85vh; overflow-y:auto;">
                <button type="button" class="panel-close" id="checkoutClose" aria-label="Close">&times;</button>
                <h3>Shipping details</h3>
                <p class="account-note">Total: $${Number(cartData.total).toFixed(2)}</p>

                <input type="text" id="shipName" placeholder="Full name" style="${inputStyle}">
                <input type="tel" id="shipPhone" placeholder="Phone number" style="${inputStyle}">
                <input type="text" id="shipAddr1" placeholder="Address line 1" style="${inputStyle}">
                <input type="text" id="shipAddr2" placeholder="Address line 2 (optional)" style="${inputStyle}">
                <div style="display:flex; gap:10px;">
                    <input type="text" id="shipCity" placeholder="City" style="${inputStyle}">
                    <input type="text" id="shipState" placeholder="State" style="${inputStyle}">
                </div>
                <input type="text" id="shipPincode" placeholder="Pincode" style="${inputStyle}">

                <p class="account-note" style="margin-top:16px; margin-bottom:8px;">Payment method</p>
                <div style="display:flex; flex-direction:column; gap:12px;">
                    <button type="button" class="btn btn-primary" id="payCardBtn">Pay with Card / UPI (Razorpay test mode)</button>
                    <button type="button" class="btn btn-secondary" id="payCodBtn">Cash on Delivery</button>
                </div>
                <p class="account-error" id="checkoutError" style="display:none;"></p>
            </div>
        `);
        backdrop.classList.add('open');

        document.getElementById('checkoutClose').addEventListener('click', function () {
            document.getElementById('checkoutModal').remove();
            backdrop.classList.remove('open');
        });

        document.getElementById('payCardBtn').addEventListener('click', function () { submitCheckout('card'); });
        document.getElementById('payCodBtn').addEventListener('click', function () { submitCheckout('cod'); });
    }

    function getShippingAddress() {
        return {
            name: document.getElementById('shipName').value.trim(),
            phone: document.getElementById('shipPhone').value.trim(),
            address_line1: document.getElementById('shipAddr1').value.trim(),
            address_line2: document.getElementById('shipAddr2').value.trim(),
            city: document.getElementById('shipCity').value.trim(),
            state: document.getElementById('shipState').value.trim(),
            pincode: document.getElementById('shipPincode').value.trim(),
        };
    }

    function validateShippingAddress(address) {
        const required = { name: 'full name', phone: 'phone number', address_line1: 'address', city: 'city', state: 'state', pincode: 'pincode' };
        const missing = Object.keys(required).filter(function (key) { return !address[key]; });
        if (missing.length) {
            return 'Please fill in your ' + missing.map(function (k) { return required[k]; }).join(', ') + '.';
        }
        return null;
    }

    // Razorpay's widget is loaded on demand (only when someone actually
    // clicks "Pay with Card"), so pages that never check out don't pay
    // for the extra script.
    function loadRazorpayScript() {
        return new Promise(function (resolve, reject) {
            if (window.Razorpay) { resolve(); return; }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = resolve;
            script.onerror = function () { reject(new Error('Could not load Razorpay')); };
            document.body.appendChild(script);
        });
    }

    function showOrderConfirmed(order) {
        const modal = document.getElementById('checkoutModal');
        if (!modal) return;
        modal.innerHTML = `
            <button type="button" class="panel-close" id="checkoutClose" aria-label="Close">&times;</button>
            <h3>Order Confirmed!</h3>
            <p class="account-note">Order #${order.id} — $${Number(order.total).toFixed(2)}</p>
            <div style="text-align:left; margin-top:15px;">
                ${order.items.map(function (item) {
                    return `<p style="font-size:14px; margin-bottom:6px;">${item.quantity} x ${item.perfume_name} — $${Number(item.subtotal).toFixed(2)}</p>`;
                }).join('')}
            </div>
            <div style="text-align:left; margin-top:15px; padding-top:15px; border-top:1px solid rgba(255,255,255,0.1); font-size:13px; color:rgba(255,255,255,0.7);">
                <strong style="color:#fff;">Shipping to:</strong><br>
                ${order.shipping_name}, ${order.shipping_phone}<br>
                ${order.shipping_address_line1}${order.shipping_address_line2 ? ', ' + order.shipping_address_line2 : ''}<br>
                ${order.shipping_city}, ${order.shipping_state} ${order.shipping_pincode}
            </div>
            <button type="button" class="btn btn-primary" id="checkoutDoneBtn" style="margin-top:20px; width:100%;">Continue Shopping</button>
        `;
        function close() { modal.remove(); backdrop.classList.remove('open'); }
        document.getElementById('checkoutClose').addEventListener('click', close);
        document.getElementById('checkoutDoneBtn').addEventListener('click', close);
    }

    async function submitCheckout(paymentMethod) {
        const errorEl = document.getElementById('checkoutError');
        errorEl.style.display = 'none';

        const address = getShippingAddress();
        const validationError = validateShippingAddress(address);
        if (validationError) {
            errorEl.textContent = validationError;
            errorEl.style.display = 'block';
            return;
        }

        let data;
        try {
            const res = await fetch(API_BASE + '/orders/checkout/', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payment_method: paymentMethod, address: address }),
            });
            data = await res.json();
            if (!res.ok) {
                errorEl.textContent = data.error || 'Checkout failed. Please try again.';
                errorEl.style.display = 'block';
                return;
            }
        } catch (err) {
            errorEl.textContent = 'Could not reach the server. Is Django running?';
            errorEl.style.display = 'block';
            return;
        }

        if (paymentMethod === 'cod') {
            document.getElementById('checkoutModal').remove();
            closeAll();
            await refreshCart();
            toast('Order placed! Pay on delivery.');
            return;
        }

        // paymentMethod === 'card' — open Razorpay's popup with the order
        // Django just created. This never redirects away from the page.
        try {
            await loadRazorpayScript();
        } catch (err) {
            errorEl.textContent = 'Could not load the payment widget. Check your connection.';
            errorEl.style.display = 'block';
            return;
        }

        const rzp = new Razorpay({
            key: data.razorpay_key_id,
            amount: data.amount,
            currency: data.currency,
            name: data.name,
            description: 'Order #' + data.order_id,
            order_id: data.razorpay_order_id,
            prefill: { email: data.prefill_email },
            theme: { color: '#d4af37' },
            handler: async function (response) {
                // Razorpay reports success here, but we never trust that
                // alone — the backend re-verifies the payment signature
                // before marking anything paid.
                try {
                    const verifyRes = await fetch(API_BASE + '/orders/verify-payment/', {
                        method: 'POST', credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            order_id: data.order_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        }),
                    });
                    const verifyData = await verifyRes.json();
                    if (!verifyRes.ok) {
                        errorEl.textContent = verifyData.error || 'Payment could not be verified.';
                        errorEl.style.display = 'block';
                        return;
                    }
                    await refreshCart();
                    showOrderConfirmed(verifyData.order);
                } catch (err) {
                    errorEl.textContent = 'Payment succeeded, but confirming it failed. Contact support with order #' + data.order_id + '.';
                    errorEl.style.display = 'block';
                }
            },
            modal: {
                ondismiss: function () {
                    toast('Payment cancelled');
                },
            },
        });

        rzp.open();
    }

    // Event delegation: product cards are rendered dynamically (fetched
    // from the API), so we listen on the whole page instead of attaching
    // a listener to each button at load time.
    document.body.addEventListener('click', async function (e) {
        const btn = e.target.closest('.add-to-cart');
        if (!btn) return;

        if (!currentUser) {
            toast('Please log in to add items to your bag');
            renderAccount('login');
            openPanel(accountModal);
            return;
        }

        const perfumeId = btn.dataset.id;
        // On the product detail page there's a quantity box; everywhere else it's 1.
        const qtyInput = document.getElementById('detailQty');
        const quantity = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;
        try {
            const res = await fetch(API_BASE + '/cart/add/', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ perfume_id: perfumeId, quantity: quantity }),
            });
            if (!res.ok) throw new Error('add failed');
            await refreshCart();
            toast(btn.dataset.product + ' added to bag');
        } catch (err) {
            toast('Could not add to bag. Is the server running?');
        }
    });

    // Clicking anywhere on a product card (except its buttons/links) opens
    // that product's detail page.
    document.body.addEventListener('click', function (e) {
        if (e.target.closest('.add-to-cart, .review-link, a, button')) return;
        const card = e.target.closest('.product-card[data-id]');
        if (!card) return;
        window.location.href = 'product-detail.html?id=' + encodeURIComponent(card.dataset.id);
    });

    refreshCart(); // load cart count on page load (empty/hidden if not logged in)

    /* ================= Fetch helper ================= */
    async function fetchPerfumes(params) {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        const res = await fetch(API_BASE + '/perfumes/' + qs);
        if (!res.ok) throw new Error('Failed to load perfumes');
        const data = await res.json();
        return data.results;
    }

    /* ================= Homepage: Best Sellers from the database ================= */
    const bestSellersGrid = document.getElementById('bestSellersGrid');
    if (bestSellersGrid) {
        bestSellersGrid.innerHTML = '<p class="empty-msg">Loading...</p>';
        fetchPerfumes({ is_bestseller: 'true' })
            .then(function (products) { renderGrid(bestSellersGrid, products); })
            .catch(function () {
                bestSellersGrid.innerHTML = '<p class="empty-msg">Could not load best sellers. Is the Django server running?</p>';
            });
    }

    /* ================= Collections page: catalog + filter + AI search ================= */
    const collectionGrid = document.getElementById('collectionGrid');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const filterBar = document.querySelector('.filter-bar');

    if (collectionGrid) {
        let allProducts = [];
        let activeFilter = 'all';

        function showBrowseMode() {
            if (filterBar) filterBar.classList.remove('ai-search-active');
            const visible = activeFilter === 'all'
                ? allProducts
                : allProducts.filter(function (p) { return p.category === activeFilter; });
            renderGrid(collectionGrid, visible, 'No perfumes in this category yet.');
        }

        collectionGrid.innerHTML = '<p class="empty-msg">Loading perfumes...</p>';
        fetchPerfumes()
            .then(function (products) {
                allProducts = products;

                const params = new URLSearchParams(window.location.search);
                const urlCategory = params.get('category');
                const urlSearch = params.get('search');

                if (urlSearch) {
                    document.getElementById('searchInput').value = urlSearch;
                    runAiSearch(urlSearch);
                } else {
                    activeFilter = urlCategory || 'all';
                    filterBtns.forEach(function (b) {
                        b.classList.toggle('active', b.dataset.filter === activeFilter);
                    });
                    showBrowseMode();
                }
            })
            .catch(function () {
                collectionGrid.innerHTML = '<p class="empty-msg">Could not load perfumes. Is the Django server running on 127.0.0.1:8000?</p>';
            });

        filterBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                activeFilter = btn.dataset.filter;
                filterBtns.forEach(function (b) { b.classList.toggle('active', b === btn); });
                showBrowseMode();
            });
        });

        async function runAiSearch(query) {
            collectionGrid.innerHTML = '<p class="empty-msg">Searching...</p>';
            if (filterBar) filterBar.classList.add('ai-search-active');

            try {
                const res = await fetch(API_BASE + '/search/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: query }),
                });
                if (!res.ok) throw new Error('Search failed');
                const data = await res.json();
                renderGrid(collectionGrid, data.results, 'No perfumes matched that search. Try describing it differently.');
            } catch (err) {
                collectionGrid.innerHTML = '<p class="empty-msg">Could not reach the search service. Is the Django server running?</p>';
            }
        }

        document.getElementById('searchForm').addEventListener('submit', function (e) {
            e.preventDefault();
            const value = document.getElementById('searchInput').value.trim();
            if (!value) return;
            runAiSearch(value);
            closeAll();
        });
    } else {
        // Not on the collections page (e.g. homepage) — a plain search
        // just takes the shopper to the collections page with the query.
        const searchFormEl = document.getElementById('searchForm');
        if (searchFormEl) {
            searchFormEl.addEventListener('submit', function (e) {
                e.preventDefault();
                const value = document.getElementById('searchInput').value.trim();
                if (!value) return;
                window.location.href = 'collections.html?search=' + encodeURIComponent(value);
            });
        }
    }

    /* ================= Order History page ================= */
    const orderHistoryList = document.getElementById('orderHistoryList');
    if (orderHistoryList) {
        loadOrderHistory();
    }

    async function loadOrderHistory() {
        orderHistoryList.innerHTML = '<p class="empty-msg">Loading your orders...</p>';
        try {
            const res = await fetch(API_BASE + '/orders/', { credentials: 'include' });
            if (res.status === 401 || res.status === 403) {
                orderHistoryList.innerHTML = '<p class="empty-msg">Please log in to view your order history.</p>';
                return;
            }
            const data = await res.json();
            if (!data.results.length) {
                orderHistoryList.innerHTML = '<p class="empty-msg">You haven\'t placed any orders yet.</p>';
                return;
            }
            orderHistoryList.innerHTML = data.results.map(orderCardHTML).join('');
        } catch (err) {
            orderHistoryList.innerHTML = '<p class="empty-msg">Could not load your orders. Is the server running?</p>';
        }
    }

    function orderCardHTML(order) {
        const date = new Date(order.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        const statusLabel = {
            pending: 'Pending Payment', paid: 'Paid', processing: 'Processing',
            failed: 'Payment Failed', cancelled: 'Cancelled',
        }[order.status] || order.status;

        return `
            <div class="order-card">
                <div class="order-card-head">
                    <div>
                        <strong>Order #${order.id}</strong>
                        <span class="order-date">${date}</span>
                    </div>
                    <span class="order-status order-status-${order.status}">${statusLabel}</span>
                </div>
                <div class="order-card-items">
                    ${order.items.map(function (item) {
                        return `<p>${item.quantity} x ${item.perfume_name} — $${Number(item.subtotal).toFixed(2)}</p>`;
                    }).join('')}
                </div>
                <div class="order-card-foot">
                    <div class="order-card-address">
                        <strong>Shipped to:</strong> ${order.shipping_name}, ${order.shipping_address_line1}${order.shipping_address_line2 ? ', ' + order.shipping_address_line2 : ''}, ${order.shipping_city}, ${order.shipping_state} ${order.shipping_pincode}
                    </div>
                    <div class="order-card-total">$${Number(order.total).toFixed(2)}</div>
                </div>
            </div>
        `;
    }

    /* ================= Reviews ================= */
    function reviewStarsInputHTML(selected) {
        selected = selected || 0;
        let html = '<div class="star-input" id="starInput">';
        for (let i = 1; i <= 5; i++) {
            html += `<span class="star-choice${i <= selected ? ' chosen' : ''}" data-value="${i}">★</span>`;
        }
        html += '</div>';
        return html;
    }

    function reviewItemHTML(r) {
        const date = new Date(r.created_at).toLocaleDateString();
        return `
            <div class="review-item">
                <div class="review-item-head">
                    <span class="review-stars">${starString(r.rating)}</span>
                    <strong>${r.user_name}</strong>
                    <span class="review-date">${date}</span>
                </div>
                ${r.comment ? `<p class="review-comment">${r.comment}</p>` : ''}
            </div>
        `;
    }

    async function openReviewsModal(perfumeId, perfumeName) {
        const existing = document.getElementById('reviewsModal');
        if (existing) existing.remove();

        document.body.insertAdjacentHTML('beforeend', `
            <div class="account-modal open" id="reviewsModal" style="width:min(480px, 92vw); max-height:80vh; overflow-y:auto;">
                <button type="button" class="panel-close" id="reviewsClose" aria-label="Close">&times;</button>
                <h3>${perfumeName}</h3>
                <div id="reviewsList"><p class="empty-msg">Loading reviews...</p></div>
                <div id="reviewFormWrap" style="margin-top:20px; border-top:1px solid rgba(255,255,255,0.1); padding-top:20px;"></div>
            </div>
        `);
        backdrop.classList.add('open');
        document.getElementById('reviewsClose').addEventListener('click', function () {
            document.getElementById('reviewsModal').remove();
            backdrop.classList.remove('open');
        });

        await loadReviews(perfumeId);
        renderReviewForm(perfumeId);
    }

    async function loadReviews(perfumeId) {
        const listEl = document.getElementById('reviewsList');
        if (!listEl) return;
        try {
            const res = await fetch(API_BASE + '/perfumes/' + perfumeId + '/reviews/');
            const data = await res.json();
            if (!data.results.length) {
                listEl.innerHTML = '<p class="empty-msg">No reviews yet — be the first!</p>';
            } else {
                listEl.innerHTML = data.results.map(reviewItemHTML).join('');
            }
        } catch (err) {
            listEl.innerHTML = '<p class="empty-msg">Could not load reviews. Is the server running?</p>';
        }
    }

    function renderReviewForm(perfumeId) {
        const wrap = document.getElementById('reviewFormWrap');
        if (!wrap) return;

        if (!currentUser) {
            wrap.innerHTML = '<p class="account-note">Log in to leave a review.</p>';
            return;
        }

        wrap.innerHTML = `
            <p style="margin-bottom:10px; font-size:14px;">Your rating:</p>
            ${reviewStarsInputHTML(0)}
            <textarea id="reviewComment" placeholder="Share your thoughts (optional)" rows="3"
                style="width:100%; margin-top:12px; padding:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.2); background:rgba(0,0,0,0.3); color:#fff; font-family:inherit; resize:vertical;"></textarea>
            <button type="button" class="btn btn-primary" id="submitReviewBtn" style="margin-top:12px; width:100%;">Submit Review</button>
            <p class="account-error" id="reviewError" style="display:none;"></p>
        `;

        let selectedRating = 0;
        document.querySelectorAll('#starInput .star-choice').forEach(function (star) {
            star.addEventListener('click', function () {
                selectedRating = Number(star.dataset.value);
                document.querySelectorAll('#starInput .star-choice').forEach(function (s) {
                    s.classList.toggle('chosen', Number(s.dataset.value) <= selectedRating);
                });
            });
        });

        document.getElementById('submitReviewBtn').addEventListener('click', async function () {
            const errorEl = document.getElementById('reviewError');
            errorEl.style.display = 'none';

            if (!selectedRating) {
                errorEl.textContent = 'Please choose a star rating.';
                errorEl.style.display = 'block';
                return;
            }

            const comment = document.getElementById('reviewComment').value.trim();
            try {
                const res = await fetch(API_BASE + '/perfumes/' + perfumeId + '/reviews/', {
                    method: 'POST', credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rating: selectedRating, comment: comment }),
                });
                if (!res.ok) {
                    const data = await res.json();
                    errorEl.textContent = data.error || 'Could not submit review.';
                    errorEl.style.display = 'block';
                    return;
                }
                await loadReviews(perfumeId);
                toast('Thanks for your review!');
                await refreshRatingDisplays(perfumeId);
            } catch (err) {
                errorEl.textContent = 'Could not reach the server.';
                errorEl.style.display = 'block';
            }
        });
    }

    document.body.addEventListener('click', function (e) {
        const link = e.target.closest('.review-link');
        if (!link) return;

        // On the product detail page, reviews are already shown inline, so
        // don't open the modal (it would reuse the same element ids).
        const detailEl = document.getElementById('productDetail');
        if (detailEl) {
            if (String(link.dataset.id) === String(detailEl.dataset.perfumeId)) {
                document.getElementById('reviewsSection').scrollIntoView({ behavior: 'smooth' });
            } else {
                window.location.href = 'product-detail.html?id=' + encodeURIComponent(link.dataset.id);
            }
            return;
        }
        openReviewsModal(link.dataset.id, link.dataset.name);
    });

    // After a new review is submitted, update just that perfume's star line
    // wherever it's currently shown on the page (catalog grid, best sellers,
    // or both) — without needing to know which page/section is showing it.
    async function refreshRatingDisplays(perfumeId) {
        try {
            const products = await fetchPerfumes();
            const updated = products.find(function (p) { return String(p.id) === String(perfumeId); });
            if (!updated) return;
            document.querySelectorAll('.rating-line[data-perfume-id="' + perfumeId + '"]').forEach(function (el) {
                el.outerHTML = ratingLineHTML(updated);
            });
        } catch (err) {
            // Non-critical — the modal's own review list already refreshed.
        }
    }

    /* ================= Account (real Django sessions, MySQL-backed) ================= */
    let currentUser = null; // filled in by checkSession() below

    async function checkSession() {
        try {
            const res = await fetch(API_BASE + '/auth/me/', { credentials: 'include' });
            const data = await res.json();
            currentUser = data.user;
        } catch (err) {
            currentUser = null; // backend unreachable — treat as logged out
        }
        updateUserIcon();
    }

    function updateUserIcon() {
        if (userIcon) userIcon.classList.toggle('logged-in', !!currentUser);
        // Lets page-specific code (e.g. the product detail page's review
        // form) react when someone logs in or out.
        document.dispatchEvent(new CustomEvent('velora:auth'));
    }

    function renderAccount(tab) {
        const body = document.getElementById('accountBody');

        if (currentUser) {
            body.innerHTML =
                '<h3>Welcome, ' + currentUser.name + '</h3>' +
                '<p class="account-note">' + currentUser.email + '</p>' +
                '<a href="order-history.html" class="btn btn-secondary" style="display:block; text-align:center; margin-bottom:12px;">Order History</a>' +
                '<button type="button" class="btn btn-primary" id="logoutBtn">Log Out</button>';
            document.getElementById('logoutBtn').addEventListener('click', async function () {
                await fetch(API_BASE + '/auth/logout/', { method: 'POST', credentials: 'include' });
                currentUser = null;
                updateUserIcon();
                closeAll();
                toast('You have been logged out');
            });
            return;
        }

        const isLogin = tab === 'login';
        body.innerHTML =
            '<div class="account-tabs">' +
                '<button type="button" class="' + (isLogin ? 'active' : '') + '" data-tab="login">Log In</button>' +
                '<button type="button" class="' + (!isLogin ? 'active' : '') + '" data-tab="signup">Sign Up</button>' +
            '</div>' +
            '<p class="account-error" id="accountError" style="display:none;"></p>' +
            '<form id="accountForm">' +
                (!isLogin ? '<input type="text" name="name" placeholder="Your Name" required>' : '') +
                '<input type="email" name="email" placeholder="Email" required>' +
                '<input type="password" name="password" placeholder="Password" minlength="6" required>' +
                '<button type="submit" class="btn btn-primary">' + (isLogin ? 'Log In' : 'Create Account') + '</button>' +
            '</form>';

        body.querySelectorAll('[data-tab]').forEach(function (b) {
            b.addEventListener('click', function () { renderAccount(b.dataset.tab); });
        });

        document.getElementById('accountForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            const form = e.target;
            const errorEl = document.getElementById('accountError');
            errorEl.style.display = 'none';

            const email = form.email.value.trim();
            const password = form.password.value;
            const name = form.name ? form.name.value.trim() : '';
            const endpoint = isLogin ? '/auth/login/' : '/auth/signup/';
            const payload = isLogin ? { email, password } : { name, email, password };

            let data;
            try {
                const res = await fetch(API_BASE + endpoint, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                data = await res.json();
                if (!res.ok) {
                    errorEl.textContent = data.error || 'Something went wrong. Please try again.';
                    errorEl.style.display = 'block';
                    return;
                }
            } catch (err) {
                errorEl.textContent = 'Could not reach the server. Is Django running?';
                errorEl.style.display = 'block';
                return;
            }

            currentUser = data.user;
            updateUserIcon();
            closeAll();
            toast('Welcome, ' + currentUser.name + '!');
        });
    }

    checkSession();

    /* ================= Product Detail page ================= */
    const productDetailEl = document.getElementById('productDetail');
    if (productDetailEl) {
        initProductDetailPage();
    }

    function escapeHTML(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    async function initProductDetailPage() {
        const id = new URLSearchParams(window.location.search).get('id');
        if (!id) {
            productDetailEl.innerHTML = '<p class="empty-msg">No product selected. <a href="collections.html" style="text-decoration:underline;">Browse the collection</a>.</p>';
            return;
        }

        productDetailEl.innerHTML = '<p class="empty-msg">Loading...</p>';

        let perfume;
        try {
            const res = await fetch(API_BASE + '/perfumes/' + encodeURIComponent(id) + '/');
            if (res.status === 404) {
                productDetailEl.innerHTML = '<p class="empty-msg">We couldn\'t find that perfume. <a href="collections.html" style="text-decoration:underline;">Browse the collection</a>.</p>';
                return;
            }
            if (!res.ok) throw new Error('load failed');
            perfume = await res.json();
        } catch (err) {
            productDetailEl.innerHTML = '<p class="empty-msg">Could not load this product. Is the Django server running?</p>';
            return;
        }

        document.title = perfume.name + ' | Velora Fragrances';
        productDetailEl.dataset.perfumeId = perfume.id;

        const categoryLabel = { men: 'For Him', women: 'For Her', oud: 'Oud', gift: 'Gift Sets' }[perfume.category] || perfume.category;
        const notes = (perfume.notes || '').split(',').map(function (n) { return n.trim(); }).filter(Boolean);
        const price = Number(perfume.price);

        productDetailEl.innerHTML = `
            <div class="detail-grid">
                <div class="detail-image">
                    <img src="${escapeHTML(perfume.image)}" alt="${escapeHTML(perfume.name)}">
                </div>
                <div class="detail-info">
                    <p class="detail-breadcrumb"><a href="collections.html">Collections</a> / ${escapeHTML(categoryLabel)}</p>
                    <h1>${escapeHTML(perfume.name)}</h1>
                    ${ratingLineHTML(perfume)}
                    <p class="detail-price">$${price.toFixed(2)}</p>
                    <p class="detail-desc">${escapeHTML(perfume.description)}</p>
                    ${notes.length ? `
                        <div class="detail-notes">
                            <span class="detail-notes-label">Scent notes</span>
                            ${notes.map(function (n) { return '<span class="note-chip">' + escapeHTML(n) + '</span>'; }).join('')}
                        </div>` : ''}
                    <div class="detail-buy">
                        <div class="qty-picker">
                            <button type="button" id="qtyMinus" aria-label="Decrease quantity">&minus;</button>
                            <input type="number" id="detailQty" min="1" value="1">
                            <button type="button" id="qtyPlus" aria-label="Increase quantity">+</button>
                        </div>
                        <button type="button" class="btn btn-primary add-to-cart"
                            data-id="${perfume.id}" data-product="${escapeHTML(perfume.name)}"
                            data-price="${price}" data-img="${escapeHTML(perfume.image)}">Add to Bag</button>
                    </div>
                </div>
            </div>

            <section class="detail-section" id="reviewsSection">
                <h2>Customer <span>Reviews</span></h2>
                <div id="reviewsList"></div>
                <div id="reviewFormWrap" class="detail-review-form"></div>
            </section>

            <section class="detail-section" id="relatedSection" style="display:none;">
                <h2>You may also <span>like</span></h2>
                <div class="product-grid" id="relatedGrid"></div>
            </section>
        `;

        const qtyInput = document.getElementById('detailQty');
        document.getElementById('qtyMinus').addEventListener('click', function () {
            qtyInput.value = Math.max(1, (parseInt(qtyInput.value, 10) || 1) - 1);
        });
        document.getElementById('qtyPlus').addEventListener('click', function () {
            qtyInput.value = (parseInt(qtyInput.value, 10) || 1) + 1;
        });

        // Reviews are shown inline here. Make sure we know if someone is
        // logged in before deciding whether to show the review form, and
        // re-render the form if they log in/out while on this page.
        await checkSession();
        await loadReviews(perfume.id);
        renderReviewForm(perfume.id);
        document.addEventListener('velora:auth', function () { renderReviewForm(perfume.id); });

        // "You may also like" — other perfumes from the same category.
        try {
            const sameCategory = await fetchPerfumes({ category: perfume.category });
            const related = sameCategory.filter(function (p) { return p.id !== perfume.id; }).slice(0, 4);
            if (related.length) {
                renderGrid(document.getElementById('relatedGrid'), related);
                document.getElementById('relatedSection').style.display = '';
            }
        } catch (err) {
            // Non-critical — the main product already loaded.
        }
    }

    /* ================= Floating AI Chat Widget (Aria) ================= */
    // Appears on every page since script.js runs on every page. Chat
    // history is kept in sessionStorage so it survives navigating between
    // pages in the same tab, but clears when the tab is closed.
    (function initChatWidget() {
        document.body.insertAdjacentHTML('beforeend', `
            <button type="button" class="chat-bubble" id="chatBubble" aria-label="Chat with Aria">
                <i class="fa-solid fa-comments"></i>
            </button>
            <div class="chat-panel" id="chatPanel">
                <div class="chat-header">
                    <span><i class="fa-solid fa-wand-magic-sparkles"></i> Aria — Fragrance Concierge</span>
                    <button type="button" id="chatCloseBtn" aria-label="Close chat">&times;</button>
                </div>
                <div class="chat-messages" id="chatMessages"></div>
                <form class="chat-input-row" id="chatForm">
                    <input type="text" id="chatInput" placeholder="Ask about a scent, occasion, budget..." autocomplete="off">
                    <button type="submit" aria-label="Send"><i class="fa-solid fa-paper-plane"></i></button>
                </form>
            </div>
        `);

        const bubble = document.getElementById('chatBubble');
        const chatPanel = document.getElementById('chatPanel');
        const messagesEl = document.getElementById('chatMessages');
        const chatForm = document.getElementById('chatForm');
        const chatInput = document.getElementById('chatInput');

        function loadChatHistory() {
            try { return JSON.parse(sessionStorage.getItem('veloraChatHistory')) || []; }
            catch (err) { return []; }
        }
        function saveChatHistory(history) {
            sessionStorage.setItem('veloraChatHistory', JSON.stringify(history));
        }

        let chatHistory = loadChatHistory();

        function appendMessage(role, text) {
            const bubbleEl = document.createElement('div');
            bubbleEl.className = 'chat-message ' + role;
            bubbleEl.textContent = text;
            messagesEl.appendChild(bubbleEl);
            messagesEl.scrollTop = messagesEl.scrollHeight;
            return bubbleEl;
        }

        function renderHistory() {
            messagesEl.innerHTML = '';
            if (!chatHistory.length) {
                appendMessage('assistant', "Hi! I'm Aria, your fragrance concierge. Ask me anything — a scent, an occasion, a budget — and I'll point you to something from our collection. 🌸");
            } else {
                chatHistory.forEach(function (turn) { appendMessage(turn.role, turn.content); });
            }
        }

        renderHistory();

        bubble.addEventListener('click', function () {
            chatPanel.classList.toggle('open');
            if (chatPanel.classList.contains('open')) chatInput.focus();
        });
        document.getElementById('chatCloseBtn').addEventListener('click', function () {
            chatPanel.classList.remove('open');
        });

        chatForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const message = chatInput.value.trim();
            if (!message) return;

            appendMessage('user', message);
            chatInput.value = '';
            chatInput.disabled = true;

            const typingEl = appendMessage('assistant', 'typing...');
            typingEl.classList.add('typing');

            try {
                const res = await fetch(API_BASE + '/chat/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: message, history: chatHistory }),
                });
                const data = await res.json();
                typingEl.remove();

                if (!res.ok) {
                    appendMessage('assistant', data.error || "Sorry, something went wrong.");
                } else {
                    appendMessage('assistant', data.reply);
                    chatHistory.push({ role: 'user', content: message });
                    chatHistory.push({ role: 'assistant', content: data.reply });
                    saveChatHistory(chatHistory);
                }
            } catch (err) {
                typingEl.remove();
                appendMessage('assistant', "Sorry, I couldn't connect. Please check your connection and try again.");
            } finally {
                chatInput.disabled = false;
                chatInput.focus();
            }
        });
    })();

    /* ================= Other forms (stop page reload) ================= */
    ['newsletter-form', 'contactform'].forEach(function (id) {
        const form = document.getElementById(id);
        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                toast('Thank you! Your submission was received.');
                form.reset();
            });
        }
    });

    const footerForm = document.querySelector('.footer-form');
    if (footerForm) {
        footerForm.addEventListener('submit', function (e) {
            e.preventDefault();
            toast('Thanks for subscribing!');
            footerForm.reset();
        });
    }
});
