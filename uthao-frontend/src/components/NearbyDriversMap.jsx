import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { getAvailableDrivers } from "../api/driverApi";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const carIcon = new L.DivIcon({
  className: "",
  html: '<div style="background:#000;color:#fff;border-radius:9999px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 1px 4px rgba(0,0,0,.35)">🚗</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const RADIUS_KM = 5;
const REFRESH_INTERVAL_MS = 10000;

export default function NearbyDriversMap({ pickup }) {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pickup) return;
    let cancelled = false;

    function load() {
      getAvailableDrivers(pickup.lat, pickup.lng, RADIUS_KM).then((data) => {
        if (!cancelled) {
          setDrivers(data);
          setLoading(false);
        }
      });
    }

    setLoading(true);
    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pickup?.lat, pickup?.lng]);

  if (!pickup) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-neutral-600">Nearby drivers</span>
        <span className="text-xs text-neutral-400">
          {loading ? "Searching…" : `${drivers.length} within ${RADIUS_KM}km`}
        </span>
      </div>
      <div className="h-48 w-full rounded-md overflow-hidden border-[1.5px] border-neutral-200">
        <MapContainer
          center={[pickup.lat, pickup.lng]}
          zoom={13}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[pickup.lat, pickup.lng]} />
          {drivers.map((d) => (
            <Marker key={d.driverId} position={[d.currentLat, d.currentLng]} icon={carIcon}>
              <Popup>
                {d.name} · {d.vehiclePlate}
                <br />
                {d.distanceKm.toFixed(1)} km away
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
