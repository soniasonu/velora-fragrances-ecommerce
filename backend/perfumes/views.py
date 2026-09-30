from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .ai_search import get_search_filters
from .chat import get_chat_reply
from .models import Perfume, Review
from .serializers import PerfumeSerializer, ReviewSerializer

STOPWORDS = {
    "a", "an", "the", "for", "with", "under", "over", "and", "or", "of",
    "to", "in", "on", "is", "are", "i", "me", "my", "want", "need",
    "find", "show", "something", "please", "perfume", "perfumes",
    "fragrance", "scent",
}


def search_perfumes_queryset(query, filters):
    """
    Shared by PerfumeSearchView (exact search results) and ChatView
    (grounding context for the AI assistant) — both need "which real
    perfumes match this sentence", just for different purposes.
    """
    qs = Perfume.objects.all()

    if filters.get("category") in dict(Perfume.CATEGORY_CHOICES):
        qs = qs.filter(category=filters["category"])
    if filters.get("max_price") is not None:
        qs = qs.filter(price__lte=filters["max_price"])
    if filters.get("min_price") is not None:
        qs = qs.filter(price__gte=filters["min_price"])

    for keyword in filters.get("keywords", []):
        keyword = keyword.strip().lower()
        if not keyword:
            continue
        variants = {keyword}
        if keyword.endswith("y") and len(keyword) > 4:
            variants.add(keyword[:-1])
        if keyword.endswith("ies"):
            variants.add(keyword[:-3] + "y")
        if keyword.endswith("s") and not keyword.endswith("ss"):
            variants.add(keyword[:-1])
        if keyword.endswith("ed"):
            variants.add(keyword[:-2])
        keyword_q = Q()
        for v in variants:
            keyword_q |= (
                Q(name__icontains=v) | Q(description__icontains=v) | Q(notes__icontains=v)
            )
        qs = qs.filter(keyword_q)

    if qs.exists():
        return qs

    # Nothing matched the strict filters — fall back to a loose OR search
    # across the raw query words, so a shopper's odd phrasing still finds
    # something instead of an empty result.
    loose_qs = Perfume.objects.none()
    matched_any_word = False
    for word in query.split():
        word = word.strip(",.!?$").lower()
        if len(word) < 3 or word in STOPWORDS or word.isdigit():
            continue
        matched_any_word = True
        variants = {word}
        if word.endswith("y") and len(word) > 4:
            variants.add(word[:-1])
        if word.endswith("s") and not word.endswith("ss"):
            variants.add(word[:-1])
        word_q = Q()
        for v in variants:
            word_q |= (
                Q(name__icontains=v) | Q(description__icontains=v)
                | Q(notes__icontains=v) | Q(category__icontains=v)
            )
        loose_qs = loose_qs | Perfume.objects.filter(word_q)

    return loose_qs.distinct() if matched_any_word else Perfume.objects.none()


class PerfumeDetailView(APIView):
    """GET /api/perfumes/<id>/ — one product, used by the product detail page."""

    def get(self, request, perfume_id):
        try:
            perfume = Perfume.objects.get(id=perfume_id)
        except Perfume.DoesNotExist:
            return Response({"error": "Perfume not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(PerfumeSerializer(perfume).data)


class PerfumeListView(APIView):
    """
    GET /api/perfumes/
    GET /api/perfumes/?category=men
    GET /api/perfumes/?is_bestseller=true
    """

    def get(self, request):
        qs = Perfume.objects.all()

        category = request.GET.get("category")
        if category:
            qs = qs.filter(category=category)

        is_bestseller = request.GET.get("is_bestseller")
        if is_bestseller is not None:
            qs = qs.filter(is_bestseller=(is_bestseller.lower() == "true"))

        serializer = PerfumeSerializer(qs, many=True)
        return Response({"count": qs.count(), "results": serializer.data})


class PerfumeSearchView(APIView):
    """
    POST /api/search/
    Body: {"query": "woody perfume for office under $100"}

    Turns a sentence into filters via the AI layer (perfumes/ai_search.py),
    then queries MySQL through the ORM — same behaviour as before, just
    expressed as a DRF view so it's consistent with the rest of the API.
    """

    def post(self, request):
        query = (request.data.get("query") or "").strip()
        if not query:
            return Response({"error": "Missing 'query'"}, status=status.HTTP_400_BAD_REQUEST)

        filters = get_search_filters(query)
        results_qs = search_perfumes_queryset(query, filters)

        serializer = PerfumeSerializer(results_qs, many=True)
        return Response({
            "query": query,
            "filters": filters,
            "count": results_qs.count(),
            "results": serializer.data,
        })


class ChatView(APIView):
    """
    POST /api/chat/
    Body: {
        "message": "what's good for a summer date night?",
        "history": [{"role": "user"|"assistant", "content": "..."}, ...]
    }

    Powers the floating chat widget. Finds real products relevant to the
    message first, then asks the AI to reply using only those — never
    an open-ended answer that could invent products we don't sell.
    """

    def post(self, request):
        message = (request.data.get("message") or "").strip()
        if not message:
            return Response({"error": "Missing 'message'"}, status=status.HTTP_400_BAD_REQUEST)

        history = request.data.get("history") or []
        if not isinstance(history, list):
            history = []

        filters = get_search_filters(message)
        matched = list(search_perfumes_queryset(message, filters)[:5])
        total_catalog_count = Perfume.objects.count()

        reply = get_chat_reply(message, history, matched, total_catalog_count)

        return Response({
            "reply": reply,
            "matched_products": PerfumeSerializer(matched, many=True).data,
        })


class PerfumeReviewListCreateView(APIView):
    """
    GET  /api/perfumes/<perfume_id>/reviews/   -> list reviews for a perfume
    POST /api/perfumes/<perfume_id>/reviews/   -> submit/update your review (login required)
    """

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return []

    def get(self, request, perfume_id):
        reviews = Review.objects.filter(perfume_id=perfume_id)
        serializer = ReviewSerializer(reviews, many=True)
        return Response({"count": reviews.count(), "results": serializer.data})

    def post(self, request, perfume_id):
        try:
            perfume = Perfume.objects.get(id=perfume_id)
        except Perfume.DoesNotExist:
            return Response({"error": "Perfume not found"}, status=status.HTTP_404_NOT_FOUND)

        rating = request.data.get("rating")
        comment = request.data.get("comment", "")

        if rating is None:
            return Response({"error": "rating is required"}, status=status.HTTP_400_BAD_REQUEST)

        # One review per user per perfume — update_or_create means submitting
        # again just edits their existing review instead of erroring.
        review, _ = Review.objects.update_or_create(
            perfume=perfume,
            user=request.user,
            defaults={"rating": rating, "comment": comment},
        )
        serializer = ReviewSerializer(review)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
