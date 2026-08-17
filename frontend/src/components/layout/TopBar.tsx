import { NavLink, useNavigate } from 'react-router-dom';
import { BarChart3, Bot, LogOut, Upload, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/copilot', label: 'Copilot', icon: Bot },
  { to: '/upload', label: 'Upload', icon: Upload },
];

export default function TopBar() {
  const { user, offline, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <NavLink to="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              PC
            </div>
            <span className="hidden text-base font-semibold text-gray-900 sm:inline">
              Profit Copilot
            </span>
          </NavLink>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand-50 text-brand-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {offline && (
            <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 sm:inline">
              Demo mode
            </span>
          )}
          <span className="hidden rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 lg:inline">
            Company: {user?.companyName ?? '—'}
          </span>
          <div className="hidden items-center gap-2 text-sm text-gray-600 sm:flex">
            <User className="h-4 w-4 text-gray-400" />
            <span className="max-w-[140px] truncate">{user?.username}</span>
          </div>
          <button
            onClick={handleLogout}
            className="btn-secondary gap-2 px-3 py-2"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex border-t border-gray-100 md:hidden">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                isActive ? 'text-brand-600' : 'text-gray-500'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
