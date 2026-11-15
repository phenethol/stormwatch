from datetime import timedelta

from django.conf import settings
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from .models import FetchStatus, Station
from .schemas import DataStatusOut, StationOut
from .services import refresh_if_stale

# podaci DHMZ-a su javni, pa usmjerivač isključuje prijavu koju NinjaAPI inače traži
router = Router(tags=["Podaci DHMZ-a"], auth=None)


@router.get("/stations", response=list[StationOut])
def list_stations(request):
    """Mjerne postaje s posljednjim mjerenjem (OpenAPI: listStations)."""
    refresh_if_stale()
    return Station.objects.select_related("latest_measurement")


@router.get("/stations/{station_id}", response=StationOut)
def get_station(request, station_id: int):
    """Jedna postaja (OpenAPI: getStation) nepostojeća vraća 404."""
    return get_object_or_404(Station.objects.select_related("latest_measurement"), pk=station_id)


@router.get("/data-status", response=DataStatusOut)
def data_status(request):
    """Kada su podaci zadnji put preuzeti (OpenAPI: getDataStatus)."""
    statuses = list(FetchStatus.objects.order_by("source"))
    attempts = [status.last_attempt_at for status in statuses if status.last_attempt_at]
    interval = timedelta(minutes=settings.DHMZ_FETCH_INTERVAL_MIN)
    return {"sources": statuses, "next_fetch_at": min(attempts) + interval if attempts else None}


# Upozorenja i regije nisu dio prve inačice. Prazan popis značio bi „nema upozorenja”,
# što bi moglo zavarati, pa frontend radije dobiva jasnu poruku.
NOT_IN_M1 = "Upozorenja DHMZ-a bit će dostupna u sljedećoj inačici."


@router.get("/warnings")
def list_warnings(request):
    raise HttpError(501, NOT_IN_M1)


@router.get("/regions")
def list_regions(request):
    raise HttpError(501, NOT_IN_M1)