import apiClient from "./client";

export function createRideRequest({ riderId, pickupLat, pickupLng, dropLat, dropLng }) {
  return apiClient
    .post("/riders/requests", { riderId, pickupLat, pickupLng, dropLat, dropLng })
    .then((res) => res.data);
}

export function getRideRequests(riderId) {
  return apiClient.get(`/riders/${riderId}/requests`).then((res) => res.data);
}

export function cancelRideRequest(requestId) {
  return apiClient.post(`/riders/requests/${requestId}/cancel`).then((res) => res.data);
}
