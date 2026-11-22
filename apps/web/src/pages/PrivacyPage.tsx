import { APP_NAME } from '../brand';

export function PrivacyPage() {
  return (
    <article className="prose container">
      <h1>Privacy</h1>
      <p className="hint">Template: replace before real users sign up. This is not legal advice.</p>

      <h2>What we store</h2>
      <ul>
        <li>Your email address and name (Amazon Cognito and our database).</li>
        <li>Your password is handled by Amazon Cognito; {APP_NAME} never sees or stores it.</li>
        <li>Sign-in tokens in your browser's local storage, so you stay signed in.</li>
      </ul>

      <h2>Where</h2>
      <p>Amazon Web Services, region us-west-2 (Oregon, USA).</p>

      <h2>What we don't do</h2>
      <p>No ads, no selling of data, no third-party analytics.</p>

      <h2>Deleting your account</h2>
      <p>Contact us and we'll delete your account and profile data.</p>
    </article>
  );
}
