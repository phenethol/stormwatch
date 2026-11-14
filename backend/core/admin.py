

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class StormWatchUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("StormWatch", {"fields": ("bio", "reputation", "privacy_accepted_at")}),
    )
    readonly_fields = ("privacy_accepted_at", "last_login", "date_joined")
    list_display = ("username", "email", "is_active", "is_staff", "reputation")
    search_fields = ("username", "email")
