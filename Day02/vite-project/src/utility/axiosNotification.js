import axios from "axios";
import nprogress from "nprogress";
import "nprogress/nprogress.css";

// Configure nprogress
nprogress.configure({ showSpinner: false, speed: 400, minimum: 0.2 });

const notificationBaseUrl = import.meta.env.VITE_NOTIFICATION_API_BASE_URL || "http://localhost:3001";

const axiosNotification = axios.create({
  baseURL: notificationBaseUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Start progress bar
axiosNotification.interceptors.request.use(
  (config) => {
    nprogress.start();
    return config;
  },
  (error) => {
    nprogress.done();
    return Promise.reject(error);
  }
);

// Response Interceptor: End progress bar
axiosNotification.interceptors.response.use(
  (response) => {
    nprogress.done();
    return response;
  },
  (error) => {
    nprogress.done();
    return Promise.reject(error);
  }
);

export default axiosNotification;
