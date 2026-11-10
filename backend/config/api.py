from django.views.decorators.csrf import ensure_csrf_cookie
from ninja import NinjaAPI
from ninja.security import django_auth

api = NinjaAPI(title="StormWatch API", version="0.1.0", auth=django_auth)


@api.get("/auth/csrf", auth=None, response={204: None})
@ensure_csrf_cookie
def get_csrf(request):
    return 204, None