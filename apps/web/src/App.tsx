import { useState } from 'react';
import './App.css';

type Page = 'signIn' | 'signUp' | 'profile';

function App() {
  const [page, setPage] = useState<Page>('signIn');

  return (
    <main className="app">
      <h1>User Management</h1>

      <nav className="nav">
        <button onClick={() => setPage('signIn')} disabled={page === 'signIn'}>Sign in</button>
        <button onClick={() => setPage('signUp')} disabled={page === 'signUp'}>Sign up</button>
        <button onClick={() => setPage('profile')} disabled={page === 'profile'}>Profile</button>
      </nav>

      <PagePlaceholder name={page} />
    </main>
  );
}

function PagePlaceholder({ name }: { name: Page }) {
  return <p className="placeholder">TODO: {name} page</p>;
}

export default App;
