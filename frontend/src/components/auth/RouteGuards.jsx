import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRoleHomePath } from '../../utils/auth';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center pt-20">
      <p className="text-sm uppercase tracking-[0.16em] text-text-muted">Đang tải phiên đăng nhập...</p>
    </div>
  );
}

export function ProtectedRoute({ children }) {
  const location = useLocation();
  const { initializing, isAuthenticated, user } = useAuth();

  if (initializing) return <LoadingScreen />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const isProfileComplete = Boolean(user?.fullName?.trim()) && Boolean(user?.phone?.trim());
  const isSettingsPage = location.pathname.startsWith('/settings');
  if (!isProfileComplete && !isSettingsPage) {
    return <Navigate to="/settings" replace state={{ from: location.pathname, reason: 'complete-profile' }} />;
  }

  return children;
}

export function RoleRoute({ children, allowedRoles = [] }) {
  const { role } = useAuth();
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}

export function PublicOnlyRoute({ children }) {
  const { initializing, isAuthenticated, role } = useAuth();
  if (initializing) return <LoadingScreen />;
  if (isAuthenticated) {
    return <Navigate to={getRoleHomePath(role)} replace />;
  }
  return children;
}
