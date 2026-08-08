import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, CircleMarker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import Button from "./Button";

// Vite serves these as built asset URLs; Leaflet's default icon paths break
// under any bundler unless explicitly reassigned like this.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DHAKA_CENTER = [23.8103, 90.4125];
const GEOLOCATION_OPTIONS = { timeout: 5000, maximumAge: 60000 };

function ClickCapture({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function LocationPickerModal({ title, initial, onConfirm, onClose }) {
  const [point, setPoint] = useState(initial ?? null);
  // Map's initial center — react-leaflet only reads this once, on mount, so we
  // wait for geolocation to resolve before rendering <MapContainer> at all
  // rather than mounting on Dhaka and trying to recenter afterward.
  const [center, setCenter] = useState(initial ? [initial.lat, initial.lng] : null);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (initial) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const here = [position.coords.latitude, position.coords.longitude];
        setUserLocation(here);
        setCenter(here);
      },
      () => setCenter(DHAKA_CENTER),
      GEOLOCATION_OPTIONS
    );
  }, [initial]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-lg">
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h3 className="text-base font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-black text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="h-80 w-full flex items-center justify-center bg-neutral-50">
          {!center ? (
            <p className="text-sm text-neutral-400">Finding your location…</p>
          ) : (
            <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ClickCapture onPick={setPoint} />
              {userLocation && (
                <CircleMarker
                  center={userLocation}
                  radius={7}
                  pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.9, weight: 2 }}
                />
              )}
              {point && <Marker position={[point.lat, point.lng]} />}
            </MapContainer>
          )}
        </div>

        <div className="px-5 py-4 flex items-center justify-between gap-3">
          <p className="text-sm text-neutral-600">
            {point ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : "Tap the map to drop a pin"}
          </p>
          <div className="flex gap-2 shrink-0">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={!point} onClick={() => onConfirm(point)}>
              Use this location
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
