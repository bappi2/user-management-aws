import { Link, Outlet } from 'react-router';
import { APP_NAME } from '../brand';
import { config } from '../config';

/** Centered card for login / sign-up / confirm */
export function AuthLayout() {
  return (
    <main className="app">
      <h1><Link to="/">{APP_NAME}</Link></h1>
      <Outlet />
      <footer className="hint">stage: {config.stage} · API: {config.apiUrl}</footer>
    </main>
  );
}
