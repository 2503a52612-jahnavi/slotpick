import { useState } from 'react';
import { login } from './api';

export default function AuthPage({ onAuthenticated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email')).trim();
    const password = String(form.get('password'));

    try {
      const result = await login({ email, password });
      if (result.user.role === 'customer') {
        setError('Customer delivery lookup does not require an account. Find your order from the home page.');
        return;
      }
      onAuthenticated(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="card auth-card">
      <h1>Team sign in</h1>
      <p className="muted">Administrators and delivery agents can sign in here.</p>

      <form className="form" onSubmit={submit}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" maxLength="254" required />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength="72"
          required
        />
        {error && <p className="msg" role="alert">{error}</p>}
        <button className="confirm" type="submit" disabled={loading}>
          {loading ? 'Please wait…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
