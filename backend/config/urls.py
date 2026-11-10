from django.contrib import admin
from django.urls import include, path

from .api import api

urlpatterns = [
    path("admin/", admin.site.urls),
    path("_allauth/", include("allauth.headless.urls")),
    path("accounts/", include("allauth.urls")),
    path("api/v1/", api.urls),
]