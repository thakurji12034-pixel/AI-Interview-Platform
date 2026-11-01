import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600 font-bold text-white">
            AI
          </div>
          <span className="text-lg font-semibold text-slate-800">Interview Platform</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-800">{user.name}</p>
            <p className="text-xs capitalize text-slate-500">{user.role}</p>
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={logout}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}