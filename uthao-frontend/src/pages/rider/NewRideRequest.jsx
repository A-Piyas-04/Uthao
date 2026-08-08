import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { createRideRequest } from "../../api/riderApi";
import { findDriver } from "../../api/matchingApi";
import { getTripByRideRequest } from "../../api/tripApi";
import Card from "../../components/Card";
import Button from "../../components/Button";
import LocationPickerModal from "../../components/LocationPickerModal";
import NearbyDriversMap from "../../components/NearbyDriversMap";

const POLL_INTERVAL_MS = 1500;

function LocationField({ label, point, onPick, extra }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-neutral-600">{label}</span>
        {extra}
      </div>
      <button
        type="button"
        onClick={onPick}
        className="w-full flex items-center justify-between px-3.5 py-3 border-[1.5px] border-neutral-200 rounded-md text-[15px] text-left hover:border-black transition-colors"
      >
        <span className={point ? "text-black" : "text-neutral-400"}>
          {point ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : "Tap to choose on map"}
        </span>
        <span className="text-neutral-400">📍</span>
      </button>
    </div>
  );
}

export default function NewRideRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);
  const [pickerFor, setPickerFor] = useState(null); // "pickup" | "drop" | null
  const [match, setMatch] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [waitingForTrip, setWaitingForTrip] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  // Stop polling if the rider navigates away before the trip is ready.
  useEffect(() => {
    return () => clearInterval(pollRef.current);
  }, []);

  function useCurrentLocationForPickup() {
    navigator.geolocation.getCurrentPosition((position) => {
      setPickup({ lat: position.coords.latitude, lng: position.coords.longitude });
    });
  }

  function pollForTrip(rideRequestId) {
    setWaitingForTrip(true);
    pollRef.current = setInterval(async () => {
      try {
        const trip = await getTripByRideRequest(rideRequestId);
        clearInterval(pollRef.current);
        setWaitingForTrip(false);
        navigate(`/trips/${trip.id}`);
      } catch {
        // 404 = trip-service hasn't consumed driver.assigned yet, keep polling.
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const coords = {
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropLat: drop.lat,
        dropLng: drop.lng,
      };
      const request = await createRideRequest({ riderId: user.userId, ...coords });
      const result = await findDriver({
        rideRequestId: request.id,
        riderId: user.userId,
        ...coords,
      });
      setMatch(result);
      if (result.status === "MATCHED") {
        pollForTrip(request.id);
      }
    } catch {
      setError("Could not create the ride request. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-1">
        <div>
          <p className="uppercase text-[11px] font-bold tracking-wider text-neutral-400 mb-1">
            Rider
          </p>
          <h1 className="text-2xl font-extrabold">Request a ride</h1>
        </div>
        <Link
          to="/rider"
          className="inline-flex items-center justify-center rounded-full text-sm font-bold px-3 py-2 bg-transparent text-black hover:bg-neutral-100 transition-colors no-underline"
        >
          Back
        </Link>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <LocationField
            label="Pickup"
            point={pickup}
            onPick={() => setPickerFor("pickup")}
            extra={
              <button
                type="button"
                className="text-blue-600 text-xs font-semibold cursor-pointer"
                onClick={useCurrentLocationForPickup}
              >
                Use current location
              </button>
            }
          />
          <LocationField label="Drop-off" point={drop} onPick={() => setPickerFor("drop")} />

          <NearbyDriversMap pickup={pickup} />

          {error && (
            <p className="bg-red-50 text-red-600 px-3 py-2.5 rounded-md text-sm mb-4">{error}</p>
          )}
          <Button type="submit" disabled={submitting || !pickup || !drop} full>
            {submitting ? "Finding a driver…" : "Request ride"}
          </Button>
        </form>
      </Card>

      {match && (
        <Card title="Match result">
          {match.status === "MATCHED" ? (
            <div className="flex items-center gap-3.5">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-black text-white text-lg font-bold shrink-0">
                {match.driverName?.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="text-[15px] font-semibold m-0">{match.driverName}</p>
                <p className="text-[13px] text-neutral-400 mt-0.5">
                  {match.vehiclePlate} · ETA {match.eta}
                </p>
                {waitingForTrip && (
                  <p className="text-[13px] text-neutral-400 mt-0.5">Opening trip…</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-neutral-400 text-sm text-center py-6">
              No driver available right now. Try again shortly.
            </p>
          )}
        </Card>
      )}

      {pickerFor && (
        <LocationPickerModal
          title={pickerFor === "pickup" ? "Choose pickup location" : "Choose drop-off location"}
          initial={pickerFor === "pickup" ? pickup : drop}
          onConfirm={(point) => {
            if (pickerFor === "pickup") {
              setPickup(point);
            } else {
              setDrop(point);
            }
            setPickerFor(null);
          }}
          onClose={() => setPickerFor(null)}
        />
      )}
    </div>
  );
}
