import { useState, type FormEvent } from 'react';
import { signIn } from 'aws-amplify/auth';
import { errorMessage } from '../auth';

type Props = {
  onSignedIn: () => void;
  onNeedsConfirmation: (email: string) => void;
};

export function SignInForm({ onSignedIn, onNeedsConfirmation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { isSignedIn, nextStep } = await signIn({ username: email, password });
      if (isSignedIn) {
        onSignedIn();
      } else if (nextStep.signInStep === 'CONFIRM_SIGN_UP') {
        onNeedsConfirmation(email);   // signed up earlier but never entered the code
      } else {
        setError(`Unsupported sign-in step: ${nextStep.signInStep}`);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2>Sign in</h2>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
               required autoComplete="current-password" />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}
