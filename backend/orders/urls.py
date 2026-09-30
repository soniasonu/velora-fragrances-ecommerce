from django.urls import path

from . import views

urlpatterns = [
    path("cart/", views.CartView.as_view(), name="cart"),
    path("cart/add/", views.CartAddView.as_view(), name="cart_add"),
    path("cart/update/", views.CartUpdateView.as_view(), name="cart_update"),
    path("cart/remove/", views.CartRemoveView.as_view(), name="cart_remove"),
    path("orders/checkout/", views.CheckoutView.as_view(), name="checkout"),
    path("orders/verify-payment/", views.VerifyPaymentView.as_view(), name="verify_payment"),
    path("orders/", views.OrderListView.as_view(), name="order_list"),
]
