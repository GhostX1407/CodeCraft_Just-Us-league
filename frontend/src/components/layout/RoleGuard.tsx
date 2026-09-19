import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../services/authStore';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

/**
 * Route protection guard that enforces role-based access control.
 * Unauthorized role accesses are automatically redirected to the user's authoritative console.
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = user.role;
  const isAllowed =
    allowedRoles.includes(role) ||
    (role === 'coordinator' && allowedRoles.includes('hospital')) ||
    (role === 'hospital' && allowedRoles.includes('coordinator'));

  if (!isAllowed) {
    // Redirect to their designated primary portal
    return <Navigate to={user.redirectPath || '/'} replace />;
  }

  return <>{children}</>;
};
