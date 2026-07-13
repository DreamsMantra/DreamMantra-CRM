import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from '../config/roleNavigation';

export function ProtectedRoute({ children, role, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center dm-hero-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const allowed = roles || (role ? [role] : null);
  if (allowed) {
    const adminRoles = ['super_admin', 'admin'];
    const match = allowed.some((r) => {
      if (r === 'admin' && adminRoles.includes(user.role)) return true;
      return user.role === r;
    });
    if (!match) {
      return <Navigate to={getDashboardPath(user.role)} replace />;
    }
  }

  return children;
}
