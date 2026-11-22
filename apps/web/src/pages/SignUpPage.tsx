import { Link, useNavigate } from 'react-router';
import { AuthTabs } from '../components/AuthTabs';
import { SignUpForm } from '../components/SignUpForm';
import { SocialButtons } from '../components/SocialButtons';

export function SignUpPage() {
  const navigate = useNavigate();
  return (
    <>
      <AuthTabs />
      <SocialButtons />
      <SignUpForm onSignedUp={(email) => navigate(`/confirm?email=${encodeURIComponent(email)}`)} />
      <p className="hint">
        By creating an account you agree to our <Link to="/privacy">privacy policy</Link>.
      </p>
    </>
  );
}
