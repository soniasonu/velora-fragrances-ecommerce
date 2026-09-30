from rest_framework.authentication import SessionAuthentication


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    DRF's default SessionAuthentication requires a CSRF token on every
    unsafe request (POST/PUT/DELETE), even when the person is already
    logged in via a session cookie. That's correct for a browser-rendered
    Django app, but our frontend is a separate static site calling the
    API with fetch() — wiring up CSRF tokens there adds real complexity
    for very little benefit on a portfolio project running over HTTP on
    localhost.

    This subclass keeps everything else about session auth (it still
    checks the session cookie, still populates request.user) but skips
    the CSRF check. Before deploying somewhere real /accepting untrusted
    traffic, either wire up proper CSRF tokens or switch to DRF token/JWT
    authentication instead.
    """

    def enforce_csrf(self, request):
        return  # intentionally do nothing
