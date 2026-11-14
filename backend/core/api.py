from django.db import transaction
from ninja import File, Form, Router, Status
from ninja.errors import HttpError, ValidationError
from ninja.files import UploadedFile

from core.models import Report, ReportPhoto
from core.schemas import ReportOut, ReportCreateIn

router = Router(tags=["Prijave"])

MAX_PHOTOS = 5
MAX_PHOTO_SIZE = 10 * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}


def _photo_error(msg):
    return ValidationError([{"type": "value_error", "loc": ["body", "photos"], "msg": msg}])


@router.post("/reports", response={201: ReportOut})
def create_report(
    request,
    payload: Form[ReportCreateIn],
    photos: File[list[UploadedFile]],
):
    # 1-5 fotografija, svaka do 10 MB, dopušteni formati (P-03, NF-06)
    if not 1 <= len(photos) <= MAX_PHOTOS:
        raise _photo_error("Prijava mora imati od 1 do 5 fotografija.")
    for photo in photos:
        if photo.size > MAX_PHOTO_SIZE:
            raise HttpError(413, "Fotografija je veća od 10 MB.")
        if photo.content_type not in ALLOWED_TYPES:
            raise _photo_error("Dopušteni formati su JPEG, PNG, WebP i HEIC.")

    with transaction.atomic():
        report = Report.objects.create(author=request.user, **payload.dict())
        for photo in photos:
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
