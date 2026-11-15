from django.db import transaction
from ninja import File, Form, Router, Status
from ninja.errors import ValidationError
from ninja.files import UploadedFile

from core.errors import ApiError
from core.models import Report, ReportPhoto
from core.photos import InvalidPhoto, clean_photo
from core.schemas import ErrorOut, ReportCreateIn, ReportOut

router = Router(tags=["Prijave"])

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


@router.post("/reports", response={201: ReportOut, 413: ErrorOut})
def create_report(
    request,
    payload: Form[ReportCreateIn],
    photos: File[list[UploadedFile]],
):
    cleaned_photos = _clean_photos(photos)

    with transaction.atomic():
        report = Report.objects.create(author=request.user, **payload.dict())
        for photo in cleaned_photos:
            ReportPhoto.objects.create(report=report, image=photo)

    return Status(201, _report_out(request, report))


def _report_out(request, report):
    return {
        **{f: getattr(report, f) for f in (
            "id", "phenomenon", "intensity", "damage", "lat", "lon",
            "location_source", "observed_at", "submitted_at", "description", "state",
        )},
        "photos": [
            {
                "id": p.id,
                "url": request.build_absolute_uri(p.image.url),
                "width": p.width,
                "height": p.height,
            }
            for p in report.photos.all()
        ],
    }
