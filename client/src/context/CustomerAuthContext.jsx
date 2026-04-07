import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const CustomerAuthContext = createContext(null);

export function CustomerAuthProvider({ children, slug }) {
  const [customer, setCustomer] = useState(null);
  const [token,    setToken]    = useState(null);
  const [loading,  setLoading]  = useState(true);

  // Key is scoped to the store slug so customers of different stores don't collide
  const TOKEN_KEY    = `customerToken_${slug}`;
  const CUSTOMER_KEY = `customerUser_${slug}`;

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    const c = localStorage.getItem(CUSTOMER_KEY);
    if (t && c) {
      setToken(t);
      setCustomer(JSON.parse(c));
    }
    setLoading(false);
  }, [slug]);

  const login = async (email, password) => {
    const { data } = await axios.post('/api/customer/login', { email, password, company_slug: slug });
    setToken(data.token);
    setCustomer(data.customer);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(data.customer));
    return data;
  };

  const register = async (full_name, email, password) => {
    const { data } = await axios.post('/api/customer/register', { full_name, email, password, company_slug: slug });
    setToken(data.token);
    setCustomer(data.customer);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(data.customer));
    return data;
  };

  const logout = () => {
    setToken(null);
    setCustomer(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_KEY);
  };

  return (
    <CustomerAuthContext.Provider value={{ customer, token, login, register, logout, loading }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export const useCustomerAuth = () => useContext(CustomerAuthContext);
