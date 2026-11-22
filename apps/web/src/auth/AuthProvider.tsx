import { useEffect, useState, type ReactNode } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { AuthContext, type AuthStatus } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    // 1. Listen first, so no event is missed
    const stopListening = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn') setStatus('signedIn');
      if (payload.event === 'signedOut') setStatus('signedOut');
    });

    // 2. Ask once: are tokens already stored? (page reload)
    getCurrentUser().then(
      () => setStatus('signedIn'),
      () => setStatus('signedOut'),
    );

    return stopListening;   // cleanup when the provider unmounts
  }, []);

  return <AuthContext value={{ status }}>{children}</AuthContext>;
}
