from datetime import datetime, timedelta
from django.utils import timezone

from ninja import Schema

from core.models import Phenomenon, Intensity, Damage, LocationSource, ReportState, HAIL_INTENSITIES, OTHER_INTENSITIES
from dhmz.schemas import MeasurementOut
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


class ErrorOut(Schema):
    detail: str
    code: str | None = None


class GeoPointOut(Schema):
    lat: float
    lon: float


class UserSummaryOut(Schema):
    username: str | None
    photo_url: str | None
    is_trusted_observer: bool
    is_meteorologist: bool
    is_deleted: bool


class RegionRefOut(Schema):
    id: int
    name: str


class PhotoOut(Schema):
    id: int
    url: str
    thumbnail_url: str
    width: int | None
    height: int | None


class NearestMeasurementOut(Schema):
    station_id: int
    station_name: str
    distance_km: float
    measurement: MeasurementOut


class ReportSummaryOut(Schema):
    id: int
    phenomenon: Phenomenon
    intensity: Intensity
    location: GeoPointOut
    observed_at: datetime
    state: ReportState
    author: UserSummaryOut
    confirmations: int
    disputes: int
    credibility: float
    is_trusted_observer_report: bool
    is_valuable: bool
    event_id: int | None
    thumbnail_url: str | None
    comment_count: int
    updated_at: datetime


class ReportDetailOut(ReportSummaryOut):
    damage: Damage
    description: str | None
    photos: list[PhotoOut]
    submitted_at: datetime
    region: RegionRefOut | None
    nearest_measurement: NearestMeasurementOut | None
    rejection_reason: str | None
    my_vote: str | None
    can_vote: bool
    event_title: str | None
