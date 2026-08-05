/**
 * Sidebar component — navigation sidebar with app branding.
 * @module components/layout/Sidebar
 */

import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, LogOut, X } from 'lucide-react';
import { NAV_ITEMS, APP_NAME } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';
import { useUIStore } from '../../store/ui.store';
import clsx from 'clsx';

export function Sidebar() {
  const { logout, user } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col"
          >
            {/* Logo / Branding */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/20">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-gray-900 dark:text-white text-lg leading-none">{APP_NAME}</h1>
                  <p className="text-[10px] text-gray-400 mt-0.5">Zero-Knowledge Storage</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                        isActive
                          ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      )
                    }
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* User section + Logout */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3 px-3 py-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-medium">
                  {user?.email?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
