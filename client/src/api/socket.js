import { io } from 'socket.io-client';
import { getAccessToken, refreshAccessToken } from './http';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.PROD ? window.location.origin : 'http://localhost:5000');

export function createSocket() {
  let retries = 0;

  const socket = io(SOCKET_URL, {
    autoConnect: false,
    // Har connect aur reconnect par taaza token jata hai
    auth: (cb) => cb({ token: getAccessToken() }),
  });

  // Token expire ho gaya ho to refresh karke dobara connect karo
  socket.on('connect_error', async (err) => {
    const tokenProblem =
      err.message === 'Invalid or expired token' || err.message === 'Access token missing';
    if (tokenProblem && retries < 2) {
      retries += 1;
      try {
        await refreshAccessToken();
        socket.connect();
      } catch {
        // refresh bhi fail hua, user ko login page par jana padega
      }
    }
  });

  socket.on('connect', () => {
    retries = 0;
  });

  return socket;
}