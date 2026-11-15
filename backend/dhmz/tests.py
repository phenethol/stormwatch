from datetime import datetime, timedelta
from unittest.mock import patch

import requests
from django.test import TestCase, override_settings
from django.utils import timezone

from .models import FetchStatus, Measurement, Station
from .parser import ZAGREB, parse_measurements
from .services import fetch_measurements

# isječak stvarnog XML-a s vrijeme.hr: obična postaja, postaja bez podataka („-”, vlaga 0)
# i planinska postaja čiji je tlak označen zvjezdicom
SAMPLE_XML = """<?xml version="1.0" encoding="UTF-8"?>
<Hrvatska>
<DatumTermin><Datum>14.11.2026</Datum><Termin>18</Termin></DatumTermin>
<Grad autom="1"><GradIme>Bjelovar</GradIme><Lat>45.910</Lat><Lon>16.869 </Lon>
<Podatci><Temp>  4.6</Temp><Vlaga>79</Vlaga><Tlak>1025.7</Tlak><VjetarSmjer>NE</VjetarSmjer>
<VjetarBrzina> 0.9</VjetarBrzina></Podatci></Grad>
<Grad autom="1"><GradIme>Otočac</GradIme><Lat>44.869</Lat><Lon>15.237</Lon>
<Podatci><Temp>-</Temp><Vlaga>0</Vlaga><Tlak>-</Tlak><VjetarSmjer>-</VjetarSmjer>
<VjetarBrzina>-</VjetarBrzina></Podatci></Grad>
<Grad autom="0"><GradIme>Zavižan</GradIme><Lat>44.815</Lat><Lon>14.975</Lon>
<Podatci><Temp> -2.3</Temp><Vlaga>91</Vlaga><Tlak> 837.0*</Tlak><VjetarSmjer>SW</VjetarSmjer>
<VjetarBrzina> 7.1</VjetarBrzina></Podatci></Grad>
</Hrvatska>""".encode()

NEXT_TERM_XML = SAMPLE_XML.replace(b"<Termin>18</Termin>", b"<Termin>19</Termin>")


class ParserTests(TestCase):
    def test_reads_time_and_values(self):
        measured_at, stations = parse_measurements(SAMPLE_XML)
        self.assertEqual(measured_at, datetime(2026, 11, 14, 18, tzinfo=ZAGREB))
        bjelovar = stations[0]
        self.assertEqual(bjelovar["name"], "Bjelovar")
        self.assertTrue(bjelovar["automatic"])
        self.assertEqual(bjelovar["measurement"]["temperature_c"], 4.6)
        self.assertEqual(bjelovar["measurement"]["wind_direction"], "SI")

    def test_missing_values_become_none(self):
        _, stations = parse_measurements(SAMPLE_XML)
        otocac = stations[1]["measurement"]
        self.assertEqual(set(otocac.values()), {None})

    def test_pressure_with_asterisk_is_read(self):
        _, stations = parse_measurements(SAMPLE_XML)
        self.assertEqual(stations[2]["measurement"]["pressure_hpa"], 837.0)

    def test_broken_xml_is_rejected(self):
        with self.assertRaises(ValueError):
            parse_measurements(b"<Hrvatska><Grad>")
        with self.assertRaises(ValueError):
            parse_measurements(b"<Hrvatska></Hrvatska>")


@patch("dhmz.services.download", return_value=SAMPLE_XML)
class FetchTests(TestCase):
    def test_saves_stations_and_measurements(self, _download):
        status = fetch_measurements()
        self.assertEqual(status.last_status, FetchStatus.Result.SUCCESS)
        self.assertEqual(Station.objects.count(), 3)
        self.assertEqual(Measurement.objects.count(), 3)
        self.assertIsNotNone(Station.objects.get(name="Zavižan").latest_measurement)

    def test_same_term_twice_creates_no_duplicates(self, _download):
        fetch_measurements()
        fetch_measurements()
        self.assertEqual(Measurement.objects.count(), 3)

    def test_new_term_keeps_history_and_moves_latest(self, download):
        fetch_measurements()
        download.return_value = NEXT_TERM_XML
        fetch_measurements()
        self.assertEqual(Measurement.objects.count(), 6)
        latest = Station.objects.get(name="Bjelovar").latest_measurement
        self.assertEqual(latest.measured_at, datetime(2026, 11, 14, 19, tzinfo=ZAGREB))

    def test_failure_keeps_existing_data(self, download):
        first = fetch_measurements()
        download.side_effect = requests.ConnectionError("DHMZ nije dostupan")
        with self.assertLogs("dhmz.services", "WARNING"):
            status = fetch_measurements()
        self.assertEqual(status.last_status, FetchStatus.Result.FAILED)
        self.assertEqual(status.last_success_at, first.last_success_at)
        self.assertEqual(Measurement.objects.count(), 3)


@patch("dhmz.services.download", return_value=SAMPLE_XML)
class StationApiTests(TestCase):
    def test_stations_are_public(self, _download):
        response = self.client.get("/api/v1/stations")
        self.assertEqual(response.status_code, 200)
        stations = response.json()
        self.assertEqual(len(stations), 3)
        bjelovar = stations[0]
        self.assertEqual(bjelovar["location"], {"lat": 45.91, "lon": 16.869})
        self.assertEqual(bjelovar["latest_measurement"]["source"], "DHMZ")
        self.assertEqual(bjelovar["latest_measurement"]["measured_at"], "2026-11-14T17:00:00Z")

    def test_fetches_at_most_once_per_interval(self, download):
        self.client.get("/api/v1/stations")
        self.client.get("/api/v1/stations")
        self.assertEqual(download.call_count, 1)

    @override_settings(DHMZ_FETCH_INTERVAL_MIN=30)
    def test_fetches_again_after_interval(self, download):
        self.client.get("/api/v1/stations")
        FetchStatus.objects.update(last_attempt_at=timezone.now() - timedelta(minutes=31))
        self.client.get("/api/v1/stations")
        self.assertEqual(download.call_count, 2)

    def test_station_detail_and_404(self, _download):
        fetch_measurements()
        station = Station.objects.get(name="Otočac")
        response = self.client.get(f"/api/v1/stations/{station.pk}")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["latest_measurement"]["temperature_c"])
        self.assertEqual(self.client.get("/api/v1/stations/999999").status_code, 404)

    def test_data_status(self, _download):
        self.assertEqual(self.client.get("/api/v1/data-status").json()["sources"], [])
        fetch_measurements()
        body = self.client.get("/api/v1/data-status").json()
        self.assertEqual(body["sources"][0]["source"], "measurements")
        self.assertEqual(body["sources"][0]["last_status"], "success")
        self.assertIsNotNone(body["next_fetch_at"])

    def test_warnings_are_not_in_first_version(self, _download):
        for path in ("/api/v1/warnings", "/api/v1/regions"):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 501)
            self.assertIn("sljedećoj inačici", response.json()["detail"])
