import { useEffect, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

type Claims = { email: string; sub: string; expiresAt: Date | null };

export function HomePage() {
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

  return (
    <section>
      <h2>Welcome</h2>
      {claims ? (
        <>
          <p>Signed in as <strong>{claims.email}</strong></p>
          <p className="hint">
            sub: {claims.sub}
            {claims.expiresAt && <> · ID token expires {claims.expiresAt.toLocaleTimeString()}</>}
          </p>
        </>
      ) : (
        <p className="hint">Loading session…</p>
      )}
    </section>
  );
}
