from django.conf import settings
from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver


@receiver(user_logged_in)
def grant_admin(sender, request, user, **kwargs):
    """Google računi iz ADMIN_EMAILS pri prijavi postaju administratori (UC-020)."""
    if (user.email or "").lower() in settings.ADMIN_EMAILS and not user.is_superuser:
        user.is_staff = True
        user.is_superuser = True
        user.save(update_fields=["is_staff", "is_superuser"])