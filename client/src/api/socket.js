import { io } from 'socket.io-client';
import { getAccessToken, refreshAccessToken } from './http';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.PROD ? window.location.origin : 'http://localhost:5000');

export function createSocket() {
  let retries = 0;

  const socket = io(SOCKET_URL, {
    autoConnect: false,
    // Pass latest in-memory access token on connection and reconnection attempts
    auth: (cb) => cb({ token: getAccessToken() }),
  });

  // Handle token expiration errors by attempting a token refresh and reconnecting
  socket.on('connect_error', async (err) => {
    const tokenProblem =
      err.message === 'Invalid or expired token' || err.message === 'Access token missing';
    if (tokenProblem && retries < 2) {
      retries += 1;
      try {
        await refreshAccessToken();
        socket.connect();
      } catch {
        // If refresh fails, user session has expired and authentication is required
      }
    }
  });

  socket.on('connect', () => {
    retries = 0;
  });

  return socket;
}
