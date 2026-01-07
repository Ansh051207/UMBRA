import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => {
    // Try to get token from localStorage
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      // Set axios headers immediately
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

    }
    return storedToken;
  });

  // Initialize authentication
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');


      if (storedToken) {
        try {
          // Verify token is valid

          const response = await axios.get(`${API_URL}/auth/me`);

          setUser(response.data.user);
          setToken(storedToken);
        } catch (error) {
          console.error('🔍 Auth: Token invalid, clearing:', error.message);
          // Clear invalid token
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
          setToken(null);
        }
      } else {

      }
      setLoading(false);

    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {

      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { token, user } = response.data;



      // Store token
      localStorage.setItem('token', token);

      // Set axios headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setUser(user);
      setToken(token);



      return { success: true, user };
    } catch (error) {
      console.error('🔍 Auth: Login error:', error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      const { token, user } = response.data;

      // Store token
      localStorage.setItem('token', token);

      // Set axios headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setUser(user);
      setToken(token);

      return { success: true };
    } catch (error) {
      console.error('🔍 Auth: Registration error:', error);

      const errorMessage = error.response?.data?.error ||
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.msg ||
        'Registration failed';

      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const logout = () => {

    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setToken(null);
    // Navigate to login
    window.location.href = '/login';
  };

  // Simple check - if we have a token, consider user authenticated
  const isAuthenticated = !!token;

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};