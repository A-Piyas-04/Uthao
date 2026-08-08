import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import NotificationsPage from "../pages/NotificationsPage";
import NotFoundPage from "../pages/NotFoundPage";
import RiderDashboard from "../pages/rider/RiderDashboard";
import NewRideRequest from "../pages/rider/NewRideRequest";
import DriverOnboarding from "../pages/driver/DriverOnboarding";
import DriverDashboard from "../pages/driver/DriverDashboard";
import TripDetails from "../pages/trip/TripDetails";
import { useAuth } from "../hooks/useAuth";

export default function AppRoutes() {
  const { user, driverId } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute allowedRoles={["RIDER"]} />}>
        <Route path="/rider" element={<RiderDashboard />} />
        <Route path="/rider/new" element={<NewRideRequest />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["DRIVER"]} />}>
        <Route path="/driver/onboarding" element={<DriverOnboarding />} />
        <Route path="/driver" element={<DriverDashboard />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/trips/:tripId" element={<TripDetails />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>

      <Route
        path="/"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : user.role === "DRIVER" ? (
            <Navigate to={driverId ? "/driver" : "/driver/onboarding"} replace />
          ) : (
            <Navigate to="/rider" replace />
          )
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
