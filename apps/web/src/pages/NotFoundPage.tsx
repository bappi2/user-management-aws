import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section className="prose container">
      <h1>Page not found</h1>
      <p><Link to="/">Go to the home page</Link></p>
    </section>
  );
}
