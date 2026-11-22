import { Link, Outlet } from 'react-router';
import { useAuth } from '../auth/authContext';
import { APP_NAME } from '../brand';
import { config } from '../config';

/** Marketing pages: header with auth actions, footer with links */
export function PublicLayout() {
  const { status } = useAuth();

  return (
    <div className="public">
      <header className="public-header">
        <div className="container">
          <Link to="/" className="brand-link">{APP_NAME}</Link>

          <nav className="header-actions">
            {status === 'signedIn' && <Link to="/app" className="button primary">Open app</Link>}
            {status === 'signedOut' && (
              <>
                <Link to="/login">Log in</Link>
                <Link to="/signup" className="button primary">Sign up</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="public-main">
        <Outlet />
      </main>

      <footer className="public-footer">
        <div className="container">
          <span className="hint">© {new Date().getFullYear()} {APP_NAME}</span>
          <span className="hint">
            <Link to="/privacy">Privacy</Link> · stage: {config.stage}
          </span>
        </div>
      </footer>
    </div>
  );
}
