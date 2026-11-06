import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

// Access token sirf memory me rakhte hain (localStorage me nahi, taaki XSS se chori na ho)
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

// Ek samay me sirf ek refresh chale.
// React StrictMode me effect do baar chalta hai, aur refresh token rotate hota hai,
// to do refresh ek saath bhejne par doosra fail ho jata.
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

// Access token expire ho jaye (401) to ek baar refresh karke request dobara bhejo
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