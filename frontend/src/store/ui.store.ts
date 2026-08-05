/**
 * UI store — manages theme (dark/light), sidebar state, and global UI state.
 * @module store/ui.store
 */

import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface UIState {
  theme: Theme;
  sidebarOpen: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem('zk-theme') as Theme | null;
  if (stored) return stored;
  // Default to dark
  return 'dark';
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  localStorage.setItem('zk-theme', theme);
}

// Apply initial theme immediately
if (typeof window !== 'undefined') {
  applyTheme(getInitialTheme());
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: getInitialTheme(),
  sidebarOpen: true,

  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    set({ theme: newTheme });
  },

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },

  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
