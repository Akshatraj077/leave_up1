import React, { createContext, useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('hrms_token');
      const storedUser = localStorage.getItem('hrms_user');
      
      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('hrms_token', token);
    localStorage.setItem('hrms_user', JSON.stringify(userData));
    setUser(userData);
  };

  const clearMustChangePassword = () => {
    const updatedUser = { ...user, admin_password_reset_required: false };
    localStorage.setItem('hrms_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const logout = () => {
    localStorage.removeItem('hrms_token');
    localStorage.removeItem('hrms_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading, clearMustChangePassword }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
