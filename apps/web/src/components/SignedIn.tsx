import { useEffect, useState } from 'react';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import { ProfilePage } from './ProfilePage';


type Claims = { email: string; sub: string; expiresAt: Date | null };

type Props = {
  onSignedOut: (message?: string) => void;
};

export function SignedIn({ onSignedOut }: Props) {
  const [claims, setClaims] = useState<Claims | null>(null);

  useEffect(() => {
    let active = true;
    fetchAuthSession().then((session) => {
      const payload = session.tokens?.idToken?.payload;
      if (active && payload) {
        setClaims({
          email: String(payload.email ?? ''),
          sub: String(payload.sub ?? ''),
          expiresAt: typeof payload.exp === 'number' ? new Date(payload.exp * 1000) : null,
        });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleSignOut() {
    await signOut();
    onSignedOut();
  }

async function handleSessionExpired() {
    await signOut();
    onSignedOut('Your session expired. Please sign in again.');
  }


  return (
    <section>
      <h2>Signed in</h2>
      {claims ? (
        <>
          <p>Email: <strong>{claims.email}</strong></p>
          <p className="hint">
            sub: {claims.sub}
            {claims.expiresAt && <> · ID token expires {claims.expiresAt.toLocaleTimeString()}</>}
          </p>
        </>
      ) : (
        <p className="hint">Loading session…</p>
      )}
      <ProfilePage onSessionExpired={handleSessionExpired} />

      <button onClick={handleSignOut}>Sign out</button>
    </section>
  );
}
