from django.urls import path

from . import views

urlpatterns = [
    path("search/", views.PerfumeSearchView.as_view(), name="search_perfumes"),
    path("perfumes/", views.PerfumeListView.as_view(), name="list_perfumes"),
    path("perfumes/<int:perfume_id>/", views.PerfumeDetailView.as_view(), name="perfume_detail"),
    path("perfumes/<int:perfume_id>/reviews/", views.PerfumeReviewListCreateView.as_view(), name="perfume_reviews"),
    path("chat/", views.ChatView.as_view(), name="chat"),
]
