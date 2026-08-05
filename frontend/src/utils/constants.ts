/**
 * Application constants.
 * @module utils/constants
 */

import { LayoutDashboard, Upload, Search, User, Settings, Shield } from 'lucide-react';

export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Upload', path: '/upload', icon: Upload },
  { label: 'Search', path: '/search', icon: Search },
  { label: 'Profile', path: '/profile', icon: User },
  { label: 'Settings', path: '/settings', icon: Settings },
] as const;

export const STORAGE_LIMIT = 5 * 1024 * 1024 * 1024; // 5 GB display limit

export const TOAST_DURATION = 4000;

export const APP_NAME = 'ZK Vault';

export const APP_TAGLINE = 'Encrypted Cloud Storage with Semantic Search';

export { Shield };
