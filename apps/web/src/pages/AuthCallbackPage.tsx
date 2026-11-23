import { Link, Navigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/authContext';

/**
 * Cognito redirects here after Google (redirect_uri = <origin>/auth/callback).
 * Amplify exchanges ?code= for tokens on its own; we only wait for the result.
 */
export function AuthCallbackPage() {
  const { status } = useAuth();
  const [params] = useSearchParams();
  const urlError = params.get('error_description') ?? params.get('error');   // e.g. cancelled at Google

  if (status === 'signedIn') {
    return <Navigate to="/app" replace />;
  }

  if (urlError || status === 'signedOut') {
    return (
      <>
        <h2>Sign-in failed</h2>
        <p className="error">{urlError ?? 'Sign-in did not complete. Please try again.'}</p>
        <p><Link to="/login">Back to sign in</Link></p>
      </>
    );
  }

  return <p>Signing you in…</p>;   // status 'loading': Amplify is exchanging the code
}
