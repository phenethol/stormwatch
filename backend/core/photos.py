from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError
from pillow_heif import register_heif_opener

register_heif_opener()

OUTPUT_FORMATS = {"JPEG": "JPEG", "PNG": "PNG", "WEBP": "WEBP", "HEIF": "JPEG"}
EXTENSIONS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}

# Ograničenje ulaza: provjerava se iz zaglavlja PRIJE dekodiranja piksela (zaštita od pixel bombe).
# 40 MP pokriva sve uobičajene fotografije s mobitela (12-24 MP), a dekodirano je najviše ~160 MB.
MAX_PHOTO_SIDE = 8192
MAX_PHOTO_PIXELS = 40_000_000


class InvalidPhoto(Exception):
    pass


class PhotoTooLarge(InvalidPhoto):
    pass


def clean_photo(upload) -> ContentFile:
    try:
        with Image.open(upload) as source:
            if source.format not in OUTPUT_FORMATS:
                raise InvalidPhoto(source.format)
            width, height = source.size
            if max(width, height) > MAX_PHOTO_SIDE or width * height > MAX_PHOTO_PIXELS:
                raise PhotoTooLarge(f"{width}x{height}")
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
