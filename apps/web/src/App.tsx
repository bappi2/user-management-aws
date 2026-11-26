import { Route, Routes } from 'react-router';
import './App.css';
import { GuestOnly } from './auth/GuestOnly';
import { RequireAuth } from './auth/RequireAuth';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { HomePage } from './pages/app/HomePage';
import { ProfilePage } from './pages/app/ProfilePage';
import { ConfirmPage } from './pages/ConfirmPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { SignUpPage } from './pages/SignUpPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { MeProvider } from './me/MeProvider';
import { ProPage } from './pages/app/ProPage';




/** The whole site map. Layout routes (no path) wrap their children via <Outlet />. */
function App() {
  return (
    <Routes>
      {/* Public: header + footer */}
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Auth card: only when signed out */}
      <Route element={<AuthLayout />}>
        <Route path="auth/callback" element={<AuthCallbackPage />} />
        <Route element={<GuestOnly />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignUpPage />} />
          <Route path="confirm" element={<ConfirmPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
        </Route>
      </Route>

      {/* Signed-in area: guard → load /me → sidebar layout → page */}
      <Route path="app" element={<RequireAuth />}>
        <Route element={<MeProvider />}>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="pro" element={<ProPage />} />

          </Route>
        </Route>
      </Route>
    </Routes>

  );
}

export default App;
