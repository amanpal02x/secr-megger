import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');


const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Initialize session from Supabase shared cookie on mount
  useEffect(() => {
    const initSupabase = async () => {
      let { data: { session } } = await supabase.auth.getSession();
      
      // High-priority fallback: check URL query parameters for access_token and refresh_token
      if (!session) {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const urlAccessToken = urlParams.get('access_token');
          const urlRefreshToken = urlParams.get('refresh_token');
          
          if (urlAccessToken && urlRefreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: urlAccessToken,
              refresh_token: urlRefreshToken
            });
            if (!error) {
              session = data.session;
              urlParams.delete('access_token');
              urlParams.delete('refresh_token');
              const cleanSearch = urlParams.toString();
              const cleanUrl = window.location.pathname + (cleanSearch ? '?' + cleanSearch : '') + window.location.hash;
              window.history.replaceState({}, '', cleanUrl);
            }
          }
        } catch (urlErr) {
          console.error("URL session restore failed:", urlErr);
        }
      }

      // Secondary fallback: cookie parsing
      if (!session) {
        try {
          const cookieName = 'sb-qfjerdspejaapggtvtwu-auth-token=';
          const decodedCookie = decodeURIComponent(document.cookie);
          const ca = decodedCookie.split(';');
          let cookieValue = '';
          for (let i = 0; i < ca.length; i++) {
            let c = ca[i].trim();
            if (c.indexOf(cookieName) === 0) {
              cookieValue = c.substring(cookieName.length, c.length);
              break;
            }
          }
          if (cookieValue) {
            try {
              const parsed = JSON.parse(decodeURIComponent(cookieValue));
              if (parsed.access_token && parsed.refresh_token) {
                const { data } = await supabase.auth.setSession({
                  access_token: parsed.access_token,
                  refresh_token: parsed.refresh_token
                });
                session = data.session;
              }
            } catch (jsonErr) {
              console.error("JSON parsing of cookie value failed:", jsonErr);
            }
          }
        } catch (e) {
          console.error("Manual cookie session restore failed:", e);
        }
      }

      // Secondary fallback
      if (!session) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.auth.getSession();
          session = data.session;
        }
      }

      if (session) {
        localStorage.setItem('token', session.access_token);
        setToken(session.access_token);
      } else {
        localStorage.removeItem('token');
        setToken(null);
        setDbUser(null);
        setLoading(false);
      }
    };
    initSupabase();
  }, []);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setDbUser(data);
          } else {
            clearSession();
          }
        } catch (error) {
          console.error("Auth verification failed:", error);
          clearSession();
        }
      }
      setLoading(false);
    };

    const clearSession = () => {
      localStorage.removeItem('token');
      setToken(null);
      setDbUser(null);
    };

    if (token !== null) {
      verifyToken();
    }
  }, [token]);

  const login = async (email, password) => {
    console.log("AuthContext: Attempting fetch to /api/auth/login...");
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
  
      console.log("AuthContext: Received response status:", response.status);
      const data = await response.json();
      console.log("AuthContext: Received data:", data);
  
      if (response.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setDbUser(data);
        return { success: true, user: data };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error("AuthContext: Fetch error:", error);
      throw error;
    }
  };

  const sendOtp = async (phoneNumber) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });
      const data = await response.json();
      return { success: response.ok, message: data.message };
    } catch (error) {
      console.error("AuthContext: sendOtp error:", error);
      return { success: false, message: 'Connection failed' };
    }
  };

  const loginWithOtp = async (phoneNumber, otp) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, otp })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setDbUser(data);
        return { success: true, user: data };
      } else {
        return { success: false, message: data.message || 'OTP verification failed' };
      }
    } catch (error) {
      console.error("AuthContext: loginWithOtp error:", error);
      return { success: false, message: 'Connection failed' };
    }
  };

  const resetPassword = async (phoneNumber, otp, newPassword) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, otp, newPassword })
      });
      const data = await response.json();
      return { success: response.ok, message: data.message };
    } catch (error) {
      console.error("AuthContext: resetPassword error:", error);
      return { success: false, message: 'Connection failed' };
    }
  };

  const signup = async (email, password, phoneNumber) => {

  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Supabase sign out error:", e);
    }
    localStorage.removeItem('token');
    setToken(null);
    setDbUser(null);
  };

  const updateUserProfile = (userData) => {
    setDbUser(prev => ({
      ...prev,
      ...userData
    }));
  };

  const value = {
    dbUser,
    token,
    loading,
    login,
    sendOtp,
    loginWithOtp,
    resetPassword,
    signup,
    logout,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
