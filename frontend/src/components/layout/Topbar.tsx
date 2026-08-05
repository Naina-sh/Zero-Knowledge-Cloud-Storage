/**
 * Topbar component — top navigation bar with menu toggle, search, and theme switch.
 * @module components/layout/Topbar
 */

import { useNavigate } from 'react-router-dom';
import { Menu, Moon, Sun, Search } from 'lucide-react';
import { useUIStore } from '../../store/ui.store';
import { useTheme } from '../../hooks/useTheme';

export function Topbar() {
  const { toggleSidebar } = useUIStore();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left — menu toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Center — quick search (navigates to search page) */}
        <button
          onClick={() => navigate('/search')}
          className="hidden md:flex items-center gap-2 px-4 py-2 w-full max-w-md bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-400 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <Search className="w-4 h-4" />
          <span>Semantic search your files...</span>
        </button>

        {/* Right — theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-gray-300" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>
    </header>
  );
}
