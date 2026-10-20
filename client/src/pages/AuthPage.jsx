import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Hand, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isRegister) await register({ username, email, password });
      else await login({ email, password });
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page page-shell">
      <div className="auth-decoration"><div className="auth-glow" /><div className="auth-brand-icon"><Hand size={35} /></div><p>Pick your number.<br /><span>Trust your instincts.</span></p><div className="auth-decoration-caption">THE GAME IS BETTER TOGETHER</div></div>
      <section className="auth-panel">
        <div className="auth-heading"><div className="eyebrow">{isRegister ? 'JOIN THE GAME' : 'WELCOME BACK'}</div><h1>{isRegister ? 'Create your account' : 'Good to see you again.'}</h1><p>{isRegister ? 'Build your player profile and start playing.' : 'Log in to pick up where you left off.'}</p></div>
        <form onSubmit={submit} className="auth-form">
          {isRegister && <label className="field-label">Username<div className="input-wrap"><UserRound size={18} /><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="e.g. cricketchamp" autoComplete="username" minLength={3} maxLength={20} required /></div><small>3–20 letters, numbers, or underscores.</small></label>}
          <label className="field-label">Email address<div className="input-wrap"><Mail size={18} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></div></label>
          <label className="field-label">Password<div className="input-wrap"><LockKeyhole size={18} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isRegister ? 'At least 8 characters' : 'Your password'} autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={isRegister ? 8 : undefined} maxLength={72} required /></div>{isRegister && <small>Use at least 8 characters.</small>}</label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button type="submit" className="button button-primary button-large auth-submit" disabled={busy}>{busy ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'} {!busy && <ArrowRight size={18} />}</button>
        </form>
        <p className="auth-switch">{isRegister ? 'Already have an account?' : 'New to Hand Cricket?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Log in' : 'Create an account'}</Link></p>
        <div className="auth-privacy">Your password is never stored in plain text.</div>
      </section>
    </main>
  );
}
