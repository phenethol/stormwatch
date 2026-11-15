from core.visibility import VOTABLE_STATES, is_admin

NO_VOTES_CREDIBILITY = 50.0


def _absolute(request, file_field):
    return request.build_absolute_uri(file_field.url) if file_field else None


def _author(request, user):
    return {
        "username": None if user.is_deleted else user.username,
        "photo_url": None if user.is_deleted else _absolute(request, user.photo),
        "is_trusted_observer": user.is_trusted_observer,
        "is_meteorologist": user.is_meteorologist,
        "is_deleted": user.is_deleted,
    }


def _photos(request, report):
    return [
        {
            "id": photo.id,
            "url": _absolute(request, photo.image),
            "thumbnail_url": _absolute(request, photo.image),
            "width": photo.width,
            "height": photo.height,
        }
        for photo in report.photos.all()
    ]


def _nearest_measurement(report):
    measurement = report.nearest_measurement
    if measurement is None:
        return None
    return {
        "station_id": measurement.station_id,
        "station_name": measurement.station.name,
        "distance_km": report.nearest_distance_km,
        "measurement": measurement,
    }


def report_summary(request, report):
    photos = list(report.photos.all())
    return {
        "id": report.id,
        "phenomenon": report.phenomenon,
        "intensity": report.intensity,
        "location": {"lat": report.lat, "lon": report.lon},
        "observed_at": report.observed_at,
        "state": report.state,
        "author": _author(request, report.author),
        "confirmations": 0,
        "disputes": 0,
        "credibility": NO_VOTES_CREDIBILITY,
        "is_trusted_observer_report": report.is_trusted_observer_report,
        "is_valuable": report.is_valuable,
        "event_id": None,
        "thumbnail_url": _absolute(request, photos[0].image) if photos else None,
        "comment_count": 0,
        "updated_at": report.updated_at,
    }


def report_detail(request, report):
    user = request.user
    is_author = user.is_authenticated and report.author_id == user.id
    can_see_reason = is_author or is_admin(user)
    return {
        **report_summary(request, report),
        "damage": report.damage,
        "description": report.description or None,
        "photos": _photos(request, report),
        "submitted_at": report.submitted_at,
        "region": None,
        "nearest_measurement": _nearest_measurement(report),
        "rejection_reason": (report.rejection_reason or None) if can_see_reason else None,
        "my_vote": None,
        "can_vote": user.is_authenticated and not is_author and report.state in VOTABLE_STATES,
        "event_title": None,
    }
