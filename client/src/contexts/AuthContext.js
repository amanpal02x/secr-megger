import React, { createContext, useContext, useEffect, useState } from 'react';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');


const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

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

            logout();
          }
        } catch (error) {
          console.error("Auth verification failed:", error);
          logout();
        }
      }
      setLoading(false);
    };

    verifyToken();
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

  const logout = () => {
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
