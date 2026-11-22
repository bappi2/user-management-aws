import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth/authContext';

/** Signed-in pages only. Signed out → /login, remembering where the user wanted to go. */
export function RequireAuth() {
  const { status, signOutMessage } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <p className="hint">Loading…</p>;
    if (status === 'signedOut') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname, message: signOutMessage ?? undefined }}
      />
    );
  }
  return <Outlet />;
}
