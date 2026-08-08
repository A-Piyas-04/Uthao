import apiClient from "./client";

export function registerUser({ name, email, password, role }) {
  return apiClient
    .post("/auth/register", { name, email, password, role })
    .then((res) => res.data);
}

export function loginUser({ email, password }) {
  return apiClient.post("/auth/login", { email, password }).then((res) => res.data);
}

export function getCurrentUser() {
  return apiClient.get("/auth/me").then((res) => res.data);
}
