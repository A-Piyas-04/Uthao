import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getRideRequests, cancelRideRequest } from "../../api/riderApi";
import Card from "../../components/Card";
import Button from "../../components/Button";
import StatusBadge from "../../components/StatusBadge";
import Loader from "../../components/Loader";

export default function RiderDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await getRideRequests(user.userId);
    setRequests([...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCancel(requestId) {
    await cancelRideRequest(requestId);
    load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-1">
        <div>
          <p className="uppercase text-[11px] font-bold tracking-wider text-neutral-400 mb-1">
            Rider
          </p>
          <h1 className="text-2xl font-extrabold">Your rides</h1>
        </div>
        <Link to="/rider/new">
          <Button>Request a ride</Button>
        </Link>
      </div>

      <Card>
        {loading ? (
          <Loader />
        ) : requests.length === 0 ? (
          <p className="text-neutral-400 text-sm text-center py-6">
            No ride requests yet. Request your first ride.
          </p>
        ) : (
          <ul className="list-none p-0 m-0">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 py-4 border-b border-neutral-200 last:border-b-0"
              >
                <div>
                  <p className="text-[15px] font-semibold m-0">Ride request #{r.id}</p>
                  <p className="text-[13px] text-neutral-400 mt-0.5">
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={r.status} />
                  {r.status === "REQUESTED" && (
                    <Button variant="secondary" onClick={() => handleCancel(r.id)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
