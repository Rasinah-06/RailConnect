import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Auth({ mode }) {
  const isLogin = mode === 'login';
  const { login, register } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (isLogin) await login(f.email, f.password); else await register(f);
      nav(loc.state?.from || '/', { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <form className="panel auth stack" onSubmit={submit}>
      <h2>{isLogin ? 'Log in' : 'Create your account'}</h2>
      {!isLogin && <label className="field">Full name<input value={f.name} onChange={set('name')} required /></label>}
      <label className="field">Email<input type="email" value={f.email} onChange={set('email')} required autoComplete="email" /></label>
      {!isLogin && <label className="field">Mobile (optional)<input inputMode="numeric" maxLength={10} value={f.phone} onChange={set('phone')} /></label>}
      <label className="field">Password<input type="password" value={f.password} onChange={set('password')} required minLength={isLogin ? 1 : 8} autoComplete={isLogin ? 'current-password' : 'new-password'} /></label>
      {error && <div className="notice bad" role="alert">{error}</div>}
      <button className="btn" disabled={busy}>{busy ? 'Please wait...' : isLogin ? 'Log in' : 'Create account'}</button>
      {isLogin && <p className="small muted">Demo: demo@railconnect.in / Demo@1234 &middot; Admin: admin@railconnect.in / Admin@123</p>}
      <p className="small">{isLogin ? <>New here? <Link to="/register">Create an account</Link></> : <>Already registered? <Link to="/login">Log in</Link></>}</p>
    </form>
  );
}
