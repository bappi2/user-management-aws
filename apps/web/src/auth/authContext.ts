import { createContext, useContext } from 'react';

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

/** An object, not just the status: 4.3 adds the user's tier here */
export type AuthState = { status: AuthStatus };

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return value;
}
