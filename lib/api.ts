import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.surfgistics.com";

export const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const hadToken = !!localStorage.getItem("access_token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      if (hadToken) window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
