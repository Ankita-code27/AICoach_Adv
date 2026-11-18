import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function ProtectedRoute({ children, requireVerified = true }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="page-status">Checking your session…</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireVerified && !user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return children;
}

export default ProtectedRoute;
