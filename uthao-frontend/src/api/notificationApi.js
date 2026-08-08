import apiClient from "./client";

export function getNotifications(userId) {
  return apiClient.get(`/notifications/user/${userId}`).then((res) => res.data);
}

export function markNotificationRead(id) {
  return apiClient.patch(`/notifications/${id}/read`).then((res) => res.data);
}
