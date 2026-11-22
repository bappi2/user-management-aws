import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/authContext';
import { config } from '../config';

export function AppLayout() {
  const { signOut } = useAuth();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">User Management</div>

        <nav className="sidenav">
          <NavLink to="/app" end>Home</NavLink>
          <NavLink to="/app/profile">Profile</NavLink>
        </nav>

        <div className="sidebar-footer">
          <button onClick={() => void signOut()}>Sign out</button>
          <p className="hint">stage: {config.stage}</p>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
