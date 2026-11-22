import { Link, useNavigate } from 'react-router';
import { SignUpForm } from '../components/SignUpForm';

export function SignUpPage() {
  const navigate = useNavigate();
  return (
    <>
      <SignUpForm onSignedUp={(email) => navigate(`/confirm?email=${encodeURIComponent(email)}`)} />
      <p>Already have an account? <Link to="/login">Sign in</Link></p>
    </>
  );
}
