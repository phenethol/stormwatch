"""Preuzimanje mjerenja DHMZ-a i spremanje u bazu (F-026, UC-023)."""

import logging
from datetime import timedelta

import requests
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .models import FetchStatus, Measurement, Station
from .parser import parse_measurements

logger = logging.getLogger(__name__)
MEASUREMENTS = FetchStatus.Source.MEASUREMENTS


def download(url):
    """Dohvaća dokument s DHMZ-a, ako ne uspije, pokušava još jednom (UC-023, 2a)."""
    try:
        return _get(url)
    except requests.RequestException:
        return _get(url)


def _get(url):
    response = requests.get(url, timeout=10, headers={"User-Agent": "StormWatch (FER PROINZ)"})
    response.raise_for_status()
    return response.content


def fetch_measurements():
    """Preuzima mjerenja i bilježi ishod. Ako ne uspije, postojeći podaci ostaju (NF-03)."""
    status, _ = FetchStatus.objects.get_or_create(source=MEASUREMENTS)
    status.last_attempt_at = timezone.now()
    try:
        measured_at, stations = parse_measurements(download(settings.DHMZ_MEASUREMENTS_URL))
        save_measurements(measured_at, stations)
    except (requests.RequestException, ValueError) as error:
        logger.warning("Preuzimanje mjerenja DHMZ-a nije uspjelo: %s", error)
        status.last_status = FetchStatus.Result.FAILED
        status.last_error = str(error)[:1000]
    else:
        status.last_status = FetchStatus.Result.SUCCESS
        status.last_error = ""
        status.last_success_at = timezone.now()
    status.save()
    return status


@transaction.atomic
def save_measurements(measured_at, stations):
    """Sprema jedan termin mjerenja; sve ili ništa, pa neispravan unos ne ostavlja pola podataka."""
    for row in stations:
        station, _ = Station.objects.update_or_create(
            name=row["name"],
            defaults={"lat": row["lat"], "lon": row["lon"], "automatic": row["automatic"]},
        )
        measurement, _ = Measurement.objects.get_or_create(
            station=station, measured_at=measured_at, defaults=row["measurement"]
        )
        latest = station.latest_measurement
        if latest is None or latest.measured_at < measured_at:
            station.latest_measurement = measurement
            station.save(update_fields=["latest_measurement"])


def refresh_if_stale():
    """Lijeno preuzimanje pokreće ga zahtjev za postajama tek kad je prošao interval P-10.

    """
    now = timezone.now()
    due = now - timedelta(minutes=settings.DHMZ_FETCH_INTERVAL_MIN)
    FetchStatus.objects.get_or_create(source=MEASUREMENTS)
    claimed = FetchStatus.objects.filter(
        Q(last_attempt_at__isnull=True) | Q(last_attempt_at__lte=due), source=MEASUREMENTS
    ).update(last_attempt_at=now)
    if claimed:
        fetch_measurements()