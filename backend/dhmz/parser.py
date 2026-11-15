"""Raščlanjivanje XML-a s trenutačnim mjerenjima DHMZ-a (https://vrijeme.hr/hrvatska_n.xml)."""

import xml.etree.ElementTree as ET
from datetime import datetime
from decimal import Decimal, InvalidOperation
from zoneinfo import ZoneInfo

ZAGREB = ZoneInfo("Europe/Zagreb")

# DHMZ smjer vjetra u XML-u piše engleskim kraticama, a sučelje prikazuje hrvatske (DR-03)
WIND_DIRECTIONS = {
    "N": "S", "NE": "SI", "E": "I", "SE": "JI",
    "S": "J", "SW": "JZ", "W": "Z", "NW": "SZ",
}


def parse_measurements(content):
    """Vraća (vrijeme mjerenja, popis postaja s mjerenjem) Neispravan XML diže ValueError."""
    try:
        root = ET.fromstring(content)
    except ET.ParseError as error:
        raise ValueError(f"XML nije ispravan: {error}") from error

    measured_at = _measured_at(root)
    stations = []
    for grad in root.iter("Grad"):
        name = _text(grad, "GradIme")
        lat, lon = _coordinate(grad, "Lat"), _coordinate(grad, "Lon")
        if not name or lat is None or lon is None:
            continue  # postaju bez naziva ili koordinata nije moguće prikazati
        humidity = _number(grad, "Podatci/Vlaga")
        stations.append({
            "name": name,
            "lat": lat,
            "lon": lon,
            "automatic": grad.get("autom") == "1",
            "measurement": {
                "temperature_c": _number(grad, "Podatci/Temp"),
                # vlaga 0 % znači da osjetnik ne radi
                "humidity_pct": humidity if humidity else None,
                "pressure_hpa": _number(grad, "Podatci/Tlak"),
                "wind_speed_ms": _number(grad, "Podatci/VjetarBrzina"),
                "wind_direction": WIND_DIRECTIONS.get(_text(grad, "Podatci/VjetarSmjer")),
            },
        })
    if not stations:
        raise ValueError("XML ne sadrži nijednu postaju.")
    return measured_at, stations


def _measured_at(root):
    # <DatumTermin><Datum>14.11.2026</Datum><Termin>18</Termin></DatumTermin>, lokalno vrijeme
    datum, termin = _text(root, "DatumTermin/Datum"), _text(root, "DatumTermin/Termin")
    try:
        return datetime.strptime(f"{datum} {termin}", "%d.%m.%Y %H").replace(tzinfo=ZAGREB)
    except ValueError as error:
        raise ValueError(f"XML nema ispravan datum i termin mjerenja: {datum} {termin}") from error


def _text(element, path):
    """Tekst elementa bez razmaka; „-” (nema podatka) postaje None."""
    value = (element.findtext(path) or "").strip()
    return value if value and value != "-" else None


def _number(element, path):
    # zvjezdica (npr. „837.0*”) označava tlak na visini postaje, a ne sveden na razinu mora
    value = (_text(element, path) or "").rstrip("*")
    try:
        return float(value)
    except ValueError:
        return None


def _coordinate(element, path):
    try:
        return Decimal(_text(element, path) or "")
    except InvalidOperation:
        return None