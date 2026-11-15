from django.db import transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import File, Form, Query, Router, Status
from ninja.errors import ValidationError
from ninja.files import UploadedFile

from core.errors import ApiError
from core.measurements import find_nearest_measurement
from core.models import Report, ReportPhoto, ReportState
from core.photos import InvalidPhoto, clean_photo
from core.schemas import (
    ErrorOut,
    ReportCreateIn,
    ReportDetailOut,
    ReportFilters,
    ReportPageOut,
)
from core.serializers import report_detail, report_summary
from core.visibility import is_admin, visible_reports

router = Router(tags=["Prijave"])

REPORT_QUERYSET = Report.objects.select_related(
    "author", "nearest_measurement__station"
).prefetch_related("photos")

MAX_PHOTOS = 5
MAX_PHOTO_SIZE = 10 * 1024 * 1024


def _photo_error(msg):
    return ValidationError([{"type": "value_error", "loc": ["body", "photos"], "msg": msg}])


def _clean_photos(photos):
    if not 1 <= len(photos) <= MAX_PHOTOS:
        raise _photo_error("Prijava mora imati od 1 do 5 fotografija.")
    for photo in photos:
        if photo.size > MAX_PHOTO_SIZE:
            raise ApiError(413, "Fotografija je veća od 10 MB.", "photo_too_large")
    try:
        return [clean_photo(photo) for photo in photos]
    except InvalidPhoto:
        raise _photo_error("Dopušteni formati su JPEG, PNG, WebP i HEIC.")


def _check_posting_ban(user):
    banned_until = user.posting_banned_until
    if banned_until and banned_until > timezone.now():
        until = timezone.localtime(banned_until)
        raise ApiError(
            403,
            f"Objavljivanje vam je zabranjeno do {until.day}. {until.month}. {until.year}. {until:%H:%M}.",
            "posting_banned",
        )


@router.post("/reports", response={201: ReportDetailOut, 403: ErrorOut, 413: ErrorOut})
def create_report(
    request,
    response: HttpResponse,
    payload: Form[ReportCreateIn],
    photos: File[list[UploadedFile]],
):
    user = request.user
    _check_posting_ban(user)
    cleaned_photos = _clean_photos(photos)

    data = payload.dict()
    measurement, distance = find_nearest_measurement(data["lat"], data["lon"], data["observed_at"])

    with transaction.atomic():
        report = Report.objects.create(
            author=user,
            state=ReportState.CONFIRMED if user.is_trusted_observer else ReportState.PENDING,
            is_trusted_observer_report=user.is_trusted_observer,
            nearest_measurement=measurement,
            nearest_distance_km=distance,
            **data,
        )
        for photo in cleaned_photos:
            ReportPhoto.objects.create(report=report, image=photo)

    report = REPORT_QUERYSET.get(pk=report.pk)
    response["Location"] = f"{request.path.rstrip('/')}/{report.pk}"
    return Status(201, report_detail(request, report))


def _apply_filters(queryset, filters):
    if filters.phenomenon:
        queryset = queryset.filter(phenomenon__in=filters.phenomenon)
    if filters.observed_from:
        queryset = queryset.filter(observed_at__gte=filters.observed_from)
    if filters.observed_to:
        queryset = queryset.filter(observed_at__lte=filters.observed_to)
    if filters.bbox:
        min_lon, min_lat, max_lon, max_lat = map(float, filters.bbox.split(","))
        queryset = queryset.filter(lat__range=(min_lat, max_lat), lon__range=(min_lon, max_lon))
    if filters.region_id is not None or filters.event_id is not None:
        queryset = queryset.none()
    if filters.valuable_only:
        queryset = queryset.filter(is_valuable=True)
    if filters.updated_since:
        queryset = queryset.filter(updated_at__gt=filters.updated_since)
    return queryset


@router.get("/reports", response={200: ReportPageOut, 403: ErrorOut}, auth=None)
def list_reports(request, filters: Query[ReportFilters]):
    user = request.user
    if filters.include_deleted and not is_admin(user):
        raise ApiError(403, "Obrisane prijave može vidjeti samo administrator.", "admin_only")

    server_time = timezone.now()
    visible = visible_reports(REPORT_QUERYSET, user)
    queryset = _apply_filters(visible, filters).order_by("-observed_at", "-id")
    page = queryset[filters.offset:filters.offset + filters.limit]

    removed_ids = []
    if filters.updated_since:
        removed_ids = list(
            Report.objects.filter(updated_at__gt=filters.updated_since, state=ReportState.REJECTED)
            .exclude(pk__in=visible.values("pk"))
            .values_list("pk", flat=True)
        )

    return {
        "items": [report_summary(request, report) for report in page],
        "count": queryset.count(),
        "server_time": server_time,
        "removed_ids": removed_ids,
    }


@router.get("/reports/{report_id}", response=ReportDetailOut, auth=None)
def get_report(request, report_id: int):
    report = get_object_or_404(visible_reports(REPORT_QUERYSET, request.user), pk=report_id)
    return report_detail(request, report)

