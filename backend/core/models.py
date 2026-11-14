from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.db.models import Q, F
from datetime import timedelta

class User(AbstractUser):
    bio = models.CharField(max_length=300, blank=True)
    reputation = models.IntegerField(default=0)
    # Kada je korisnik pri prvoj prijavi potvrdio obavijest o privatnosti
    privacy_accepted_at = models.DateTimeField(null=True, blank=True)
    photo = models.ImageField(upload_to="profile_photos/", null=True, blank=True)
    is_trusted_observer = models.BooleanField(default=False)
    is_moderator = models.BooleanField(default=False)
    is_meteorologist = models.BooleanField(default=False)
    posting_banned_until = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)


class Phenomenon(models.TextChoices):
    HAIL = "hail", "Tuča"
    STORM_WIND = "storm_wind", "Olujni vjetar"
    HEAVY_RAIN_FLOOD = "heavy_rain_flood", "Jaka kiša i poplava"
    SNOW = "snow", "Snijeg"
    GLAZE_ICE = "glaze_ice", "Poledica"
    WATERSPOUT = "waterspout", "Pijavica"

class Intensity(models.TextChoices):
    PEA = "pea", "Grašak"
    HAZELNUT = "hazelnut", "Lješnjak"
    WALNUT = "walnut", "Orah"
    EGG = "egg", "Jaje"
    WEAK = "weak", "Slab"
    MODERATE = "moderate", "Umjeren"
    STRONG = "strong", "Jak"

# integritetska ograničenja u prijavi (validacija u input shemama)
HAIL_INTENSITIES = (Intensity.PEA, Intensity.HAZELNUT, Intensity.WALNUT, Intensity.EGG)
OTHER_INTENSITIES = (Intensity.WEAK, Intensity.MODERATE, Intensity.STRONG)

class Damage(models.TextChoices):
    NONE = "none", "Bez štete"
    MINOR = "minor", "Manja"
    SIGNIFICANT = "significant", "Znatna"
    MAJOR = "major", "Velika"

class LocationSource(models.TextChoices):
    GPS = "gps", "GPS"
    MAP = "map", "Odabrano na karti"

class ReportState(models.TextChoices):
    SUBMITTED = "submitted", "Predana"
    PENDING = "pending", "Na čekanju"
    CONFIRMED = "confirmed", "Potvrđena"
    REJECTED = "rejected", "Odbijena"

class Report(models.Model):
    author = models.ForeignKey(User, on_delete=models.PROTECT, related_name="reports")
    phenomenon = models.CharField(max_length=30, choices=Phenomenon.choices)
    intensity = models.CharField(max_length=10, choices=Intensity.choices)
    damage = models.CharField(max_length=12, choices=Damage.choices)
    lat = models.DecimalField(
        max_digits=8,
        decimal_places=6,
        validators=[MinValueValidator(-90), MaxValueValidator(90)],
    )
    lon = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        validators=[MinValueValidator(-180), MaxValueValidator(180)],
    )
    location_source = models.CharField(max_length=3, choices=LocationSource.choices, default=LocationSource.GPS)
    observed_at = models.DateTimeField()
    submitted_at = models.DateTimeField(auto_now_add=True)
    description = models.TextField(max_length=2000, blank=True, default="")
    state = models.CharField(max_length=20, default=ReportState.PENDING, choices=ReportState.choices)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                name="report_observed_at_window",
                condition=Q(observed_at__gte=F("submitted_at") - timedelta(hours=24))
                & Q(observed_at__lte=F("submitted_at") + timedelta(minutes=5)),
            ),
            models.CheckConstraint(
                name="report_intensity_matches_phenomenon",
                condition=(Q(phenomenon=Phenomenon.HAIL) & Q(intensity__in=HAIL_INTENSITIES))
                | (~Q(phenomenon=Phenomenon.HAIL) & Q(intensity__in=OTHER_INTENSITIES)),
            ),
        ]

    def __str__(self):
        return f"{self.phenomenon} - {self.intensity}"


# jedan report ima 1-5 slika, slika je obavezna (provjera u shemi)
class ReportPhoto(models.Model):
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name="photos")
    image = models.ImageField(
        upload_to="report_photos/",
        width_field="width",
        height_field="height",
    )
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"Fotografija {self.pk} prijave {self.report_id}"
