import { useState } from 'react';
import { login, register } from './api';

export default function AuthPage({ mode, onAuthenticated, onNavigate }) {
  const isRegister = mode === 'register';
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
      const result = isRegister
        ? await register({
            name: String(form.get('name')).trim(),
            email,
            password,
            phone: String(form.get('phone') || '').trim() || undefined,
          })
        : await login({ email, password });
      onAuthenticated(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="card auth-card">
      <h1>{isRegister ? 'Create your account' : 'Welcome back'}</h1>
      <p className="muted">
        {isRegister ? 'Register as a customer to get started.' : 'Sign in to view your account.'}
      </p>

      <form className="form" onSubmit={submit}>
        {isRegister && (
          <>
            <label htmlFor="name">Name</label>
            <input id="name" name="name" type="text" autoComplete="name" minLength="2" maxLength="80" required />
            <label htmlFor="phone">Phone (optional)</label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" />
          </>
        )}
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" maxLength="254" required />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          minLength={isRegister ? '8' : undefined}
          maxLength="72"
          required
        />
        {error && <p className="msg" role="alert">{error}</p>}
        <button className="confirm" type="submit" disabled={loading}>
          {loading ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p className="auth-switch">
        {isRegister ? 'Already have an account?' : 'New to SlotPick?'}{' '}
        <button
          className="text-button"
          type="button"
          onClick={() => onNavigate(isRegister ? '/login' : '/register')}
        >
          {isRegister ? 'Sign in' : 'Create an account'}
        </button>
      </p>
    </main>
  );
}
