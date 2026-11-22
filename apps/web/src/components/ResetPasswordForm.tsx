import { useState, type FormEvent } from 'react';
import { confirmResetPassword, resetPassword } from 'aws-amplify/auth';
import { errorMessage } from '../auth';

type Props = {
  email: string;
  onReset: () => void;
};

export function ResetPasswordForm({ email, onReset }: Props) {
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await confirmResetPassword({ username: email, confirmationCode: code.trim(), newPassword });
      onReset();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setError(null);
    setInfo(null);
    try {
      await resetPassword({ username: email });   // same call as step 1 = new code
      setInfo('If an account exists, a new code was sent.');
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2>Choose a new password</h2>
      <p>If an account exists for <strong>{email}</strong>, we sent it a 6-digit code.</p>
      <label>
        Code
        <input value={code} onChange={(e) => setCode(e.target.value)} required
               inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
      </label>
      <label>
        New password
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
               required autoComplete="new-password" minLength={8} />
      </label>
      <p className="hint">At least 8 characters, with upper and lower case letters and a digit.</p>
      {error && <p className="error">{error}</p>}
      {info && <p className="info">{info}</p>}
      <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Set new password'}</button>
      <button type="button" className="link" onClick={handleResend}>Resend code</button>
    </form>
  );
}
