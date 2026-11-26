import { useEffect, useState } from 'react';
import { ApiError, getProDemo } from '../../api';
import { errorMessage } from '../../auth';
import { useAuth } from '../../auth/authContext';
import { UpgradePrompt } from '../../components/UpgradePrompt';
import { hasTier, useMe } from '../../me/meContext';

/** Demo of a tier-gated page. Copy this shape for real PRO features. */
export function ProPage() {
  const { me, reload } = useMe();
  const { signOut } = useAuth();
  const allowed = hasTier(me, 'PRO');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tierDenied, setTierDenied] = useState(false);

  useEffect(() => {
    if (!allowed) return;                    // UI already knows: don't call the API
    let active = true;
    getProDemo().then(
      (result) => active && setMessage(result.message),
      (e: unknown) => {
        if (!active) return;
        if (e instanceof ApiError && e.isTierError) {
          setTierDenied(true);               // downgraded since /me loaded
          void reload();                     // refresh the badge + sidebar lock
        } else if (e instanceof ApiError && e.isAuthError) {
          void signOut('Your session expired. Please sign in again.');
        } else {
          setError(errorMessage(e));
        }
      },
    );
    return () => {
      active = false;
    };
  }, [allowed, reload, signOut]);

  if (!me) return <p className="hint">Loading…</p>;
  if (!allowed || tierDenied) return <UpgradePrompt required="PRO" />;

  return (
    <section>
      <h2>Pro feature</h2>
      {error && <p className="error">{error}</p>}
      {message ? <p>{message}</p> : !error && <p className="hint">Loading…</p>}
    </section>
  );
}
