import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { defaultPathForUser, hasAnyRole } from '../utils/roles';
import type { AppRole } from '../utils/roles';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  roles?: AppRole[];
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { user } = useAuth();
  const accessToken = useAuthStore((state) => state.accessToken);
  if (accessToken && !user) return <div className="p-8 text-sm text-gray-500">Restaurando sesion...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !hasAnyRole(user, roles)) {
    return <Navigate to={defaultPathForUser(user)} replace />;
  }
  return <Outlet />;
}
