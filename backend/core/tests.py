from django.test import TestCase

from allauth.account.models import EmailAddress
from allauth.socialaccount.adapter import get_adapter
from allauth.socialaccount.models import SocialAccount, SocialLogin
from django.contrib import admin
from django.core.exceptions import ValidationError
from django.test import RequestFactory, TestCase, override_settings

from .forms import PrivacySignupForm
from .models import User
from .validators import username_validators

SESSION_URL = "/_allauth/browser/v1/auth/session"
SIGNUP_URL = "/_allauth/browser/v1/auth/provider/signup"


def start_google_signup(client, email="ana@gmail.com"):
    """Stanje nakon povratka s Googlea za novog korisnika (registracija na čekanju)."""
    sociallogin = SocialLogin(
        user=User(email=email),
        account=SocialAccount(provider="google", uid="google-123", extra_data={"email": email}),
        email_addresses=[EmailAddress(email=email, verified=True, primary=True)],
        provider=get_adapter().get_provider(RequestFactory().get("/"), "google"),
    )
    sociallogin.state = {"process": "login", "next": "/?racun=povratak", "headless": True}
    session = client.session
    session["socialaccount_sociallogin"] = sociallogin.serialize()
    session.save()


class CsrfTests(TestCase):
    def test_csrf_returns_204_and_cookie(self):
        response = self.client.get("/api/v1/auth/csrf")
        self.assertEqual(response.status_code, 204)
        self.assertIn("csrftoken", response.cookies)


class SignupTests(TestCase):
    def test_pending_signup_is_reported_to_frontend(self):
        start_google_signup(self.client)
        response = self.client.get(SESSION_URL)
        self.assertEqual(response.status_code, 401)
        flows = response.json()["data"]["flows"]
        self.assertTrue(any(f["id"] == "provider_signup" and f.get("is_pending") for f in flows))

    def test_signup_requires_privacy_notice(self):
        start_google_signup(self.client)
        response = self.client.post(
            SIGNUP_URL, {"username": "ana_k"}, content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.exists())

    def test_signup_rejects_invalid_username(self):
        start_google_signup(self.client)
        response = self.client.post(
            SIGNUP_URL,
            {"username": "šime", "privacy_notice_accepted": True},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_signup_creates_user_with_google_email(self):
        start_google_signup(self.client)
        response = self.client.post(
            SIGNUP_URL,
            {"username": "ana_k", "privacy_notice_accepted": True},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        user = User.objects.get()
        self.assertEqual((user.username, user.email), ("ana_k", "ana@gmail.com"))
        self.assertIsNotNone(user.privacy_accepted_at)
        self.assertFalse(user.has_usable_password())  # NF-04: nema lozinke
        self.assertEqual(self.client.get(SESSION_URL).status_code, 200)  # prijavljen


class PrivacyFormTests(TestCase):
    def test_form_without_privacy_is_invalid(self):
        self.assertFalse(PrivacySignupForm(data={}).is_valid())

    def test_username_rule(self):
        validator = username_validators[0]
        for good in ("ana", "ana_k.2026", "ana-k"):
            validator(good)
        for bad in ("ab", "šime", "ime s razmakom", "x" * 31):
            with self.subTest(username=bad), self.assertRaises(ValidationError):
                validator(bad)


class AdminTests(TestCase):
    def test_user_is_registered_in_admin(self):
        self.assertTrue(admin.site.is_registered(User))

    def test_admin_login_redirects_to_frontend(self):
        response = self.client.get("/admin/login/")
        self.assertEqual(response.status_code, 302)
        self.assertIn("?racun=prijava", response["Location"])

    @override_settings(ADMIN_EMAILS=["admin@gmail.com"])
    def test_admin_email_becomes_admin_on_login(self):
        user = User.objects.create_user(username="admin", email="admin@gmail.com")
        self.client.force_login(user)  # šalje signal user_logged_in
        user.refresh_from_db()
        self.assertTrue(user.is_staff and user.is_superuser)
        self.assertEqual(self.client.get("/admin/").status_code, 200)

    def test_other_users_do_not_become_admin(self):
        user = User.objects.create_user(username="ana", email="ana@gmail.com")
        self.client.force_login(user)
        user.refresh_from_db()
        self.assertFalse(user.is_staff)
