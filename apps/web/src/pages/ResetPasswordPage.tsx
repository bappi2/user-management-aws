import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { ResetPasswordForm } from '../components/ResetPasswordForm';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get('email');

  if (!email) {
    return <Navigate to="/forgot-password" replace />;
  }

  return (
    <>
      <ResetPasswordForm
        email={email}
        onReset={() =>
          navigate('/login', { replace: true, state: { message: 'Password changed. Sign in with your new password.' } })
        }
      />
      <p><Link to="/login">Back to sign in</Link></p>
    </>
  );
}
