import apiClient from "./client";

export function getPaymentByTrip(tripId) {
  return apiClient.get(`/payments/trip/${tripId}`).then((res) => res.data);
}

export function refundPayment(paymentId, reason) {
  return apiClient.post(`/payments/${paymentId}/refund`, { reason }).then((res) => res.data);
}
