from datetime import timedelta
from math import asin, cos, radians, sin, sqrt

from dhmz.models import Measurement

TIME_WINDOW = timedelta(minutes=60)
MAX_DISTANCE_KM = 50.0
EARTH_RADIUS_KM = 6371.0088


def distance_km(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(radians, (lat1, lon1, lat2, lon2))
    a = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
    return 2 * EARTH_RADIUS_KM * asin(sqrt(a))


def find_nearest_measurement(lat, lon, observed_at):
    lat, lon = float(lat), float(lon)
    lat_margin = MAX_DISTANCE_KM / 111.0
    lon_margin = MAX_DISTANCE_KM / (111.0 * max(cos(radians(lat)), 0.01))
    candidates = Measurement.objects.select_related("station").filter(
        measured_at__gte=observed_at - TIME_WINDOW,
        measured_at__lte=observed_at + TIME_WINDOW,
        station__lat__range=(lat - lat_margin, lat + lat_margin),
        station__lon__range=(lon - lon_margin, lon + lon_margin),
    )

    best = None
    for measurement in candidates:
        station = measurement.station
        distance = distance_km(lat, lon, float(station.lat), float(station.lon))
        if distance > MAX_DISTANCE_KM:
            continue
        key = (distance, abs(measurement.measured_at - observed_at))
        if best is None or key < best[0]:
            best = (key, measurement)

    if best is None:
        return None, None
    return best[1], round(best[0][0], 2)
