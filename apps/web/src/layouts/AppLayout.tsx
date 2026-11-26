import { Link, NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/authContext';
import { APP_NAME } from '../brand';
import { config } from '../config';
import { hasTier, useMe } from '../me/meContext';   // ← replace the useMe import
import { useState } from 'react';
import { Tutorial } from '../tutorial/Tutorial';



export function AppLayout() {
  const { signOut } = useAuth();
  const { me, error } = useMe();
  const [replayTutorial, setReplayTutorial] = useState(false);


  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/" className="brand">{APP_NAME}</Link>

        <nav className="sidenav">
          <NavLink to="/app" end>Home</NavLink>
          <NavLink to="/app/profile">Profile</NavLink>
          <NavLink to="/app/pro" className={hasTier(me, 'PRO') ? undefined : 'locked'}>
            {hasTier(me, 'PRO') ? 'Pro feature' : '🔒 Pro feature'}
          </NavLink>

        </nav>

        <div className="sidebar-footer">
          {me && <span className={`badge tier-${me.tier.toLowerCase()}`}>{me.tier}</span>}
          {error && <p className="error">{error}</p>}
          <button type="button" className="link" onClick={() => setReplayTutorial(true)}>Replay tutorial</button>

          <button onClick={() => void signOut()}>Sign out</button>
          <p className="hint">stage: {config.stage}</p>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
      <Tutorial replay={replayTutorial} onReplayDone={() => setReplayTutorial(false)} />

    </div>
  );
}
