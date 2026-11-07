import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api/v1' : 'http://localhost:5000/api/v1');

// Store access token in-memory only (never in localStorage to mitigate XSS risks)
let accessToken = null;
export const setAccessToken = (token) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;

const http = axios.create({ baseURL: API_URL, withCredentials: true });

http.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Ensure only a single refresh operation runs concurrently.
// Prevents race conditions during React StrictMode duplicate mounting and token rotation.
let refreshPromise = null;
export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, null, { withCredentials: true })
      .then((res) => {
        accessToken = res.data.accessToken;
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const NO_RETRY = ['/auth/login', '/auth/register', '/auth/refresh'];

// If access token expires (401), attempt a single refresh and retry the failed request
http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !NO_RETRY.includes(original.url)
    ) {
      original._retry = true;
      try {
        await refreshAccessToken();
        return http(original);
      } catch {
        accessToken = null;
      }
    }
    return Promise.reject(error);
  }
);

export default http;
