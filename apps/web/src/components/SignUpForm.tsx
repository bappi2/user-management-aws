import { useState, type FormEvent } from 'react';
import { signUp } from 'aws-amplify/auth';
import { errorMessage } from '../auth';

type Props = {
  onSignedUp: (email: string) => void;
};

export function SignUpForm({ onSignedUp }: Props) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: { email, given_name: firstName, family_name: lastName },
        },
      });
      onSignedUp(email);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2>Sign up</h2>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </label>
      <label>
        First name
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoComplete="given-name" />
      </label>
      <label>
        Last name
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} required autoComplete="family-name" />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
               required minLength={8} autoComplete="new-password" />
      </label>
      <p className="hint">At least 8 characters, with upper case, lower case and a digit.</p>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? 'Signing up…' : 'Sign up'}</button>
    </form>
  );
}
