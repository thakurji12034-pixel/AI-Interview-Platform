import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';

export default function Login() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isLoggedOut = searchParams.get('logged_out') === '1';
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'candidate' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user && !isLoggedOut) return <Navigate to="/" replace />;

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form);
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      setError(data?.errors?.join(', ') || data?.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-indigo-600">AI Interview Platform</h1>
        <p className="text-sm text-slate-500">
          {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
        </p>

        {isLoggedOut && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
            You have been logged out securely. Session ended.
          </div>
        )}

        {mode === 'register' && (
          <input name="name" placeholder="Full name" value={form.name} onChange={onChange} className={inputClass} required />
        )}
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={onChange} className={inputClass} required />
        <input name="password" type="password" placeholder="Password (min 8 characters)" value={form.password} onChange={onChange} className={inputClass} required />

        {mode === 'register' && (
          <select name="role" value={form.role} onChange={onChange} className={inputClass}>
            <option value="candidate">Candidate</option>
            <option value="interviewer">Interviewer</option>
          </select>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
          className="w-full text-sm text-indigo-600 hover:underline"
        >
          {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Login'}
        </button>
      </form>
    </div>
  );
}