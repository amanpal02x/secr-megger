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
            // Token invalid or expired
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

  const signup = async (email, password, phoneNumber) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, phoneNumber })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setDbUser(data);
      return { success: true };
    } else {
      return { success: false, message: data.message || 'Signup failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setDbUser(null);
  };

  const value = {
    dbUser,
    token,
    loading,
    login,
    signup,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
