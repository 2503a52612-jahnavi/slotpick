import { useCallback, useEffect, useState } from 'react';
import { getMe } from './api';
import AgentDashboard from './AgentDashboard';
import AccountPage from './AccountPage';
import AuthPage from './AuthPage';
import DeliveryPage from './DeliveryPage';
import LandingPage from './LandingPage';
import OrderLookupPage from './OrderLookupPage';

const TOKEN_KEY = 'slotpick.jwt';

function getRoute() {
  const hashPath = window.location.hash.replace(/^#/, '');
  if (!hashPath) {
    return window.location.pathname === '/' ? { type: 'home' } : { type: 'redirect' };
  }

  const deliveryMatch = hashPath.match(/^\/d\/([\w-]+)$/);
  if (deliveryMatch) return { type: 'delivery', token: deliveryMatch[1] };
  if (hashPath === '/lookup') return { type: 'lookup' };
  if (hashPath === '/login' || hashPath === '/register') {
    return { type: 'auth', mode: hashPath.slice(1) };
  }
  if (hashPath === '/account') return { type: 'account' };
  if (hashPath === '/') return { type: 'home' };
  return { type: 'redirect' };
}

function navigate(path) {
  window.location.hash = path;
}

export default function App() {
  const [route, setRoute] = useState(getRoute);
  const [session, setSession] = useState({ loading: true, token: null, user: null });
  const [sessionError, setSessionError] = useState('');
  const [restoreAttempt, setRestoreAttempt] = useState(0);

  useEffect(() => {
    const handleHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (route.type !== 'redirect') return;
    if (window.location.pathname !== '/') {
      window.location.replace('/#/login');
    } else {
      navigate('/login');
    }
  }, [route]);

  useEffect(() => {
    let active = true;
    const token = window.localStorage.getItem(TOKEN_KEY);

    if (!token) {
      setSession({ loading: false, token: null, user: null });
      return () => {
        active = false;
      };
    }

    getMe(token)
      .then(({ user }) => {
        if (active) setSession({ loading: false, token, user });
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401) {
          window.localStorage.removeItem(TOKEN_KEY);
          setSession({ loading: false, token: null, user: null });
        } else {
          setSession({ loading: false, token, user: null });
          setSessionError(error.message);
        }
      });

    return () => {
      active = false;
    };
  }, [restoreAttempt]);

  const handleAuthenticated = useCallback(({ token, user }) => {
    window.localStorage.setItem(TOKEN_KEY, token);
    setSession({ loading: false, token, user });
    navigate('/account');
  }, []);

  const handleLogout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    setSessionError('');
    setSession({ loading: false, token: null, user: null });
    navigate('/login');
  }, []);

  if (route.type === 'delivery') {
    return <DeliveryPage key={route.token} deliveryToken={route.token} />;
  }

  if (route.type === 'home') {
    return <LandingPage onNavigate={navigate} />;
  }

  if (route.type === 'lookup') {
    return <OrderLookupPage onNavigate={navigate} />;
  }

  if (session.loading) {
    return <main className="card" role="status">Restoring your session…</main>;
  }

  if (sessionError) {
    return (
      <main className="card">
        <h1>Couldn’t restore your session</h1>
        <p className="msg" role="alert">{sessionError}</p>
        <button
          className="confirm"
          type="button"
          onClick={() => {
            setSessionError('');
            setSession({ loading: true, token: null, user: null });
            setRestoreAttempt((attempt) => attempt + 1);
          }}
        >
          Try again
        </button>
        <button className="text-button" type="button" onClick={handleLogout}>Go to sign in</button>
      </main>
    );
  }

  if (route.type === 'auth' && !session.user) {
    return (
      <AuthPage
        key={route.mode}
        mode={route.mode}
        onAuthenticated={handleAuthenticated}
        onNavigate={navigate}
      />
    );
  }

  if (!session.user || !session.token) {
    return (
      <AuthPage
        key="login"
        mode="login"
        onAuthenticated={handleAuthenticated}
        onNavigate={navigate}
      />
    );
  }

  if (session.user.role === 'agent') {
    return (
      <AgentDashboard
        user={session.user}
        token={session.token}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <AccountPage
      user={session.user}
      token={session.token}
      onLogout={handleLogout}
    />
  );
}
