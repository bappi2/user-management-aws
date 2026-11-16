import { useEffect, useState } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import './App.css';
import { config } from './config';
import { ConfirmSignUpForm } from './components/ConfirmSignUpForm';
import { SignedIn } from './components/SignedIn';
import { SignInForm } from './components/SignInForm';
import { SignUpForm } from './components/SignUpForm';

type View =
  | { name: 'loading' }
  | { name: 'signIn'; message?: string }
  | { name: 'signUp' }
  | { name: 'confirm'; email: string }
  | { name: 'signedIn' };

function App() {
  const [view, setView] = useState<View>({ name: 'loading' });

  // On page load: are we already signed in? (tokens survive a page reload)
  useEffect(() => {
    getCurrentUser()
      .then(() => setView({ name: 'signedIn' }))
      .catch(() => setView({ name: 'signIn' }));
  }, []);

  return (
    <main className="app">
      <h1>User Management</h1>

      {view.name === 'loading' && <p className="hint">Loading…</p>}

      {view.name === 'signIn' && (
        <>
          {view.message && <p className="info">{view.message}</p>}
          <SignInForm
            onSignedIn={() => setView({ name: 'signedIn' })}
            onNeedsConfirmation={(email) => setView({ name: 'confirm', email })}
          />
          <p>
            No account?{' '}
            <button className="link" onClick={() => setView({ name: 'signUp' })}>Sign up</button>
          </p>
        </>
      )}

      {view.name === 'signUp' && (
        <>
          <SignUpForm onSignedUp={(email) => setView({ name: 'confirm', email })} />
          <p>
            Already have an account?{' '}
            <button className="link" onClick={() => setView({ name: 'signIn' })}>Sign in</button>
          </p>
        </>
      )}

      {view.name === 'confirm' && (
        <ConfirmSignUpForm
          email={view.email}
          onConfirmed={() => setView({ name: 'signIn', message: 'Email confirmed. You can sign in now.' })}
        />
      )}

      {view.name === 'signedIn' && <SignedIn onSignedOut={() => setView({ name: 'signIn' })} />}

      <footer className="hint">stage: {config.stage} · API: {config.apiUrl}</footer>
    </main>
  );
}

export default App;
