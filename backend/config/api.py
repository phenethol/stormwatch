from django.middleware.csrf import get_token
from ninja import NinjaAPI, Status
from ninja.security import django_auth

api = NinjaAPI(title="StormWatch API", version="0.1.0", auth=django_auth)


@api.get("/auth/csrf", auth=None, response={204: None})
def get_csrf(request):
    """Postavlja kolačić csrftoken (OpenAPI: getCsrfCookie)."""
    get_token(request)  # CsrfViewMiddleware zatim dodaje kolačić u odgovor
    return Status(204, None)
