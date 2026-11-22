import { Link, Outlet } from 'react-router';
import { APP_NAME } from '../brand';
import { config } from '../config';

/** Grey page with a centred card for login / sign-up / confirm / password reset */
export function AuthLayout() {
  return (
    <div className="auth-page">
      <Link to="/" className="auth-brand">{APP_NAME}</Link>
      <main className="auth-card">
        <Outlet />
      </main>
      <footer className="hint">stage: {config.stage} · API: {config.apiUrl}</footer>
    </div>
  );
}
