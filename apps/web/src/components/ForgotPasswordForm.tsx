import { useState, type FormEvent } from 'react';
import { resetPassword } from 'aws-amplify/auth';
import { errorMessage } from '../auth';

type Props = {
  onCodeSent: (email: string) => void;
};

export function ForgotPasswordForm({ onCodeSent }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await resetPassword({ username: email.trim() });
      onCodeSent(email.trim());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2>Reset your password</h2>
      <p className="hint">Enter your email and we'll send you a code.</p>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send code'}</button>
    </form>
  );
}
