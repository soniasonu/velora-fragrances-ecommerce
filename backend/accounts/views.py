import json

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST


def _user_dict(user):
    return {
        "id": user.id,
        "name": user.first_name or user.username.split("@")[0],
        "email": user.email,
    }


@csrf_exempt
@require_POST
def signup_view(request):
    """
    POST /api/auth/signup/
    Body: {"name": "Sonia", "email": "sonia@example.com", "password": "..."}

    Creates a real row in Django's auth_user table (MySQL), with the
    password hashed by Django — never stored in plain text.
    """
    try:
        body = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not email or not password:
        return JsonResponse({"error": "Email and password are required"}, status=400)
    if len(password) < 6:
        return JsonResponse({"error": "Password must be at least 6 characters"}, status=400)
    if User.objects.filter(username=email).exists():
        return JsonResponse({"error": "An account with this email already exists"}, status=409)

    user = User.objects.create_user(username=email, email=email, password=password)
    if name:
        user.first_name = name
        user.save()

    login(request, user)  # log them in immediately after signup
    return JsonResponse({"user": _user_dict(user)}, status=201)


@csrf_exempt
@require_POST
def login_view(request):
    """
    POST /api/auth/login/
    Body: {"email": "sonia@example.com", "password": "..."}
    """
    try:
        body = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    user = authenticate(request, username=email, password=password)
    if user is None:
        return JsonResponse({"error": "Incorrect email or password"}, status=401)

    login(request, user)
    return JsonResponse({"user": _user_dict(user)})


@csrf_exempt
@require_POST
def logout_view(request):
    """POST /api/auth/logout/ — clears the session."""
    logout(request)
    return JsonResponse({"ok": True})


@require_GET
def me_view(request):
    """
    GET /api/auth/me/
    Returns the logged-in user, or {"user": null} if no one is logged in.
    The frontend calls this on page load to know whether to show the
    account icon as logged in — this is what makes login persist across
    page refreshes and across index.html / collections.html.
    """
    if request.user.is_authenticated:
        return JsonResponse({"user": _user_dict(request.user)})
    return JsonResponse({"user": None})
