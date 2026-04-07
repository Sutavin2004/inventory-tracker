import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const PlatformAuthContext = createContext(null);

export function PlatformAuthProvider({ children }) {
  const [platformUser, setPlatformUser] = useState(null);
  const [token,        setToken]        = useState(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('platformToken');
    const u = localStorage.getItem('platformUser');
    if (t && u) {
      setToken(t);
      setPlatformUser(JSON.parse(u));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const { data } = await axios.post('/api/platform/login', { username, password });
    setToken(data.token);
    setPlatformUser(data.user);
    localStorage.setItem('platformToken', data.token);
    localStorage.setItem('platformUser', JSON.stringify(data.user));
    return data;
  };

  const logout = () => {
    setToken(null);
    setPlatformUser(null);
    localStorage.removeItem('platformToken');
    localStorage.removeItem('platformUser');
  };

  return (
    <PlatformAuthContext.Provider value={{ platformUser, token, login, logout, loading }}>
      {children}
    </PlatformAuthContext.Provider>
  );
}

export const usePlatformAuth = () => useContext(PlatformAuthContext);
