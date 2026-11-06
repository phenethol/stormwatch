import { useState } from "react";
import {
  MapContainer,
  TileLayer,
  LayersControl,
  LayerGroup,
  CircleMarker,
  Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Station } from "../types/station";

const prikaz = (v: number | null, jedinica: string) =>
  v === null ? "—" : `${v} ${jedinica}`;

export default function StationsMap({ stations }: { stations: Station[] }) {
  const [kartaNedostupna, setKartaNedostupna] = useState(false);

  return (
    <div>
      {kartaNedostupna && (
        <section role="alert">
          <p>
            <strong>Karta trenutno nije dostupna.</strong> Prikazujemo podatke
            mjernih postaja u tekstualnom obliku.
          </p>
          <ul>
            {stations.map((s) => (
              <li key={s.id}>
                {s.name}:{" "}
                {s.latest_measurement === null
                  ? "nema dostupnog mjerenja"
                  : `${prikaz(s.latest_measurement.temperature_c, "°C")}, vjetar ${s.latest_measurement.wind_direction ?? "—"} ${prikaz(s.latest_measurement.wind_speed_ms, "m/s")}`}
              </li>
            ))}
          </ul>
        </section>
      )}

      <MapContainer
        center={[44.5, 16.4]}
        zoom={7}
        style={{ height: "80vh", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{ tileerror: () => setKartaNedostupna(true) }}
        />
        <LayersControl position="topright">
          <LayersControl.Overlay checked name="Mjerne postaje">
            <LayerGroup>
              {stations.map((s) => {
                const m = s.latest_measurement;
                return (
                  <CircleMarker
                    key={s.id}
                    center={[s.location.lat, s.location.lon]}
                    radius={8}
                  >
                    <Popup>
                      <strong>{s.name}</strong>
                      {m === null ? (
                        <p>Nema dostupnog mjerenja.</p>
                      ) : (
                        <ul>
                          <li>
                            Vrijeme mjerenja:{" "}
                            {new Date(m.measured_at).toLocaleString("hr-HR")}
                          </li>
                          <li>Temperatura: {prikaz(m.temperature_c, "°C")}</li>
                          <li>Vlažnost: {prikaz(m.humidity_pct, "%")}</li>
                          <li>Tlak: {prikaz(m.pressure_hpa, "hPa")}</li>
                          <li>
                            Vjetar: {m.wind_direction ?? "—"},{" "}
                            {prikaz(m.wind_speed_ms, "m/s")}
                          </li>
                          <li>Izvor: {m.source}</li>
                        </ul>
                      )}
                    </Popup>
                  </CircleMarker>
                );
              })}
            </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
    </div>
  );
}
