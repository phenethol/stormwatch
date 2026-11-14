from django import forms
from django.utils import timezone


class PrivacySignupForm(forms.Form):
    """Dodatno polje pri prvoj prijavi Google računom za prihvaćanje politike privatnosti


        """

    privacy_notice_accepted = forms.BooleanField(required=True)

    def signup(self, request, user):
        user.privacy_accepted_at = timezone.now()
        user.save(update_fields=["privacy_accepted_at"])