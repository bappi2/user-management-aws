import { Link, useLocation, useNavigate } from 'react-router';
import { AuthTabs } from '../components/AuthTabs';
import { SignInForm } from '../components/SignInForm';
import { SocialButtons } from '../components/SocialButtons';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const message = (location.state as { message?: string } | null)?.message;

  return (
    <>
      <AuthTabs />
      {message && <p className="info">{message}</p>}
      <SocialButtons />
      <SignInForm
        onSignedIn={() => { /* Hub 'signedIn' → AuthProvider → GuestOnly redirects */ }}
        onNeedsConfirmation={(email) => navigate(`/confirm?email=${encodeURIComponent(email)}`)}
      />
      <p className="auth-links"><Link to="/forgot-password">Forgot password?</Link></p>
    </>
  );
}
