import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { getCurrentUser, signOut as amplifySignOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { AuthContext, type AuthStatus } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [signOutMessage, setSignOutMessage] = useState<string | null>(null);

  useEffect(() => {
    const stopListening = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn') {
        setSignOutMessage(null);               // old message no longer relevant
        setStatus('signedIn');
      }
      if (payload.event === 'signedOut') setStatus('signedOut');
    });

    getCurrentUser().then(
      () => setStatus('signedIn'),
      () => setStatus('signedOut'),
    );

    return stopListening;
  }, []);

  // useCallback: the same function object on every render (see the note below)
  const signOut = useCallback(async (message?: string) => {
    setSignOutMessage(message ?? null);        // 1. remember why
    await amplifySignOut();                    // 2. Hub 'signedOut' → status → RequireAuth redirects
  }, []);

  return <AuthContext value={{ status, signOutMessage, signOut }}>{children}</AuthContext>;
}
