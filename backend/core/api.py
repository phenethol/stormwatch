from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from ninja import File, Form, Router, Status
from ninja.errors import ValidationError
from ninja.files import UploadedFile

from core.errors import ApiError
from core.measurements import find_nearest_measurement
from core.models import Report, ReportPhoto, ReportState
from core.photos import InvalidPhoto, clean_photo
from core.schemas import ErrorOut, ReportCreateIn, ReportDetailOut
from core.serializers import report_detail

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
