import { Link, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router';
import './App.css';
import { config } from './config';
import { ConfirmSignUpForm } from './components/ConfirmSignUpForm';
import { SignedIn } from './components/SignedIn';
import { SignInForm } from './components/SignInForm';
import { SignUpForm } from './components/SignUpForm';
import { GuestOnly } from './auth/GuestOnly';
import { RequireAuth } from './auth/RequireAuth';



function App() {
  const navigate = useNavigate();

  // Hub already set status = signedOut; this only adds the optional message
  function handleSignedOut(message?: string) {
    navigate('/login', { replace: true, state: { message } });
  }

  return (
    <main className="app">
      <h1>User Management</h1>

      <Routes>
        <Route path="/" element={<Navigate to="/app" replace />} />

        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/signup" element={<SignUpRoute />} />
          <Route path="/confirm" element={<ConfirmRoute />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/app" element={<SignedIn onSignedOut={handleSignedOut} />} />
        </Route>

        <Route path="*" element={<p>Page not found. <Link to="/">Go home</Link></p>} />
      </Routes>

      <footer className="hint">stage: {config.stage} · API: {config.apiUrl}</footer>
    </main>
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

export default App;
