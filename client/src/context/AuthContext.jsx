import { useEffect, useState } from 'react';
import http, { setAccessToken, refreshAccessToken } from '../api/http';
import { AuthContext } from './useAuth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from httpOnly refresh cookie on initial application load
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await refreshAccessToken();
        const { data } = await http.get('/auth/me');
        if (active) setUser(data.user);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = async (email, password) => {
    const { data } = await http.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const register = async (payload) => {
    await http.post('/auth/register', payload);
    await login(payload.email, payload.password);
  };

  const logout = async () => {
    try {
      await http.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}