/**
 * useTheme hook — convenience wrapper around the UI store for theme management.
 * @module hooks/useTheme
 */

import { useUIStore } from '../store/ui.store';

export function useTheme() {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const setTheme = useUIStore((s) => s.setTheme);

  return { theme, toggleTheme, setTheme };
}
