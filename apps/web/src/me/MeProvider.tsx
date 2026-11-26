import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { ApiError, getMe, type Me } from '../api';
import { errorMessage } from '../auth';
import { useAuth } from '../auth/authContext';
import { MeContext } from './meContext';

/** Loads GET /v1/users/me once per signed-in visit. Layout route inside RequireAuth → unmounts on sign-out. */
export function MeProvider() {
  const { signOut } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback(async (e: unknown) => {
    if (e instanceof ApiError && e.isAuthError) {
      await signOut('Your session expired. Please sign in again.');
      return;
    }
    setError(errorMessage(e));
  }, [signOut]);

  // For callers after an event (tutorial finished, later: checkout)
  const reload = useCallback(async () => {
    try {
      setMe(await getMe());
      setError(null);
    } catch (e) {
      await handleError(e);
    }
  }, [handleError]);

  // First load: setState only in the promise callbacks, ignored after unmount
  useEffect(() => {
    let active = true;
    getMe().then(
      (result) => {
        if (active) {
          setMe(result);
          setError(null);
        }
      },
      (e: unknown) => {
        if (active) void handleError(e);
      },
    );
    return () => {
      active = false;
    };
  }, [handleError]);

  return (
    <MeContext value={{ me, error, reload }}>
      <Outlet />
    </MeContext>
  );
}
