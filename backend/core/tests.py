import io
import shutil
import tempfile
from datetime import timedelta

from allauth.account.models import EmailAddress
from allauth.socialaccount.adapter import get_adapter
from allauth.socialaccount.models import SocialAccount, SocialLogin
from django.contrib import admin
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory, TestCase, override_settings
from django.utils import timezone
from PIL import Image

from .forms import PrivacySignupForm
from .models import Report, ReportPhoto, User
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


# ---------------------------------------------------------------- predaja prijave (PR-01)

URL = "/api/v1/reports"
MEDIA_ROOT = tempfile.mkdtemp()


def make_image(name="slika.png", size=(40, 30)):
    buf = io.BytesIO()
    Image.new("RGB", size, "blue").save(buf, format="PNG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/png")


@override_settings(MEDIA_ROOT=MEDIA_ROOT)
class CreateReportTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA_ROOT, ignore_errors=True)

    def setUp(self):
        self.user = User.objects.create_user(username="ana_motri", password="x")
        self.client.force_login(self.user)

    def data(self, **overrides):
        data = {
            "phenomenon": "hail",
            "intensity": "walnut",
            "damage": "minor",
            "observed_at": (timezone.now() - timedelta(minutes=10)).isoformat(),
            "lat": "45.3083",
            "lon": "18.4078",
            "description": "Tuča veličine oraha.",
            "photos": [make_image()],
        }
        data.update(overrides)
        return data

    def post(self, **overrides):
        return self.client.post(URL, self.data(**overrides))

    def assert_rejected(self, response, status=422):
        self.assertEqual(response.status_code, status, response.content)
        self.assertEqual(Report.objects.count(), 0)
        self.assertEqual(ReportPhoto.objects.count(), 0)

    # ---------------------------------------------------------------- uspjeh

    def test_valid_report_is_created(self):
        response = self.post()

        self.assertEqual(response.status_code, 201, response.content)
        body = response.json()
        self.assertEqual(body["phenomenon"], "hail")
        self.assertEqual(body["intensity"], "walnut")
        self.assertEqual(body["state"], "pending")
        self.assertEqual(body["location_source"], "gps")
        self.assertEqual(len(body["photos"]), 1)
        self.assertEqual(body["photos"][0]["width"], 40)
        self.assertEqual(body["photos"][0]["height"], 30)

        report = Report.objects.get()
        self.assertEqual(report.author, self.user)
        self.assertEqual(report.photos.count(), 1)

    def test_description_is_optional(self):
        data = self.data()
        del data["description"]
        response = self.client.post(URL, data)

        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(Report.objects.get().description, "")

    def test_other_phenomenon_with_weak_intensity(self):
        response = self.post(phenomenon="snow", intensity="weak")
        self.assertEqual(response.status_code, 201, response.content)

    def test_five_photos_allowed(self):
        response = self.post(photos=[make_image(f"s{i}.png") for i in range(5)])
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(ReportPhoto.objects.count(), 5)

    def test_observed_at_without_timezone_is_accepted(self):
        naive = timezone.localtime().replace(tzinfo=None) - timedelta(minutes=10)
        response = self.post(observed_at=naive.isoformat())
        self.assertEqual(response.status_code, 201, response.content)

    # ---------------------------------------------------------------- prijava korisnika

    def test_anonymous_user_gets_401(self):
        self.client.logout()
        self.assert_rejected(self.post(), status=401)

    # ---------------------------------------------------------------- PR-01

    def test_unknown_phenomenon(self):
        self.assert_rejected(self.post(phenomenon="tornado"))

    def test_hail_needs_grain_size(self):
        self.assert_rejected(self.post(phenomenon="hail", intensity="strong"))

    def test_other_phenomenon_rejects_grain_size(self):
        self.assert_rejected(self.post(phenomenon="snow", intensity="walnut"))

    def test_unknown_damage(self):
        self.assert_rejected(self.post(damage="huge"))

    def test_observed_more_than_24h_ago(self):
        old = timezone.now() - timedelta(hours=25)
        self.assert_rejected(self.post(observed_at=old.isoformat()))

    def test_observed_more_than_5min_in_future(self):
        future = timezone.now() + timedelta(minutes=10)
        self.assert_rejected(self.post(observed_at=future.isoformat()))

    def test_latitude_out_of_range(self):
        self.assert_rejected(self.post(lat="91"))

    def test_description_too_long(self):
        self.assert_rejected(self.post(description="a" * 2001))

    # ---------------------------------------------------------------- fotografije (P-03)

    def test_no_photos(self):
        data = self.data()
        del data["photos"]
        self.assert_rejected(self.client.post(URL, data))

    def test_six_photos(self):
        response = self.post(photos=[make_image(f"s{i}.png") for i in range(6)])
        self.assert_rejected(response)
        self.assertEqual(response.json()["detail"][0]["loc"], ["body", "photos"])

    def test_photo_too_large(self):
        big = SimpleUploadedFile("velika.jpg", b"0" * (10 * 1024 * 1024 + 1), content_type="image/jpeg")
        self.assert_rejected(self.post(photos=[big]), status=413)

    def test_wrong_file_type(self):
        pdf = SimpleUploadedFile("dokument.pdf", b"%PDF-1.4", content_type="application/pdf")
        self.assert_rejected(self.post(photos=[pdf]))
