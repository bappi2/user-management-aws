import { Link } from 'react-router';
import { useAuth } from '../auth/authContext';
import { APP_NAME } from '../brand';

const FEATURES = [
  { title: 'Secure sign-in', text: 'Accounts powered by Amazon Cognito. Your password never leaves your browser.' },
  { title: 'Your profile', text: 'Keep your details up to date from any device.' },
  { title: 'Plans for everyone', text: 'Start free. Upgrade when you need more.' },
];

export function LandingPage() {
  const { status } = useAuth();
  const signedIn = status === 'signedIn';

  return (
    <>
      <section className="hero container">
        <h1>{APP_NAME}</h1>
        <p>One sentence about what your app does and who it is for. Replace this when the product idea is ready.</p>
        <div className="hero-actions">
          {signedIn ? (
            <Link to="/app" className="button primary">Open app</Link>
          ) : (
            <>
              <Link to="/signup" className="button primary">Get started, it's free</Link>
              <Link to="/login" className="button secondary">Log in</Link>
            </>
          )}
        </div>
      </section>

      <section className="features container">
        {FEATURES.map((feature) => (
          <article key={feature.title} className="feature">
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
          </article>
        ))}
      </section>
    </>
  );
}
