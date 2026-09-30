import razorpay
from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from perfumes.models import Perfume

from .models import Cart, CartItem, Order, OrderItem
from .serializers import CartSerializer, OrderSerializer


def get_or_create_cart(user):
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


class CartView(APIView):
    """GET /api/cart/ — the logged-in user's cart."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart = get_or_create_cart(request.user)
        return Response(CartSerializer(cart).data)


class CartAddView(APIView):
    """POST /api/cart/add/  { "perfume_id": 3, "quantity": 1 }"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        perfume_id = request.data.get("perfume_id")
        quantity = int(request.data.get("quantity", 1))

        try:
            perfume = Perfume.objects.get(id=perfume_id)
        except (Perfume.DoesNotExist, TypeError, ValueError):
            return Response({"error": "Perfume not found"}, status=status.HTTP_404_NOT_FOUND)

        cart = get_or_create_cart(request.user)
        item, created = CartItem.objects.get_or_create(
            cart=cart, perfume=perfume, defaults={"quantity": quantity}
        )
        if not created:
            item.quantity += quantity
            item.save()

        return Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED)


class CartUpdateView(APIView):
    """POST /api/cart/update/  { "item_id": 5, "quantity": 3 }"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        item_id = request.data.get("item_id")
        quantity = request.data.get("quantity")

        try:
            item = CartItem.objects.get(id=item_id, cart__user=request.user)
        except CartItem.DoesNotExist:
            return Response({"error": "Cart item not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            return Response({"error": "quantity must be a number"}, status=status.HTTP_400_BAD_REQUEST)

        if quantity < 1:
            item.delete()
        else:
            item.quantity = quantity
            item.save()

        return Response(CartSerializer(item.cart if quantity >= 1 else get_or_create_cart(request.user)).data)


class CartRemoveView(APIView):
    """POST /api/cart/remove/  { "item_id": 5 }"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        item_id = request.data.get("item_id")
        CartItem.objects.filter(id=item_id, cart__user=request.user).delete()
        cart = get_or_create_cart(request.user)
        return Response(CartSerializer(cart).data)


class CheckoutView(APIView):
    """
    POST /api/orders/checkout/  { "payment_method": "card" | "cod" }

    Snapshots the current cart into an Order + OrderItems, then either:
    - "cod": marks the order as processing immediately (no online payment)
    - "card": creates a Razorpay Order (TEST MODE) and returns what the
      frontend needs to open Razorpay's Checkout popup. Razorpay collects
      the actual card details in its own hosted widget — we never see or
      store them.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        payment_method = request.data.get("payment_method", "card")
        if payment_method not in ("card", "cod"):
            return Response({"error": "payment_method must be 'card' or 'cod'"}, status=status.HTTP_400_BAD_REQUEST)

        address = request.data.get("address") or {}
        required_address_fields = {
            "name": "Full name",
            "phone": "Phone number",
            "address_line1": "Address",
            "city": "City",
            "state": "State",
            "pincode": "Pincode",
        }
        missing = [label for key, label in required_address_fields.items() if not str(address.get(key, "")).strip()]
        if missing:
            return Response(
                {"error": "Missing shipping details: " + ", ".join(missing)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cart = get_or_create_cart(request.user)
        cart_items = list(cart.items.select_related("perfume").all())
        if not cart_items:
            return Response({"error": "Your cart is empty"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            order = Order.objects.create(
                user=request.user,
                total=cart.total,
                payment_method=payment_method,
                status="pending",
                shipping_name=address.get("name", "").strip(),
                shipping_phone=address.get("phone", "").strip(),
                shipping_address_line1=address.get("address_line1", "").strip(),
                shipping_address_line2=address.get("address_line2", "").strip(),
                shipping_city=address.get("city", "").strip(),
                shipping_state=address.get("state", "").strip(),
                shipping_pincode=address.get("pincode", "").strip(),
            )
            for item in cart_items:
                OrderItem.objects.create(
                    order=order,
                    perfume=item.perfume,
                    perfume_name=item.perfume.name,
                    price=item.perfume.price,
                    quantity=item.quantity,
                )

        if payment_method == "cod":
            order.status = "processing"
            order.save()
            cart.items.all().delete()  # order placed — empty the cart
            return Response({"order": OrderSerializer(order).data})

        # payment_method == "card"
        if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
            order.delete()  # don't leave a dangling pending order
            return Response(
                {"error": "Card payment isn't configured yet. Add RAZORPAY_KEY_ID and "
                          "RAZORPAY_KEY_SECRET to .env, or choose Cash on Delivery instead."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        amount_paise = int(order.total * 100)  # Razorpay uses the smallest currency unit (paise for INR)

        try:
            razorpay_order = client.order.create({
                "amount": amount_paise,
                "currency": "INR",
                "receipt": f"order_{order.id}",
                "payment_capture": 1,  # auto-capture the payment once authorized
            })
        except Exception as exc:
            order.status = "failed"
            order.save()
            return Response({"error": f"Razorpay error: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)

        order.razorpay_order_id = razorpay_order["id"]
        order.save()

        # Everything the frontend needs to open Razorpay's Checkout popup.
        return Response({
            "order_id": order.id,
            "razorpay_order_id": razorpay_order["id"],
            "razorpay_key_id": settings.RAZORPAY_KEY_ID,
            "amount": amount_paise,
            "currency": "INR",
            "name": "Velora Fragrances",
            "prefill_email": request.user.email,
        })


class VerifyPaymentView(APIView):
    """
    POST /api/orders/verify-payment/
    Body: {
        "order_id": 12,                          <- our Order's id
        "razorpay_order_id": "order_ABC123",
        "razorpay_payment_id": "pay_XYZ789",
        "razorpay_signature": "..."
    }

    Called by the frontend right after Razorpay's popup reports success.
    Never trust that report alone — anyone could fake that JS callback —
    so this recomputes the signature server-side using our secret key and
    only marks the order paid if it matches. This check is a pure local
    HMAC computation, no network call to Razorpay needed, so it can't be
    slowed down or spoofed by a flaky connection.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("order_id")
        razorpay_order_id = request.data.get("razorpay_order_id")
        razorpay_payment_id = request.data.get("razorpay_payment_id")
        razorpay_signature = request.data.get("razorpay_signature")

        if not all([order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature]):
            return Response({"error": "Missing payment verification fields"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(id=order_id, user=request.user, razorpay_order_id=razorpay_order_id)
        except Order.DoesNotExist:
            return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

        if order.status == "paid":
            return Response({"order": OrderSerializer(order).data})  # already confirmed, idempotent

        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        try:
            client.utility.verify_payment_signature({
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            })
        except razorpay.errors.SignatureVerificationError:
            order.status = "failed"
            order.save()
            return Response({"error": "Payment verification failed"}, status=status.HTTP_400_BAD_REQUEST)

        order.status = "paid"
        order.razorpay_payment_id = razorpay_payment_id
        order.save()
        get_or_create_cart(request.user).items.all().delete()

        return Response({"order": OrderSerializer(order).data})


class OrderListView(APIView):
    """GET /api/orders/ — the logged-in user's order history, newest first."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = Order.objects.filter(user=request.user)
        return Response({"count": orders.count(), "results": OrderSerializer(orders, many=True).data})
