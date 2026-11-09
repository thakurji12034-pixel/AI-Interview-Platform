import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useTheme } from '../../context/useTheme';
import { Badge } from '../ui/Badge';
import { CapabilitiesBanner } from './CapabilitiesBanner';
import {
  Sun,
  Moon,
  LogOut,
  Calendar,
  Users,
  Shield,
  FileText,
  Sliders,
  Menu,
  X,
  Code2,
  Activity,
} from 'lucide-react';

export const AppShell = ({ children, activeTab, onTabChange }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login?logged_out=1');
  };

  const getNavItems = () => {
    if (!user) return [];
    if (user.role === 'admin') {
      return [
        { id: 'overview', label: 'Command Center', icon: Shield },
        { id: 'users', label: 'User Directory', icon: Users },
        { id: 'invitations', label: 'Invitations', icon: FileText },
        { id: 'audit-logs', label: 'Audit Trail', icon: Activity },
        { id: 'questions', label: 'Question Bank', icon: Code2 },
        { id: 'reports', label: 'Assessment Reports', icon: FileText },
        { id: 'settings', label: 'Platform Settings', icon: Sliders },
      ];
    }
    if (user.role === 'interviewer') {
      return [
        { id: 'interviews', label: 'Interviews & Sessions', icon: Calendar },
        { id: 'questions', label: 'Question Bank', icon: Code2 },
        { id: 'reports', label: 'Candidate Reports', icon: FileText },
      ];
    }
    return [
      { id: 'interviews', label: 'Assessments & Practice', icon: Calendar },
      { id: 'reports', label: 'My Performance Reports', icon: FileText },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              className="flex items-center gap-3 cursor-pointer select-none"
              onClick={() => navigate('/')}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
                <Code2 className="w-5 h-5" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-base tracking-tight text-white">IntelliPrep</span>
                <span className="text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  AI
                </span>
              </div>
            </div>

            {/* Platform Status Indicator */}
            <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-800 text-[11px] text-slate-400">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Production Ready</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg transition"
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
            </button>

            {/* User Profile & Role Pill */}
            <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-slate-800">
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-200 leading-none">{user?.name || 'Workspace User'}</p>
                <p className="text-[11px] text-slate-400 font-mono leading-tight mt-1 truncate max-w-[150px]">{user?.email}</p>
              </div>
              <Badge variant={user?.role}>{user?.role}</Badge>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/50 rounded-lg transition"
              aria-label="Log out of application"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900/95 p-4 space-y-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <p className="text-xs font-semibold text-white">{user?.name}</p>
                <p className="text-[11px] text-slate-400">{user?.email}</p>
              </div>
              <Badge variant={user?.role}>{user?.role}</Badge>
            </div>
            <div className="pt-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (onTabChange) onTabChange(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Demonstration / Capabilities Banner */}
      <CapabilitiesBanner />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Sleek Pill Tab Navigation */}
        {navItems.length > 1 && (
          <div className="mb-6 flex items-center overflow-x-auto p-1 rounded-xl bg-slate-900/70 border border-slate-800/80 gap-1 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange && onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {children}
      </main>
    </div>
  );
};
