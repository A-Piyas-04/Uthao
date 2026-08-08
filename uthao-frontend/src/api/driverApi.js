import apiClient from "./client";

export function registerDriver({ userId, name, email, phone, licenseNumber }) {
  return apiClient
    .post("/drivers", { userId, name, email, phone, licenseNumber })
    .then((res) => res.data);
}

export function addVehicle(driverId, { make, model, plateNumber, color }) {
  return apiClient
    .post(`/drivers/${driverId}/vehicles`, { make, model, plateNumber, color })
    .then((res) => res.data);
}

export function updateDriverStatus(driverId, { status, currentLat, currentLng }) {
  return apiClient
    .patch(`/drivers/${driverId}/status`, { status, currentLat, currentLng })
    .then((res) => res.data);
}

// Reads back the status set above. A driver who has never toggled status yet
// has no DriverStatus row at all — the backend defaults that case to OFFLINE
// rather than 404ing, since "no status set yet" is normal, not an error.
export function getDriverStatus(driverId) {
  return apiClient.get(`/drivers/${driverId}/status`).then((res) => res.data);
}

export function getAvailableDrivers(lat, lng, radiusKm = 5.0) {
  return apiClient
    .get("/drivers/available", { params: { lat, lng, radiusKm } })
    .then((res) => res.data);
}

export function getDriver(driverId) {
  return apiClient.get(`/drivers/${driverId}`).then((res) => res.data);
}

// Resolves driver-service's own Driver.id from the identity-service userId.
// Every other driver-service endpoint is keyed by that id, not by userId.
// 404 means this user hasn't completed driver onboarding yet.
export function getDriverByUserId(userId) {
  return apiClient.get(`/drivers/by-user/${userId}`).then((res) => res.data);
}

export function getDriverTrips(driverId) {
  return apiClient.get(`/drivers/${driverId}/trips`).then((res) => res.data);
}
