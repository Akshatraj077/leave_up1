import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowWhenMustChange = false }) => {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.admin_password_reset_required && !allowWhenMustChange) {
    return <Navigate to="/change-password" replace />;
  }

  return children;
};

export default ProtectedRoute;
