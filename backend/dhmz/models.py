from django.db import models


class Station(models.Model):
    """Mjerna postaja DHMZ-a. DHMZ u XML-u ne objavljuje šifru postaje, pa je ključ naziv."""

    name = models.CharField(max_length=100, unique=True)
    lat = models.DecimalField(max_digits=8, decimal_places=6)
    lon = models.DecimalField(max_digits=9, decimal_places=6)
    altitude_m = models.IntegerField(null=True, blank=True)  # XML je ne sadrži
    automatic = models.BooleanField(default=False)  # atribut autom="1"
    # posljednje mjerenje, da popis postaja ne traži najnovije mjerenje za svaku postaju posebno
    latest_measurement = models.ForeignKey(
        "Measurement", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Measurement(models.Model):
    """Jedno mjerenje postaje; povijest se čuva (F-026)."""

    station = models.ForeignKey(Station, on_delete=models.CASCADE, related_name="measurements")
    measured_at = models.DateTimeField()
    temperature_c = models.FloatField(null=True, blank=True)
    humidity_pct = models.FloatField(null=True, blank=True)
    pressure_hpa = models.FloatField(null=True, blank=True)
    wind_speed_ms = models.FloatField(null=True, blank=True)
    wind_direction = models.CharField(max_length=3, null=True, blank=True)  # npr. JZ (DR-03)

    class Meta:
        ordering = ["-measured_at"]
        constraints = [
            # isti termin preuzet dvaput ne stvara duplikat
            models.UniqueConstraint(fields=["station", "measured_at"], name="measurement_once_per_term"),
        ]

    def __str__(self):
        return f"{self.station} {self.measured_at:%d.%m.%Y. %H:%M}"


class FetchStatus(models.Model):
    """Ishod posljednjeg preuzimanja za svaki izvor (UC-023, korak 4 GET /data-status)."""

    class Source(models.TextChoices):
        MEASUREMENTS = "measurements", "Mjerenja"
        FORECASTS = "forecasts", "prognoze"
        WARNINGS = "warnings", "Upozorenja"

    class Result(models.TextChoices):
        SUCCESS = "success", "Uspjelo"
        FAILED = "failed", "nije uspjelo"

    source = models.CharField(max_length=20, choices=Source.choices, unique=True)
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    last_success_at = models.DateTimeField(null=True, blank=True)
    last_status = models.CharField(max_length=10, choices=Result.choices, null=True, blank=True)
    last_error = models.TextField(blank=True, default="")

    def __str__(self):
        return f"{self.get_source_display()}: {self.last_status or 'još nije preuzeto'}"