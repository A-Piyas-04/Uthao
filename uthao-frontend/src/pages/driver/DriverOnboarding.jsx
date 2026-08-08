import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getCurrentUser } from "../../api/authApi";
import { registerDriver, addVehicle } from "../../api/driverApi";
import Card from "../../components/Card";
import Input from "../../components/Input";
import Button from "../../components/Button";

export default function DriverOnboarding() {
  const { user, driverId, completeDriverOnboarding } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ email: "", phone: "", licenseNumber: "" });
  const [vehicle, setVehicle] = useState({ make: "", model: "", plateNumber: "", color: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Already onboarded (e.g. revisited this URL directly) — don't let them
  // submit a second Driver row for the same userId.
  useEffect(() => {
    if (driverId) {
      navigate("/driver", { replace: true });
    }
  }, [driverId]);

  useEffect(() => {
    getCurrentUser()
      .then((me) => setProfile((p) => ({ ...p, email: me.email })))
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const driver = await registerDriver({
        userId: user.userId,
        name: user.name,
        email: profile.email,
        phone: profile.phone,
        licenseNumber: profile.licenseNumber,
      });
      await addVehicle(driver.id, vehicle);
      completeDriverOnboarding(driver.id);
      navigate("/driver");
    } catch {
      setError("Could not complete onboarding. Check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-1">
        <div>
          <p className="uppercase text-[11px] font-bold tracking-wider text-neutral-400 mb-1">
            Driver
          </p>
          <h1 className="text-2xl font-extrabold">Finish setting up</h1>
        </div>
      </div>

      <Card title="Your details">
        <form onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            required
          />
          <Input
            label="Phone"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            required
          />
          <Input
            label="License number"
            value={profile.licenseNumber}
            onChange={(e) => setProfile({ ...profile, licenseNumber: e.target.value })}
            required
          />

          <p className="uppercase text-[11px] font-bold tracking-wider text-neutral-400 mb-1">
            Vehicle
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Make"
              value={vehicle.make}
              onChange={(e) => setVehicle({ ...vehicle, make: e.target.value })}
              required
            />
            <Input
              label="Model"
              value={vehicle.model}
              onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Plate number"
              value={vehicle.plateNumber}
              onChange={(e) => setVehicle({ ...vehicle, plateNumber: e.target.value })}
              required
            />
            <Input
              label="Color"
              value={vehicle.color}
              onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })}
              required
            />
          </div>

          {error && (
            <p className="bg-red-50 text-red-600 px-3 py-2.5 rounded-md text-sm -mt-1 mb-4">
              {error}
            </p>
          )}
          <Button type="submit" disabled={submitting} full>
            {submitting ? "Saving…" : "Finish onboarding"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
