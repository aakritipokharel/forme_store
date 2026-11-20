import { useEffect, useState } from 'react';
import api from '../services/api';
import AuthContext from './authContext';

const tokenKey = 'clothingStoreToken';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(
    () => Boolean(window.localStorage.getItem(tokenKey)),
  );

  useEffect(() => {
    let active = true;
    const token = window.localStorage.getItem(tokenKey);

    if (!token) {
      return () => {
        active = false;
      };
    }

    api.get('/auth/me')
      .then(({ data }) => {
        if (active) {
          setUser(data.data.user);
        }
      })
      .catch((error) => {
        if (error.response?.status === 401) {
          window.localStorage.removeItem(tokenKey);
        }
        if (active) {
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    window.localStorage.setItem(tokenKey, data.data.token);
    setUser(data.data.user);
    return data.data.user;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    return data.data.user;
  };

  const logout = () => {
    window.localStorage.removeItem(tokenKey);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
