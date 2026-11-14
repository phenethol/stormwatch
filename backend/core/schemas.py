from datetime import datetime, timedelta
from django.utils import timezone

from ninja import Schema

from core.models import Phenomenon, Intensity, Damage, LocationSource, HAIL_INTENSITIES, OTHER_INTENSITIES
from pydantic import Field, model_validator

class ReportCreateIn(Schema):
    phenomenon: Phenomenon
    intensity: Intensity
    damage: Damage
    observed_at: datetime
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    location_source: LocationSource = LocationSource.GPS
    description: str = Field(default="", max_length=2000)

    @model_validator(mode="after")
    def check_pr01(self):
        # intenzitet mora odgovarati vrsti pojave
        allowed = HAIL_INTENSITIES if self.phenomenon == Phenomenon.HAIL else OTHER_INTENSITIES
        if self.intensity not in allowed:
            raise ValueError("Intenzitet ne odgovara vrsti pojave.")

        # vrijeme bez zone tumači se u zoni projekta (Europe/Zagreb)
        if timezone.is_naive(self.observed_at):
            self.observed_at = timezone.make_aware(self.observed_at)

        # najviše 24 h prije i 5 min nakon predaje
        now = timezone.now()
        if self.observed_at < now - timedelta(hours=24):
            raise ValueError("Vrijeme opažanja ne smije biti ranije od 24 h prije predaje.")
        if self.observed_at > now + timedelta(minutes=5):
            raise ValueError("Vrijeme opažanja ne smije biti više od 5 min nakon predaje.")
        return self


class PhotoOut(Schema):
    id: int
    url: str
    width: int | None
    height: int | None


class ReportOut(Schema):
    id: int
    phenomenon: str
    intensity: str
    damage: str
    lat: float
    lon: float
    location_source: str
    observed_at: datetime
    submitted_at: datetime
    description: str
    state: str
    photos: list[PhotoOut]
