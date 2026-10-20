import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireAuth({ children, admin }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="wrap" style={{ padding: 40 }}>Loading...</div>;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname + loc.search }} replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
