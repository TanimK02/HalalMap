import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-gray-200 bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <NavLink to="/" className="text-xl font-semibold text-primary">
              Halal Map
            </NavLink>
            <nav className="flex gap-4">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive ? 'text-primary font-medium' : 'text-text-secondary hover:text-primary'
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/menu"
                className={({ isActive }) =>
                  isActive ? 'text-primary font-medium' : 'text-text-secondary hover:text-primary'
                }
              >
                Menu
              </NavLink>
              <NavLink
                to="/orders"
                className={({ isActive }) =>
                  isActive ? 'text-primary font-medium' : 'text-text-secondary hover:text-primary'
                }
              >
                Orders
              </NavLink>
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  isActive ? 'text-primary font-medium' : 'text-text-secondary hover:text-primary'
                }
              >
                Profile
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-secondary">{user?.email}</span>
            <button
              type="button"
              onClick={logout}
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
