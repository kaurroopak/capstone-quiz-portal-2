import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: 'STUDENT' | 'TEACHER';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRole }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <div className="progress-bar-container" style={{ width: '200px' }}>
          <div className="progress-bar-fill" style={{ width: '100%', animation: 'pulse 1.5s infinite' }}></div>
        </div>
        <p style={{ fontWeight: 700, color: 'var(--color-text-light)' }}>Loading Quiz Portal...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    // Route to their correct dashboard
    return user.role === 'TEACHER'
      ? <Navigate to="/teacher/dashboard" replace />
      : <Navigate to="/student/dashboard" replace />;
  }

  return <>{children}</>;
};
