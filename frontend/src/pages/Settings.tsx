/**
 * Settings page — theme, model status, and security information.
 * @module pages/Settings
 */

import { motion } from 'framer-motion';
import { Moon, Sun, Shield, Cpu, Info, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../hooks/useTheme';
import { useUIStore } from '../store/ui.store';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/Button';
import { isModelLoaded } from '../services/embedding.service';
import api from '../services/api.service';
import { config } from '../config';

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  const clearSearchHistory = async () => {
    try {
      await api.delete('/search/history');
      toast.success('Search history cleared');
    } catch {
      toast.error('Failed to clear history');
    }
  };


  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Customize your experience</p>
      </motion.div>

      <SectionCard title="Appearance" icon={<Sun className="w-5 h-5" />}>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">Dark Mode</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Toggle between light and dark themes</p>
          </div>
          <button onClick={toggleTheme} className={`relative w-12 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-brand-600' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-6' : ''}`}>
              {theme === 'dark' ? <Moon className="w-3 h-3 m-1 text-brand-600" /> : <Sun className="w-3 h-3 m-1 text-gray-500" />}
            </span>
          </button>
        </div>
        <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-800">
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">Sidebar</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Show sidebar by default</p>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`relative w-12 h-6 rounded-full transition-colors ${sidebarOpen ? 'bg-brand-600' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${sidebarOpen ? 'translate-x-6' : ''}`} />
          </button>
        </div>
      </SectionCard>

      <SectionCard title="AI Model" icon={<Cpu className="w-5 h-5" />}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">{config.embedding.model}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">384-dimensional sentence embeddings</p>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${isModelLoaded() ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
              {isModelLoaded() ? 'Loaded' : 'Not loaded'}
            </span>
          </div>
          <div className="text-xs text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
            The model runs entirely in your browser via WebAssembly. Downloads ~23 MB on first use, cached after.
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Security" icon={<Shield className="w-5 h-5" />}>
        <div className="space-y-2">
          <SecurityItem label="Encryption" value="AES-256-GCM (authenticated)" />
          <SecurityItem label="Key Derivation" value={`PBKDF2-SHA256 (${config.crypto.pbkdf2Iterations.toLocaleString()} iters)`} />
          <SecurityItem label="Key Separation" value="HKDF (auth ≠ encryption)" />
          <SecurityItem label="Server Hashing" value="Argon2id (memory-hard)" />
          <SecurityItem label="Token Strategy" value="JWT + refresh rotation" />
        </div>
      </SectionCard>

      <SectionCard title="Data Management" icon={<Trash2 className="w-5 h-5" />}>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">Clear Search History</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Remove all stored search queries</p>
          </div>
          <Button variant="secondary" size="sm" onClick={clearSearchHistory}>Clear</Button>
        </div>
      </SectionCard>

      <SectionCard title="About" icon={<Info className="w-5 h-5" />}>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          ZK Vault is a zero-knowledge cloud storage system with semantic search. Your files are
          encrypted in your browser — the server never has access to plaintext data, passwords, or keys.
        </p>
      </SectionCard>
    </DashboardLayout>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center text-brand-500">
          {icon}
        </div>
        <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

function SecurityItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</span>
    </div>
  );
}
