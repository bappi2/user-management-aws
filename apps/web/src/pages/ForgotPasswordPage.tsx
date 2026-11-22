import { Link, useNavigate } from 'react-router';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  return (
    <>
      <ForgotPasswordForm onCodeSent={(email) => navigate(`/reset-password?email=${encodeURIComponent(email)}`)} />
      <p><Link to="/login">Back to sign in</Link></p>
    </>
  );
}
