import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { ConfirmSignUpForm } from '../components/ConfirmSignUpForm';

export function ConfirmPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get('email');

  if (!email) {
    return <Navigate to="/signup" replace />;   // someone opened /confirm directly
  }

  return (
    <ConfirmSignUpForm
      email={email}
      onConfirmed={() =>
        navigate('/login', { replace: true, state: { message: 'Email confirmed. You can sign in now.' } })
      }
    />
  );
}
