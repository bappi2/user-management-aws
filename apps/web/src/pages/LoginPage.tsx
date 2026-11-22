import { Link, useLocation, useNavigate } from 'react-router';
import { SignInForm } from '../components/SignInForm';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const message = (location.state as { message?: string } | null)?.message;

  return (
    <>
      {message && <p className="info">{message}</p>}
      <SignInForm
        onSignedIn={() => { /* Hub 'signedIn' → AuthProvider → GuestOnly redirects */ }}
        onNeedsConfirmation={(email) => navigate(`/confirm?email=${encodeURIComponent(email)}`)}
      />
      <p>No account? <Link to="/signup">Sign up</Link></p>
    </>
  );
}
