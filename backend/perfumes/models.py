from django.conf import settings
from django.db import models


class Perfume(models.Model):
    CATEGORY_CHOICES = [
        ("men", "For Men"),
        ("women", "For Women"),
        ("oud", "Oud"),
        ("gift", "Gift Sets"),
    ]

    name = models.CharField(max_length=200)
    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES)
    description = models.TextField(help_text="Shown on the product card")
    notes = models.CharField(
        max_length=255,
        blank=True,
        help_text="Comma-separated scent notes, e.g. 'woody, amber, spice'. "
        "Used by the AI search to match intent even when the exact "
        "word isn't in the description.",
    )
    price = models.DecimalField(max_digits=8, decimal_places=2)
    image = models.CharField(max_length=255, help_text="Path used by the frontend, e.g. image/him/d8.jpg")
    is_bestseller = models.BooleanField(
        default=False,
        help_text="Shown in the homepage 'Best Sellers' section when checked.",
    )

    class Meta:
        ordering = ["category", "name"]

    def __str__(self):
        return f"{self.name} (${self.price})"

    def as_dict(self):
        """Shape returned to the frontend — matches the product-card fields it already renders."""
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "description": self.description,
            "notes": self.notes,
            "price": float(self.price),
            "image": self.image,
            "is_bestseller": self.is_bestseller,
        }


class Review(models.Model):
    perfume = models.ForeignKey(Perfume, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField(help_text="1 to 5 stars")
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        # One review per person per perfume — resubmitting updates it instead
        # of stacking duplicate reviews.
        unique_together = ("perfume", "user")

    def __str__(self):
        return f"{self.user} rated {self.perfume} {self.rating}/5"
