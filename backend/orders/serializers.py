from rest_framework import serializers

from perfumes.serializers import PerfumeSerializer

from .models import Cart, CartItem, Order, OrderItem


class CartItemSerializer(serializers.ModelSerializer):
    perfume = PerfumeSerializer(read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ["id", "perfume", "quantity", "subtotal"]

    def get_subtotal(self, obj):
        return float(obj.subtotal)


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "items", "total"]

    def get_total(self, obj):
        return float(obj.total)


class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ["id", "perfume_name", "price", "quantity", "subtotal"]

    def get_subtotal(self, obj):
        return float(obj.subtotal)


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "total", "status", "payment_method", "created_at", "items",
            "shipping_name", "shipping_phone", "shipping_address_line1",
            "shipping_address_line2", "shipping_city", "shipping_state",
            "shipping_pincode",
        ]
