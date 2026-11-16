import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, getProfile, updateProfile, type FieldError, type Profile } from '../api';


type ErrorState = { message: string | null; fieldErrors: FieldError[]; sessionExpired: boolean };

const NO_ERROR: ErrorState = { message: null, fieldErrors: [], sessionExpired: false };

/** Turn anything thrown into what the screen should show. */
function toErrorState(e: unknown): ErrorState {
  if (e instanceof ApiError) {
    if (e.isAuthError) {
      return { ...NO_ERROR, sessionExpired: true };
    }
    return {
      message: `${e.problem?.title ?? `HTTP ${e.status}`}: ${e.message}`,
      fieldErrors: e.problem?.errors ?? [],
      sessionExpired: false,
    };
  }
  return { ...NO_ERROR, message: e instanceof Error ? e.message : String(e) };
}

type Props = {
  onSessionExpired: () => void;
};

export function ProfilePage({ onSessionExpired }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [errorState, setErrorState] = useState<ErrorState>(NO_ERROR);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // Load the profile once, when the page appears
  useEffect(() => {
    let active = true;
    getProfile()
      .then((loaded) => {
        if (active) {
          setProfile(loaded);
          setFirstName(loaded.firstName);
          setLastName(loaded.lastName);
        }
      })
      .catch((e) => {
        if (active) {
          setErrorState(toErrorState(e));
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Token rejected (401/403) → tell the parent to sign out
  useEffect(() => {
    if (errorState.sessionExpired) {
      onSessionExpired();
    }
  }, [errorState.sessionExpired, onSessionExpired]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorState(NO_ERROR);
    setSaved(false);
    setBusy(true);
    try {
      await updateProfile({ firstName, lastName });
      setProfile(await getProfile());   // read back what the server stored
      setSaved(true);
    } catch (e) {
      setErrorState(toErrorState(e));
    } finally {
      setBusy(false);
    }
  }

  if (!profile && !errorState.message) {
    return <p className="hint">Loading profile…</p>;
  }

  return (
    <form className="form" onSubmit={handleSave}>
      <h2>Your profile</h2>
      {profile && <p className="hint">Email: {profile.email} · id: {profile.id}</p>}

      {/* No `required` here on purpose: lets you see the API's own validation in action */}
      <label>
        First name
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
      </label>
      <label>
        Last name
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
      </label>

      {errorState.message && <p className="error">{errorState.message}</p>}
      {errorState.fieldErrors.length > 0 && (
        <ul className="error">
          {errorState.fieldErrors.map((fieldError) => (
            <li key={fieldError.code}>{fieldError.description}</li>
          ))}
        </ul>
      )}
      {saved && <p className="info">Saved.</p>}

      <button type="submit" disabled={busy || !profile}>{busy ? 'Saving…' : 'Save'}</button>
    </form>
  );
}
