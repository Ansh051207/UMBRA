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
      console.log('🔍 Auth: Initial token set from localStorage');
    }
    return storedToken;
  });

  // Initialize authentication
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      console.log('🔍 Auth: Initializing with token:', storedToken ? 'Present' : 'Missing');

      if (storedToken) {
        try {
          // Verify token is valid
          console.log('🔍 Auth: Validating token with server...');
          const response = await axios.get(`${API_URL}/auth/me`);
          console.log('🔍 Auth: Token valid, user:', response.data.user.email);
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
        console.log('🔍 Auth: No token found, user is not authenticated');
      }
      setLoading(false);
      console.log('🔍 Auth: Initialization complete');
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      console.log('🔍 Auth: Attempting login for:', email);
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { token, user } = response.data;

      console.log('🔍 Auth: Login successful, token received');

      // Store token
      localStorage.setItem('token', token);

      // Set axios headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setUser(user);
      setToken(token);

      console.log('🔍 Auth: User set and headers configured');

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
    console.log('🔍 Auth: Logging out');
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