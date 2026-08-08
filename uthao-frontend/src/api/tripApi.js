import apiClient from "./client";

export function getTrip(tripId) {
  return apiClient.get(`/trips/${tripId}`).then((res) => res.data);
}

// Resolves the tripId trip-service creates asynchronously after a
// driver.assigned event. 404s until the RabbitMQ listener has run —
// callers should treat a 404 as "not created yet" and poll.
export function getTripByRideRequest(rideRequestId) {
  return apiClient.get(`/trips/by-request/${rideRequestId}`).then((res) => res.data);
}

export function startTrip(tripId) {
  return apiClient.post(`/trips/${tripId}/start`).then((res) => res.data);
}

export function completeTrip(tripId) {
  return apiClient.post(`/trips/${tripId}/complete`).then((res) => res.data);
}

export function cancelTrip(tripId) {
  return apiClient.post(`/trips/${tripId}/cancel`).then((res) => res.data);
}
