import { Routes, Route, Navigate, Link } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Room from './pages/Room';
import AcceptInvite from './pages/AcceptInvite';
import ReportsPage from './pages/ReportsPage';
import { useAuth } from './context/useAuth';

function AdminRoute() {
  const { user } = useAuth();
  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-rose-200 dark:border-rose-900 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            403
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Access Denied</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
            Candidate accounts do not have permission to access administrative platform areas.
          </p>
          <Link
            to="/"
            className="inline-block px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }
  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/admin" element={<AdminRoute />} />
        <Route path="/room/:roomId" element={<Room />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:sessionId" element={<ReportsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
