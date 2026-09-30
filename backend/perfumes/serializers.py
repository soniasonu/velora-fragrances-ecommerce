from rest_framework import serializers

from .models import Perfume, Review


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ["id", "perfume", "user_name", "rating", "comment", "created_at"]
        read_only_fields = ["id", "user_name", "created_at"]

    def get_user_name(self, obj):
        return obj.user.first_name or obj.user.username.split("@")[0]

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value


class PerfumeSerializer(serializers.ModelSerializer):
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Perfume
        fields = [
            "id", "name", "category", "description", "notes", "price",
            "image", "is_bestseller", "average_rating", "review_count",
        ]

    def get_average_rating(self, obj):
        reviews = obj.reviews.all()
        if not reviews:
            return None
        return round(sum(r.rating for r in reviews) / len(reviews), 1)

    def get_review_count(self, obj):
        return obj.reviews.count()
