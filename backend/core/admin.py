from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from core.models import Report, ReportPhoto, User


@admin.register(User)
class StormWatchUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("StormWatch", {
            "fields": (
                "bio", "photo", "reputation", "privacy_accepted_at",
                "is_trusted_observer", "is_moderator", "is_meteorologist",
                "posting_banned_until", "is_deleted",
            ),
        }),
    )
    readonly_fields = ("privacy_accepted_at", "last_login", "date_joined")
    list_display = ("username", "email", "is_active", "is_staff", "reputation")
    search_fields = ("username", "email")


class ReportPhotoInline(admin.TabularInline):
    model = ReportPhoto
    extra = 0
    readonly_fields = ("width", "height")


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("id", "phenomenon", "intensity", "damage", "author", "state", "observed_at")
    list_filter = ("phenomenon", "state", "damage")
    readonly_fields = ("submitted_at", "updated_at")
    inlines = [ReportPhotoInline]
