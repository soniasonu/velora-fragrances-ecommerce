from django.conf import settings
from django.db import models

from perfumes.models import Perfume


class Cart(models.Model):
    """One cart per logged-in user. Created automatically the first time
    they add something (see orders/views.py get_or_create_cart)."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cart")
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def total(self):
        return sum((item.subtotal for item in self.items.all()), 0)

    def __str__(self):
        return f"Cart for {self.user}"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    perfume = models.ForeignKey(Perfume, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ("cart", "perfume")

    @property
    def subtotal(self):
        return self.perfume.price * self.quantity

    def __str__(self):
        return f"{self.quantity} x {self.perfume.name}"


class Order(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending Payment"),
        ("paid", "Paid"),
        ("processing", "Processing"),   # used for Cash on Delivery orders
        ("failed", "Payment Failed"),
        ("cancelled", "Cancelled"),
    ]
    PAYMENT_METHOD_CHOICES = [
        ("card", "Card (Razorpay)"),
        ("cod", "Cash on Delivery"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders")
    total = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="pending")
    payment_method = models.CharField(max_length=6, choices=PAYMENT_METHOD_CHOICES, default="card")
    razorpay_order_id = models.CharField(max_length=255, blank=True)
    razorpay_payment_id = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Shipping address — snapshotted onto the order at checkout time, so
    # editing a user's saved address later never rewrites past orders.
    shipping_name = models.CharField(max_length=200, blank=True)
    shipping_phone = models.CharField(max_length=20, blank=True)
    shipping_address_line1 = models.CharField(max_length=255, blank=True)
    shipping_address_line2 = models.CharField(max_length=255, blank=True)
    shipping_city = models.CharField(max_length=100, blank=True)
    shipping_state = models.CharField(max_length=100, blank=True)
    shipping_pincode = models.CharField(max_length=12, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order #{self.id} ({self.user}) — {self.status}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    # Nullable + name/price snapshot: if a perfume is later edited or
    # deleted, past order records still show what was actually bought at
    # the price actually paid, instead of silently changing history.
    perfume = models.ForeignKey(Perfume, on_delete=models.SET_NULL, null=True, blank=True)
    perfume_name = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    quantity = models.PositiveIntegerField()

    @property
    def subtotal(self):
        return self.price * self.quantity

    def __str__(self):
        return f"{self.quantity} x {self.perfume_name}"
