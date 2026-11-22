import { NavLink } from 'react-router';

/** Sign in | Create account switch. Each tab is a URL, so reload and deep links keep the tab. */
export function AuthTabs() {
  return (
    <nav className="tabs" aria-label="Sign in or create account">
      <NavLink to="/login" replace>Sign in</NavLink>
      <NavLink to="/signup" replace>Create account</NavLink>
    </nav>
  );
}
