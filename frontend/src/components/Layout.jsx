import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-cream-200/60 bg-cream-50/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <NavLink
            to="/wardrobe"
            className="font-display font-bold text-xl text-warm-900 tracking-tight hover:text-accent transition-colors flex items-center gap-2"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/15 text-accent">☀</span>
            Fitted
          </NavLink>
          <nav className="flex items-center gap-1 sm:gap-2">
            <NavLink
              to="/wardrobe"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent/12 text-accent' : 'text-warm-800/70 hover:text-warm-900 hover:bg-cream-200/50'
                }`
              }
            >
              Wardrobe
            </NavLink>
            <NavLink
              to="/recommend"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent/12 text-accent' : 'text-warm-800/70 hover:text-warm-900 hover:bg-cream-200/50'
                }`
              }
            >
              Today
            </NavLink>
            <NavLink
              to="/saved"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent/12 text-accent' : 'text-warm-800/70 hover:text-warm-900 hover:bg-cream-200/50'
                }`
              }
            >
              Saved
            </NavLink>
            <button
              type="button"
              onClick={() => signOut()}
              className="ml-2 px-3 py-2 rounded-lg text-sm text-stone-500 hover:text-warm-900 hover:bg-cream-200/50 transition-colors"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
