import apiClient from "./client";

export function findDriver({ rideRequestId, riderId, pickupLat, pickupLng, dropLat, dropLng }) {
  return apiClient
    .post("/matching/find-driver", {
      rideRequestId,
      riderId,
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
    })
    .then((res) => res.data);
}
