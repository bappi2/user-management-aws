import { useEffect, useState } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router';
import './App.css';
import { config } from './config';
import { ConfirmSignUpForm } from './components/ConfirmSignUpForm';
import { SignedIn } from './components/SignedIn';
import { SignInForm } from './components/SignInForm';
import { SignUpForm } from './components/SignUpForm';

function App() {
  // null = still checking; true/false = answer from Amplify (tokens survive a reload)
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getCurrentUser()
      .then(() => setSignedIn(true))
      .catch(() => setSignedIn(false));
  }, []);

  if (signedIn === null) {
    return <main className="app"><p className="hint">Loading…</p></main>;
  }

  function handleSignedIn() {
    setSignedIn(true);
    navigate('/app');
  }

  function handleSignedOut(message?: string) {
    setSignedIn(false);
    navigate('/login', { replace: true, state: { message } });
  }

  return (
    <main className="app">
      <h1>User Management</h1>

      <Routes>
        <Route path="/" element={<Navigate to={signedIn ? '/app' : '/login'} replace />} />
        <Route
          path="/login"
          element={signedIn ? <Navigate to="/app" replace /> : <LoginRoute onSignedIn={handleSignedIn} />}
        />
        <Route path="/signup" element={<SignUpRoute />} />
        <Route path="/confirm" element={<ConfirmRoute />} />
        <Route
          path="/app"
          element={signedIn ? <SignedIn onSignedOut={handleSignedOut} /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<p>Page not found. <Link to="/">Go home</Link></p>} />
      </Routes>

      <footer className="hint">stage: {config.stage} · API: {config.apiUrl}</footer>
    </main>
  );
}

function LoginRoute({ onSignedIn }: { onSignedIn: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const message = (location.state as { message?: string } | null)?.message;

  return (
    <>
      {message && <p className="info">{message}</p>}
      <SignInForm
        onSignedIn={onSignedIn}
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
