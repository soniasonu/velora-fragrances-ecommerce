from django.contrib import admin

from .models import Perfume, Review


@admin.register(Perfume)
class PerfumeAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "price", "is_bestseller")
    list_filter = ("category", "is_bestseller")
    list_editable = ("is_bestseller",)
    search_fields = ("name", "description", "notes")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("perfume", "user", "rating", "created_at")
    list_filter = ("rating",)
