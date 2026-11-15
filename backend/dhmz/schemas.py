from datetime import datetime
from typing import Literal

from ninja import Schema


class GeoPointOut(Schema):
    lat: float
    lon: float


class MeasurementOut(Schema):
    measured_at: datetime
    temperature_c: float | None
    humidity_pct: float | None
    pressure_hpa: float | None
    wind_speed_ms: float | None
    wind_direction: str | None
    source: Literal["DHMZ"] = "DHMZ"  # frontend uz podatak prikazuje „Izvor: DHMZ” (NF-08)


class StationOut(Schema):
    id: int
    name: str
    location: GeoPointOut
    altitude_m: int | None
    region_id: int | None = None  # regije još ne postoje (odstupanje od ugovora u prvoj inačici)
    latest_measurement: MeasurementOut | None

    @staticmethod
    def resolve_location(obj):
        return {"lat": obj.lat, "lon": obj.lon}


class SourceStatusOut(Schema):
    source: str
    last_success_at: datetime | None
    last_attempt_at: datetime | None
    last_status: str | None


class DataStatusOut(Schema):
    sources: list[SourceStatusOut]
    next_fetch_at: datetime | None