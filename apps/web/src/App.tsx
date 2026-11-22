import { useCallback } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router';
import './App.css';
import { useAuth } from './auth/authContext';
import { GuestOnly } from './auth/GuestOnly';
import { RequireAuth } from './auth/RequireAuth';
import { ConfirmSignUpForm } from './components/ConfirmSignUpForm';
import { ProfilePage } from './components/ProfilePage';
import { SignInForm } from './components/SignInForm';
import { SignUpForm } from './components/SignUpForm';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { HomePage } from './pages/app/HomePage';

/** Only the route table. Layout routes (no path) wrap their children via <Outlet />. */
function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />

      {/* Centered card: login, sign-up, confirm, 404 */}
      <Route element={<AuthLayout />}>
        <Route element={<GuestOnly />}>
          <Route path="login" element={<LoginRoute />} />
          <Route path="signup" element={<SignUpRoute />} />
          <Route path="confirm" element={<ConfirmRoute />} />
        </Route>
        <Route path="*" element={<p>Page not found. <Link to="/">Go home</Link></p>} />
      </Route>

      {/* Signed-in area: guard → sidebar layout → page */}
      <Route path="app" element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="profile" element={<ProfileRoute />} />
        </Route>
      </Route>
    </Routes>
  );
}

function LoginRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const message = (location.state as { message?: string } | null)?.message;

  return (
    <>
      {message && <p className="info">{message}</p>}
      <SignInForm
        onSignedIn={() => { /* Hub 'signedIn' → AuthProvider → GuestOnly redirects */ }}
        onNeedsConfirmation={(email) => navigate(`/confirm?email=${encodeURIComponent(email)}`)}
      />
      <p>No account? <Link to="/signup">Sign up</Link></p>
    </>
  );
}

function SignUpRoute() {
  const navigate = useNavigate();
  return (
    <>
      <SignUpForm onSignedUp={(email) => navigate(`/confirm?email=${encodeURIComponent(email)}`)} />
      <p>Already have an account? <Link to="/login">Sign in</Link></p>
    </>
  );
}

function ConfirmRoute() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get('email');

  if (!email) {
    return <Navigate to="/signup" replace />;   // someone opened /confirm directly
  }

  return (
    <ConfirmSignUpForm
      email={email}
      onConfirmed={() =>
        navigate('/login', { replace: true, state: { message: 'Email confirmed. You can sign in now.' } })
      }
    />
  );
}

/** Connects ProfilePage's "session expired" event to the auth context */
function ProfileRoute() {
  const { signOut } = useAuth();
  const handleSessionExpired = useCallback(() => {
    void signOut('Your session expired. Please sign in again.');
  }, [signOut]);

  return <ProfilePage onSessionExpired={handleSessionExpired} />;
}

export default App;
