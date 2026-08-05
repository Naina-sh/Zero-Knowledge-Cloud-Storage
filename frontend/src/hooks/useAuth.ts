/**
 * useAuth hook — convenience wrapper around the auth store.
 * @module hooks/useAuth
 */

import { useAuthStore } from '../store/auth.store';

export function useAuth() {
  const store = useAuthStore();

  return {
    user: store.user,
    encKey: store.encKey,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    register: store.register,
    login: store.login,
    logout: store.logout,
    fetchProfile: store.fetchProfile,
    clearError: store.clearError,
  };
}
