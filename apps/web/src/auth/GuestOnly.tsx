import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth/authContext';

/** Login / sign-up pages. Already signed in → go where you wanted (or /app). */
export function GuestOnly() {
  const { status } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/app';

  if (status === 'loading') return <p className="hint">Loading…</p>;
  if (status === 'signedIn') return <Navigate to={from} replace />;
  return <Outlet />;
}
