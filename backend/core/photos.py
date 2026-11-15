from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError
from pillow_heif import register_heif_opener

register_heif_opener()

OUTPUT_FORMATS = {"JPEG": "JPEG", "PNG": "PNG", "WEBP": "WEBP", "HEIF": "JPEG"}
EXTENSIONS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}


class InvalidPhoto(Exception):
    pass


def clean_photo(upload) -> ContentFile:
    try:
        with Image.open(upload) as source:
            if source.format not in OUTPUT_FORMATS:
                raise InvalidPhoto(source.format)
            output_format = OUTPUT_FORMATS[source.format]
            source.load()
            image = ImageOps.exif_transpose(source)
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise InvalidPhoto(str(exc)) from exc

    if output_format == "JPEG" and image.mode not in ("RGB", "L"):
        image = image.convert("RGB")

    image.info.clear()
    buffer = BytesIO()
    options = {"quality": 90} if output_format in ("JPEG", "WEBP") else {}
    image.save(buffer, format=output_format, **options)
    name = Path(upload.name).stem + EXTENSIONS[output_format]
    return ContentFile(buffer.getvalue(), name=name)
