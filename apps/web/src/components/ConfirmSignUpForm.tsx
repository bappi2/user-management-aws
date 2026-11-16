import { useState, type FormEvent } from 'react';
import { confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';
import { errorMessage } from '../auth';

type Props = {
  email: string;
  onConfirmed: () => void;
};

export function ConfirmSignUpForm({ email, onConfirmed }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await confirmSignUp({ username: email, confirmationCode: code.trim() });
      onConfirmed();
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
      await resendSignUpCode({ username: email });
      setInfo('A new code was sent.');
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h2>Confirm your email</h2>
      <p>We sent a 6-digit code to <strong>{email}</strong>.</p>
      <label>
        Code
        <input value={code} onChange={(e) => setCode(e.target.value)} required
               inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
      </label>
      {error && <p className="error">{error}</p>}
      {info && <p className="info">{info}</p>}
      <button type="submit" disabled={busy}>{busy ? 'Confirming…' : 'Confirm'}</button>
      <button type="button" className="link" onClick={handleResend}>Resend code</button>
    </form>
  );
}
