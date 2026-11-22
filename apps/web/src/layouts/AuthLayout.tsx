import { Outlet } from 'react-router';
import { config } from '../config';

/** Centered card for login / sign-up / confirm / 404 */
export function AuthLayout() {
  return (
    <main className="app">
      <h1>User Management</h1>
      <Outlet />
      <footer className="hint">stage: {config.stage} · API: {config.apiUrl}</footer>
    </main>
  );
}
