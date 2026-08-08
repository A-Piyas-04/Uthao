import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getTrip, startTrip, completeTrip, cancelTrip } from "../../api/tripApi";
import { getPaymentByTrip, refundPayment } from "../../api/paymentApi";
import Card from "../../components/Card";
import Button from "../../components/Button";
import StatusBadge from "../../components/StatusBadge";
import Loader from "../../components/Loader";

export default function TripDetails() {
  const { tripId } = useParams();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState("");

  async function load() {
    const data = await getTrip(tripId);
    setTrip(data);
    if (data.status === "COMPLETED") {
      const paymentData = await getPaymentByTrip(tripId).catch(() => null);
      setPayment(paymentData);
    } else {
      setPayment(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
  }, [tripId]);

  async function handleAction(action) {
    setActionError("");
    setActionPending(true);
    try {
      await action(tripId);
      await load();
    } catch (err) {
      setActionError(
        err.response?.status === 403
          ? "Only the driver can do that."
          : "That action isn't allowed right now."
      );
    } finally {
      setActionPending(false);
    }
  }

  async function handleRefund() {
    if (!payment) return;
    setActionPending(true);
    try {
      await refundPayment(payment.id, "Rider requested refund");
      await load();
    } finally {
      setActionPending(false);
    }
  }

  if (loading || !trip) return <Loader />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-1">
        <div>
          <p className="uppercase text-[11px] font-bold tracking-wider text-neutral-400 mb-1">
            Trip #{trip.id}
          </p>
          <h1>
            <StatusBadge status={trip.status} />
          </h1>
        </div>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-full text-sm font-bold px-3 py-2 bg-transparent text-black hover:bg-neutral-100 transition-colors no-underline"
        >
          Home
        </Link>
      </div>

      <Card title="Details">
        <p className="text-[13px] text-neutral-400">
          Driver #{trip.driverId} · Rider #{trip.riderId}
        </p>
        {trip.status === "COMPLETED" && trip.fare != null && (
          <p className="text-2xl font-extrabold mt-2">৳{trip.fare.toFixed(2)}</p>
        )}

        <div className="flex gap-3 mt-5">
          {trip.status === "MATCHED" && user.role === "DRIVER" && (
            <Button onClick={() => handleAction(startTrip)} disabled={actionPending}>
              Start trip
            </Button>
          )}
          {trip.status === "ONGOING" && user.role === "DRIVER" && (
            <Button onClick={() => handleAction(completeTrip)} disabled={actionPending}>
              Complete trip
            </Button>
          )}
          {trip.status === "MATCHED" && (
            <Button
              variant="secondary"
              onClick={() => handleAction(cancelTrip)}
              disabled={actionPending}
            >
              Cancel trip
            </Button>
          )}
        </div>
        {actionError && (
          <p className="bg-red-50 text-red-600 px-3 py-2.5 rounded-md text-sm mt-3">
            {actionError}
          </p>
        )}
      </Card>

      {payment && (
        <Card title="Payment">
          <div className="flex items-center justify-between gap-4">
            <p className="text-2xl font-extrabold">৳{payment.amount.toFixed(2)}</p>
            <StatusBadge status={payment.status} />
          </div>
          {payment.status === "SUCCESS" && (
            <Button
              variant="secondary"
              onClick={handleRefund}
              disabled={actionPending}
              className="mt-4"
            >
              Request refund
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
