import io
import shutil
import tempfile
from datetime import datetime, timedelta

import yaml
from allauth.account.models import EmailAddress
from allauth.socialaccount.adapter import get_adapter
from allauth.socialaccount.models import SocialAccount, SocialLogin
from django.conf import settings
from django.contrib import admin
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory, TestCase, override_settings
from django.utils import timezone
from PIL import Image

from dhmz.models import Measurement, Station

from .forms import PrivacySignupForm
from .measurements import distance_km, find_nearest_measurement
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
OPENAPI_SCHEMAS = yaml.safe_load(
    (settings.BASE_DIR.parent / "docs" / "api" / "openapi.yaml").read_text(encoding="utf-8")
)["components"]["schemas"]


def openapi_required(name):
    schema = OPENAPI_SCHEMAS[name]
    parts = schema.get("allOf", [schema])
    required = set()
    for part in parts:
        if "$ref" in part:
            required |= openapi_required(part["$ref"].rsplit("/", 1)[-1])
        required |= set(part.get("required", []))
    return required
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
        report = Report.objects.get()
        self.assertEqual(report.author, self.user)
        self.assertEqual(report.photos.count(), 1)
        self.assertEqual(response["Location"], f"/api/v1/reports/{report.id}")

        body = response.json()
        self.assertEqual(body["id"], report.id)
        self.assertEqual(body["phenomenon"], "hail")
        self.assertEqual(body["intensity"], "walnut")
        self.assertEqual(body["damage"], "minor")
        self.assertEqual(body["state"], "pending")
        self.assertEqual(body["location"], {"lat": 45.3083, "lon": 18.4078})
        self.assertEqual(body["description"], "Tuča veličine oraha.")
        self.assertEqual(body["author"]["username"], "ana_motri")
        self.assertEqual(body["confirmations"], 0)
        self.assertEqual(body["disputes"], 0)
        self.assertEqual(body["credibility"], 50.0)
        self.assertFalse(body["can_vote"])
        self.assertIsNone(body["my_vote"])
        self.assertIsNone(body["nearest_measurement"])
        self.assertEqual(len(body["photos"]), 1)
        self.assertEqual(body["photos"][0]["width"], 40)
        self.assertEqual(body["photos"][0]["height"], 30)
        self.assertEqual(body["thumbnail_url"], body["photos"][0]["url"])

    def test_response_matches_openapi_report_detail(self):
        body = self.post().json()

        self.assertTrue(openapi_required("ReportDetail") <= body.keys())
        self.assertTrue(openapi_required("UserSummary") <= body["author"].keys())
        self.assertTrue(openapi_required("Photo") <= body["photos"][0].keys())

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
        response = self.post()
        self.assert_rejected(response, status=401)
        self.assertEqual(response.json(), {"detail": "Unauthorized"})

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
        response = self.post(photos=[big])
        self.assert_rejected(response, status=413)
        self.assertEqual(response.json(), {"detail": "Fotografija je veća od 10 MB.", "code": "photo_too_large"})

    def test_wrong_file_type(self):
        pdf = SimpleUploadedFile("dokument.pdf", b"%PDF-1.4", content_type="application/pdf")
        self.assert_rejected(self.post(photos=[pdf]))

    def test_fake_image_with_image_content_type(self):
        fake = SimpleUploadedFile("slika.jpg", b"ovo nije slika", content_type="image/jpeg")
        self.assert_rejected(self.post(photos=[fake]))

    def test_exif_is_removed(self):
        exif = Image.Exif()
        exif[0x010F] = "Kamera"
        exif[0x8825] = {2: (45.0, 48.0, 0.0), 4: (15.0, 58.0, 0.0)}
        buf = io.BytesIO()
        Image.new("RGB", (40, 30), "red").save(buf, format="JPEG", exif=exif)
        photo = SimpleUploadedFile("gps.jpg", buf.getvalue(), content_type="image/jpeg")

        response = self.post(photos=[photo])

        self.assertEqual(response.status_code, 201, response.content)
        stored = ReportPhoto.objects.get()
        with Image.open(stored.image.path) as image:
            self.assertEqual(image.format, "JPEG")
            self.assertEqual(len(image.getexif()), 0)

    def test_exif_orientation_is_applied(self):
        exif = Image.Exif()
        exif[0x0112] = 6
        buf = io.BytesIO()
        Image.new("RGB", (40, 30), "red").save(buf, format="JPEG", exif=exif)
        photo = SimpleUploadedFile("okrenuta.jpg", buf.getvalue(), content_type="image/jpeg")

        response = self.post(photos=[photo])

        self.assertEqual(response.status_code, 201, response.content)
        stored = ReportPhoto.objects.get()
        self.assertEqual((stored.width, stored.height), (30, 40))

    def test_heic_is_converted_to_jpeg(self):
        buf = io.BytesIO()
        Image.new("RGB", (40, 30), "green").save(buf, format="HEIF")
        photo = SimpleUploadedFile("iphone.heic", buf.getvalue(), content_type="image/heic")

        response = self.post(photos=[photo])

        self.assertEqual(response.status_code, 201, response.content)
        stored = ReportPhoto.objects.get()
        self.assertTrue(stored.image.name.endswith(".jpg"))
        with Image.open(stored.image.path) as image:
            self.assertEqual(image.format, "JPEG")

    def test_png_stays_png(self):
        response = self.post()

        self.assertEqual(response.status_code, 201, response.content)
        stored = ReportPhoto.objects.get()
        with Image.open(stored.image.path) as image:
            self.assertEqual(image.format, "PNG")

    def test_banned_user_gets_403_with_code(self):
        self.user.posting_banned_until = timezone.make_aware(datetime(2099, 1, 2, 8, 30))
        self.user.save()

        response = self.post()

        self.assert_rejected(response, status=403)
        self.assertEqual(
            response.json(),
            {"detail": "Objavljivanje vam je zabranjeno do 2. 1. 2099. 08:30.", "code": "posting_banned"},
        )

    def test_expired_ban_allows_posting(self):
        self.user.posting_banned_until = timezone.now() - timedelta(minutes=1)
        self.user.save()

        response = self.post()

        self.assertEqual(response.status_code, 201, response.content)

    def test_trusted_observer_report_is_confirmed(self):
        self.user.is_trusted_observer = True
        self.user.save()

        response = self.post()

        self.assertEqual(response.status_code, 201, response.content)
        report = Report.objects.get()
        self.assertEqual(report.state, "confirmed")
        self.assertTrue(report.is_trusted_observer_report)

    def test_regular_report_is_pending(self):
        self.post()

        report = Report.objects.get()
        self.assertEqual(report.state, "pending")
        self.assertFalse(report.is_trusted_observer_report)

    def test_nearest_measurement_is_stored(self):
        station = Station.objects.create(name="Zagreb-Grič", lat="45.8144", lon="15.9726")
        measurement = Measurement.objects.create(
            station=station, measured_at=timezone.now() - timedelta(minutes=20), temperature_c=12.5
        )

        response = self.post(lat="45.81", lon="15.98")

        self.assertEqual(response.status_code, 201, response.content)
        report = Report.objects.get()
        self.assertEqual(report.nearest_measurement, measurement)
        self.assertAlmostEqual(report.nearest_distance_km, 0.75, places=2)
        nearest = response.json()["nearest_measurement"]
        self.assertEqual(nearest["station_id"], station.id)
        self.assertEqual(nearest["station_name"], "Zagreb-Grič")
        self.assertEqual(nearest["distance_km"], 0.75)
        self.assertEqual(nearest["measurement"]["temperature_c"], 12.5)
        self.assertEqual(nearest["measurement"]["source"], "DHMZ")
        self.assertTrue(openapi_required("NearestMeasurement") <= nearest.keys())

    def test_no_measurement_nearby(self):
        response = self.post(lat="45.81", lon="15.98")

        self.assertEqual(response.status_code, 201, response.content)
        report = Report.objects.get()
        self.assertIsNone(report.nearest_measurement)
        self.assertIsNone(report.nearest_distance_km)


class NearestMeasurementTests(TestCase):
    def setUp(self):
        self.observed_at = timezone.now()
        self.gric = Station.objects.create(name="Zagreb-Grič", lat="45.8144", lon="15.9726")
        self.maksimir = Station.objects.create(name="Zagreb-Maksimir", lat="45.8222", lon="16.0336")
        self.rijeka = Station.objects.create(name="Rijeka", lat="45.3369", lon="14.4425")

    def measure(self, station, minutes):
        return Measurement.objects.create(station=station, measured_at=self.observed_at + timedelta(minutes=minutes))

    def find(self):
        return find_nearest_measurement(45.81, 15.98, self.observed_at)

    def test_closest_station_wins(self):
        gric = self.measure(self.gric, -50)
        self.measure(self.maksimir, 0)

        measurement, distance = self.find()

        self.assertEqual(measurement, gric)
        self.assertLess(distance, 1)

    def test_closest_measurement_in_time_for_same_station(self):
        self.measure(self.gric, -50)
        closer = self.measure(self.gric, 10)

        measurement, _ = self.find()

        self.assertEqual(measurement, closer)

    def test_measurement_outside_time_window_is_ignored(self):
        self.measure(self.gric, -61)
        self.measure(self.gric, 61)
        maksimir = self.measure(self.maksimir, 60)

        measurement, _ = self.find()

        self.assertEqual(measurement, maksimir)

    def test_station_further_than_50_km_is_ignored(self):
        self.measure(self.rijeka, 0)

        self.assertEqual(self.find(), (None, None))

    def test_distance_is_great_circle(self):
        self.assertAlmostEqual(distance_km(45.8144, 15.9726, 45.3369, 14.4425), 130.6, delta=1)


def make_report(author, state="confirmed", minutes_ago=10, **fields):
    data = {
        "phenomenon": "hail",
        "intensity": "walnut",
        "damage": "minor",
        "lat": "45.81",
        "lon": "15.98",
        "observed_at": timezone.now() - timedelta(minutes=minutes_ago),
    }
    data.update(fields)
    return Report.objects.create(author=author, state=state, **data)


class ListReportsTests(TestCase):
    def setUp(self):
        self.ana = User.objects.create_user(username="ana_motri")
        self.marko = User.objects.create_user(username="marko")
        self.admin = User.objects.create_user(username="admin", is_staff=True)
        self.reports = {
            state: make_report(self.marko, state=state, minutes_ago=minutes)
            for minutes, state in enumerate(["submitted", "pending", "confirmed", "rejected"], start=10)
        }

    def ids(self, response):
        self.assertEqual(response.status_code, 200, response.content)
        return {item["id"] for item in response.json()["items"]}

    def test_visitor_sees_only_confirmed(self):
        response = self.client.get(URL)

        self.assertEqual(self.ids(response), {self.reports["confirmed"].id})

    def test_user_sees_pending_and_confirmed(self):
        self.client.force_login(self.ana)

        ids = self.ids(self.client.get(URL))

        self.assertEqual(ids, {self.reports["pending"].id, self.reports["confirmed"].id})

    def test_author_sees_all_own_reports(self):
        self.client.force_login(self.marko)

        self.assertEqual(self.ids(self.client.get(URL)), {r.id for r in self.reports.values()})

    def test_admin_sees_everything(self):
        self.client.force_login(self.admin)

        self.assertEqual(len(self.ids(self.client.get(URL))), 4)

    def test_newest_observation_first_with_pagination(self):
        self.client.force_login(self.marko)

        response = self.client.get(URL, {"limit": 2, "offset": 1})

        body = response.json()
        self.assertEqual(body["count"], 4)
        self.assertEqual(
            [item["id"] for item in body["items"]],
            [self.reports["pending"].id, self.reports["confirmed"].id],
        )

    def test_response_matches_openapi_report_page(self):
        body = self.client.get(URL).json()

        self.assertTrue(openapi_required("ReportPage") <= body.keys())
        self.assertTrue(openapi_required("ReportSummary") <= body["items"][0].keys())

    def test_phenomenon_filter_accepts_several_values(self):
        snow = make_report(self.marko, phenomenon="snow", intensity="weak")
        storm = make_report(self.marko, phenomenon="storm_wind", intensity="strong")

        response = self.client.get(f"{URL}?phenomenon=snow&phenomenon=storm_wind")

        self.assertEqual(self.ids(response), {snow.id, storm.id})

    def test_unknown_phenomenon_is_rejected(self):
        self.assertEqual(self.client.get(URL, {"phenomenon": "tornado"}).status_code, 422)

    def test_observed_period_filter(self):
        old = make_report(self.marko, minutes_ago=600)

        response = self.client.get(URL, {"observed_to": (timezone.now() - timedelta(hours=5)).isoformat()})

        self.assertEqual(self.ids(response), {old.id})

    def test_bbox_filter(self):
        rijeka = make_report(self.marko, lat="45.33", lon="14.44")

        response = self.client.get(URL, {"bbox": "14.0,45.0,15.0,46.0"})

        self.assertEqual(self.ids(response), {rijeka.id})

    def test_invalid_bbox_is_rejected(self):
        self.assertEqual(self.client.get(URL, {"bbox": "zagreb"}).status_code, 422)

    def test_valuable_only(self):
        valuable = make_report(self.marko, is_valuable=True)

        self.assertEqual(self.ids(self.client.get(URL, {"valuable_only": "true"})), {valuable.id})

    def test_region_and_event_filters_return_nothing_until_implemented(self):
        self.assertEqual(self.ids(self.client.get(URL, {"region_id": 1})), set())
        self.assertEqual(self.ids(self.client.get(URL, {"event_id": 1})), set())

    def test_limit_above_500_is_rejected(self):
        self.assertEqual(self.client.get(URL, {"limit": 501}).status_code, 422)

    def test_include_deleted_requires_admin(self):
        self.client.force_login(self.ana)

        response = self.client.get(URL, {"include_deleted": "true"})

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["code"], "admin_only")

    def test_updated_since_returns_changes_and_removed_ids(self):
        Report.objects.update(updated_at=timezone.now() - timedelta(hours=1))
        first = self.client.get(URL).json()
        pending = self.reports["pending"]
        pending.state = "confirmed"
        pending.save()
        confirmed = self.reports["confirmed"]
        confirmed.state = "rejected"
        confirmed.save()

        body = self.client.get(URL, {"updated_since": first["server_time"]}).json()

        self.assertEqual([item["id"] for item in body["items"]], [pending.id])
        self.assertEqual(body["removed_ids"], [confirmed.id])


class ReportDetailTests(TestCase):
    def setUp(self):
        self.ana = User.objects.create_user(username="ana_motri")
        self.marko = User.objects.create_user(username="marko")
        self.pending = make_report(self.marko, state="pending")
        self.rejected = make_report(self.marko, state="rejected", rejection_reason="Fotografija nije s mjesta događaja.")

    def get(self, report):
        return self.client.get(f"{URL}/{report.id}")

    def test_visible_report(self):
        self.client.force_login(self.ana)

        response = self.get(self.pending)

        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        self.assertEqual(body["id"], self.pending.id)
        self.assertTrue(openapi_required("ReportDetail") <= body.keys())

    def test_hidden_report_is_404(self):
        self.client.force_login(self.ana)

        response = self.get(self.rejected)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "Not Found"})

    def test_visitor_cannot_see_pending(self):
        self.assertEqual(self.get(self.pending).status_code, 404)

    def test_missing_report_is_404(self):
        self.assertEqual(self.client.get(f"{URL}/999999").status_code, 404)

    def test_author_sees_rejection_reason(self):
        self.client.force_login(self.marko)

        body = self.get(self.rejected).json()

        self.assertEqual(body["rejection_reason"], "Fotografija nije s mjesta događaja.")
        self.assertFalse(body["can_vote"])

    def test_other_user_can_vote_on_pending(self):
        self.client.force_login(self.ana)

        self.assertTrue(self.get(self.pending).json()["can_vote"])

    def test_author_cannot_vote_on_own_report(self):
        self.client.force_login(self.marko)

        self.assertFalse(self.get(self.pending).json()["can_vote"])

    def test_deleted_author_has_no_username(self):
        confirmed = make_report(self.marko)
        self.marko.is_deleted = True
        self.marko.save()

        author = self.get(confirmed).json()["author"]

        self.assertIsNone(author["username"])
        self.assertTrue(author["is_deleted"])

