/**
 * Auth store — manages authentication state, encryption key, and user session.
 * The encryption key (encKey) is kept in memory ONLY — never persisted.
 * @module store/auth.store
 */

import { create } from 'zustand';
import api, { setAccessToken } from '../services/api.service';
import {
  deriveAuthKey,
  deriveEncryptionKey,
  generateSalt,
} from '../services/key.service';
import type { User, AuthResponse, SaltsResponse, ApiResponse } from '../types';

interface AuthState {
  user: User | null;
  encKey: CryptoKey | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  encKey: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  register: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      // 1. Generate salts for key derivation
      const authSalt = generateSalt();
      const encSalt = generateSalt();

      // 2. Derive auth key (sent to server)
      const authKey = await deriveAuthKey(password, authSalt);

      // 3. Derive encryption key (kept in memory, never sent)
      const encKey = await deriveEncryptionKey(password, encSalt);

      // 4. Register with server
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', {
        email,
        authKey,
        authSalt,
        encSalt,
      });

      const { user, accessToken } = response.data.data!;
      setAccessToken(accessToken);

      set({ user, encKey, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const message = extractErrorMessage(err);
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      // 1. Fetch salts for this user
      const saltResponse = await api.get<ApiResponse<SaltsResponse>>('/auth/salt', {
        params: { email },
      });
      const { authSalt, encSalt } = saltResponse.data.data!;

      // 2. Derive auth key
      const authKey = await deriveAuthKey(password, authSalt);

      // 3. Derive encryption key (kept in memory)
      const encKey = await deriveEncryptionKey(password, encSalt);

      // 4. Login with server
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', {
        email,
        authKey,
      });

      const { user, accessToken } = response.data.data!;
      setAccessToken(accessToken);

      set({ user, encKey, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const message = extractErrorMessage(err);
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors — clear local state regardless
    }
    setAccessToken(null);
    set({ user: null, encKey: null, isAuthenticated: false, error: null });
  },

  fetchProfile: async () => {
    try {
      const response = await api.get<ApiResponse<User>>('/users/me');
      set({ user: response.data.data });
    } catch {
      // Silent fail — profile is non-critical
    }
  },

  clearError: () => set({ error: null }),
}));

/**
 * Extract a human-readable error message from an Axios error.
 */
function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { error?: { message?: string }; message?: string } } }).response;
    if (response?.data?.error?.message) return response.data.error.message;
    if (response?.data?.message) return response.data.message;
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred';
}
