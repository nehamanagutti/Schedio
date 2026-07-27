// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('schedio_token');
    if (token) {
      api.me()
        .then(({ user }) => setUser(user))
        .catch(() => localStorage.removeItem('schedio_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Heartbeat every 30s
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => api.heartbeat().catch(() => {}), 30000);
    return () => clearInterval(id);
  }, [user]);

  async function login(phone, password) {
    const { token, user } = await api.login({ phone, password });
    localStorage.setItem('schedio_token', token);
    setUser(user);
  }

  async function loginWithFirebase(idToken) {
    const { token, user } = await api.firebaseLogin(idToken);
    localStorage.setItem('schedio_token', token);
    setUser(user);
  }

  // Step 1: submit signup details, triggers an OTP email. Does NOT log the
  // user in yet; no account exists until the code is verified.
  async function register(data) {
    return api.register(data); // -> { pending: true, email }
  }

  // Step 2: confirm the emailed code. This is what actually creates the
  // account and logs the user in.
  async function verifyOtp(email, code) {
    const { token, user } = await api.verifyOtp({ email, code });
    localStorage.setItem('schedio_token', token);
    setUser(user);
  }

  async function resendOtp(email) {
    return api.resendOtp({ email });
  }

  function logout() {
    localStorage.removeItem('schedio_token');
    setUser(null);
  }

  async function updateUser(data) {
    const { user: updated } = await api.updateProfile(data);
    setUser(updated);
    return updated;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithFirebase, register, verifyOtp, resendOtp, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
