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
} from 'lucide-react';

export const AppShell = ({ children, activeTab, onTabChange }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getNavItems = () => {
    if (!user) return [];
    if (user.role === 'admin') {
      return [
        { id: 'overview', label: 'Overview', icon: Shield },
        { id: 'users', label: 'User Directory', icon: Users },
        { id: 'invitations', label: 'Invitations', icon: FileText },
        { id: 'audit-logs', label: 'Audit Trail', icon: FileText },
        { id: 'questions', label: 'Question Bank', icon: Code2 },
        { id: 'reports', label: 'Assessment Reports', icon: FileText },
        { id: 'settings', label: 'Platform Settings', icon: Sliders },
      ];
    }
    if (user.role === 'interviewer') {
      return [
        { id: 'interviews', label: 'Scheduled Sessions', icon: Calendar },
        { id: 'questions', label: 'Question Bank', icon: Code2 },
        { id: 'reports', label: 'Assessment Reports', icon: FileText },
      ];
    }
    return [
      { id: 'interviews', label: 'My Interviews', icon: Calendar },
      { id: 'reports', label: 'Assessment Reports', icon: FileText },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => navigate('/')}
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-base tracking-tight">IntelliPrep</span>
                <span className="ml-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold uppercase">AI</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* User Profile & Role */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="text-right">
                <p className="text-xs font-semibold leading-none">{user?.name}</p>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{user?.email}</p>
              </div>
              <Badge variant={user?.role}>{user?.role}</Badge>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
              aria-label="Log out of application"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>
      <CapabilitiesBanner />

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {navItems.length > 1 && (
          <div className="mb-6 flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 gap-1 pb-px">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange && onTabChange(item.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
                    isActive
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        {children}
      </div>
    </div>
  );
};
