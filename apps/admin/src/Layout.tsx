import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-gray-200 bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <button type="button" onClick={() => navigate('/')} className="text-xl font-semibold text-primary">
              Halal Map Admin
            </button>
            <nav className="flex gap-4">
              <NavLink
                to="/moderation"
                className={({ isActive }) =>
                  isActive ? 'text-primary font-medium' : 'text-text-secondary hover:text-primary'
                }
              >
                Moderation
              </NavLink>
              <NavLink
                to="/add-restaurant"
                className={({ isActive }) =>
                  isActive ? 'text-primary font-medium' : 'text-text-secondary hover:text-primary'
                }
              >
                Add restaurant
              </NavLink>
              <NavLink
                to="/restaurants"
                className={({ isActive }) =>
                  isActive ? 'text-primary font-medium' : 'text-text-secondary hover:text-primary'
                }
              >
                Restaurants
              </NavLink>
              <NavLink
                to="/users"
                className={({ isActive }) =>
                  isActive ? 'text-primary font-medium' : 'text-text-secondary hover:text-primary'
                }
              >
                Users
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
                to="/analytics"
                className={({ isActive }) =>
                  isActive ? 'text-primary font-medium' : 'text-text-secondary hover:text-primary'
                }
              >
                Analytics
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
