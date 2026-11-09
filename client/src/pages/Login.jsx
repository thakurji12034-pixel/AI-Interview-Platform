import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import {
  Code2,
  Shield,
  Briefcase,
  User,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Cpu,
} from 'lucide-react';

export default function Login() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isLoggedOut = searchParams.get('logged_out') === '1';
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'candidate' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState(null);

  if (user && !isLoggedOut) return <Navigate to="/" replace />;

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const fillDemoAccount = (roleType, email, password) => {
    setSelectedDemo(roleType);
    setMode('login');
    setForm({ name: '', email, password, role: roleType });
    setError('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form);
      }
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      setError(data?.errors?.join(', ') || data?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background ambient gradient glow circles */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-violet-600/20 to-purple-600/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-1/4 w-[300px] h-[250px] bg-indigo-500/10 blur-[100px] pointer-events-none rounded-full" />

      {/* Top Header / Branding */}
      <div className="w-full max-w-md text-center mb-8 relative z-10">
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-300 shadow-sm backdrop-blur-md mb-4">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-slate-200">IntelliPrep AI Enterprise</span>
          <span className="text-slate-500">•</span>
          <span className="text-indigo-400 font-mono text-[11px]">v2.4</span>
        </div>
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Code2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">IntelliPrep <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">AI</span></h1>
        </div>
        <p className="text-xs text-slate-400">
          Production-grade AI Technical Assessment & Collaborative Coding Platform
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/40">
          {/* Logout notification */}
          {isLoggedOut && (
            <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>You have been logged out securely. Session ended.</span>
            </div>
          )}

          {/* Quick Demo Access Pills */}
          <div className="mb-6 rounded-xl bg-slate-950/60 border border-slate-800/80 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>1-Click Demo Profiles</span>
              </div>
              <span className="text-[10px] text-slate-500">Instant Access</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemoAccount('admin', 'admin@intelliprep.local', 'AdminPass123!')}
                className={`flex flex-col items-center justify-center py-2 px-2 rounded-lg border text-xs font-medium transition-all ${
                  selectedDemo === 'admin'
                    ? 'border-purple-500 bg-purple-950/40 text-purple-200 shadow-sm'
                    : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-slate-700 text-slate-300'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-purple-400 mb-1" />
                <span>Admin</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('interviewer', 'interviewer@example.com', 'Test@12345')}
                className={`flex flex-col items-center justify-center py-2 px-2 rounded-lg border text-xs font-medium transition-all ${
                  selectedDemo === 'interviewer'
                    ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200 shadow-sm'
                    : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-slate-700 text-slate-300'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-indigo-400 mb-1" />
                <span>Interviewer</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('candidate', 'test@example.com', 'Test@12345')}
                className={`flex flex-col items-center justify-center py-2 px-2 rounded-lg border text-xs font-medium transition-all ${
                  selectedDemo === 'candidate'
                    ? 'border-teal-500 bg-teal-950/40 text-teal-200 shadow-sm'
                    : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-slate-700 text-slate-300'
                }`}
              >
                <User className="w-3.5 h-3.5 text-teal-400 mb-1" />
                <span>Candidate</span>
              </button>
            </div>
          </div>

          {/* Tab selector: Sign In / Create Account */}
          <div className="flex border-b border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 pb-3 text-xs font-semibold text-center transition-colors border-b-2 -mb-px ${
                mode === 'login'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`flex-1 pb-3 text-xs font-semibold text-center transition-colors border-b-2 -mb-px ${
                mode === 'register'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    name="name"
                    type="text"
                    placeholder="Jane Doe"
                    value={form.name}
                    onChange={onChange}
                    required
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  name="email"
                  type="email"
                  placeholder="name@company.com"
                  value={form.email}
                  onChange={onChange}
                  required
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">Password</label>
                {mode === 'login' && (
                  <span className="text-[11px] text-slate-500 hover:text-indigo-400 cursor-pointer">
                    Forgot?
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  name="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={form.password}
                  onChange={onChange}
                  required
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition font-mono"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Select Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, role: 'candidate' })}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs text-left transition ${
                      form.role === 'candidate'
                        ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <User className="w-4 h-4 shrink-0 text-teal-400" />
                    <div>
                      <p className="font-medium text-slate-200">Candidate</p>
                      <p className="text-[10px] text-slate-400 leading-tight">Take assessments</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, role: 'interviewer' })}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs text-left transition ${
                      form.role === 'interviewer'
                        ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 shrink-0 text-indigo-400" />
                    <div>
                      <p className="font-medium text-slate-200">Interviewer</p>
                      <p className="text-[10px] text-slate-400 leading-tight">Evaluate candidates</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-950/40 border border-rose-800/60 p-3 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 py-2.5 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 transition cursor-pointer"
            >
              {busy ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to Workspace' : 'Create IntelliPrep Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security footnote */}
          <div className="mt-6 pt-4 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              <span>JWT + httpOnly Session</span>
            </span>
            <span>Enterprise SLA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
