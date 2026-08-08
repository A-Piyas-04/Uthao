import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { updateDriverStatus, getDriverStatus, getDriverTrips } from "../../api/driverApi";
import { getTripByRideRequest } from "../../api/tripApi";
import Card from "../../components/Card";
import Button from "../../components/Button";
import StatusBadge from "../../components/StatusBadge";
import Loader from "../../components/Loader";
import { DRIVER_STATUS } from "../../utils/constants";

const LOCATION_PUSH_INTERVAL_MS = 20000;

export default function DriverDashboard() {
  const { driverId } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(DRIVER_STATUS.OFFLINE);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!driverId) {
      navigate("/driver/onboarding", { replace: true });
      return;
    }
    loadStatus();
    loadTrips();
  }, [driverId]);

  // Toggling AVAILABLE only sends one lat/lng snapshot at that instant — if the
  // driver keeps moving, riders searching nearby would see a stale position.
  // Keep pushing fresh coordinates on an interval for as long as status stays
  // AVAILABLE; stop the moment it flips to OFFLINE or the page unmounts.
  useEffect(() => {
    if (!driverId || status !== DRIVER_STATUS.AVAILABLE) {
      return;
    }
    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition((position) => {
        updateDriverStatus(driverId, {
          status: DRIVER_STATUS.AVAILABLE,
          currentLat: position.coords.latitude,
          currentLng: position.coords.longitude,
        });
      });
    }, LOCATION_PUSH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [driverId, status]);

  async function loadStatus() {
    const data = await getDriverStatus(driverId);
    setStatus(data.status);
  }

  async function loadTrips() {
    setLoading(true);
    const data = await getDriverTrips(driverId);
    setTrips(data);
    setLoading(false);
  }

  function toggleStatus() {
    const next =
      status === DRIVER_STATUS.AVAILABLE ? DRIVER_STATUS.OFFLINE : DRIVER_STATUS.AVAILABLE;
    setUpdatingStatus(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await updateDriverStatus(driverId, {
          status: next,
          currentLat: position.coords.latitude,
          currentLng: position.coords.longitude,
        });
        setStatus(next);
        setUpdatingStatus(false);
      },
      () => setUpdatingStatus(false)
    );
  }

  async function openTrip(rideRequestId) {
    try {
      const trip = await getTripByRideRequest(rideRequestId);
      navigate(`/trips/${trip.id}`);
    } catch {
      alert("Trip isn't ready yet — try again in a moment.");
    }
  }

  if (!driverId) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-1">
        <div>
          <p className="uppercase text-[11px] font-bold tracking-wider text-neutral-400 mb-1">
            Driver
          </p>
          <h1 className="text-2xl font-extrabold">Dashboard</h1>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-semibold m-0">Your status</p>
            <StatusBadge status={status} />
            {status === DRIVER_STATUS.AVAILABLE && (
              <p className="text-[12px] text-neutral-400 mt-1">Sharing your location live</p>
            )}
          </div>
          <Button
            onClick={toggleStatus}
            disabled={updatingStatus}
            variant={status === DRIVER_STATUS.AVAILABLE ? "secondary" : "primary"}
          >
            {updatingStatus
              ? "Updating…"
              : status === DRIVER_STATUS.AVAILABLE
                ? "Go offline"
                : "Go available"}
          </Button>
        </div>
      </Card>

      <Card title="Trip history">
        {loading ? (
          <Loader />
        ) : trips.length === 0 ? (
          <p className="text-neutral-400 text-sm text-center py-6">
            No trips yet. Go available to start receiving rides.
          </p>
        ) : (
          <ul className="list-none p-0 m-0">
            {trips.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 py-4 border-b border-neutral-200 last:border-b-0"
              >
                <div>
                  <p className="text-[15px] font-semibold m-0">
                    Ride request #{t.rideRequestId}
                  </p>
                  <p className="text-[13px] text-neutral-400 mt-0.5">
                    ETA {t.eta} · {new Date(t.assignedAt).toLocaleString()}
                  </p>
                </div>
                <Button variant="secondary" onClick={() => openTrip(t.rideRequestId)}>
                  Open trip
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
