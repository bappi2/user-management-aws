import { useCallback } from 'react';
import { useAuth } from '../../auth/authContext';
import { ProfileForm } from '../../components/ProfileForm';

/** Connects the form's "session expired" event to the auth context */
export function ProfilePage() {
  const { signOut } = useAuth();
  const handleSessionExpired = useCallback(() => {
    void signOut('Your session expired. Please sign in again.');
  }, [signOut]);

  return <ProfileForm onSessionExpired={handleSessionExpired} />;
}
