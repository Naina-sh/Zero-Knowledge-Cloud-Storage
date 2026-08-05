/**
 * Profile page — user account information and storage usage.
 * @module pages/Profile
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Calendar, HardDrive, Shield, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api.service';
import { useAuth } from '../hooks/useAuth';
import { deriveAuthKey } from '../services/key.service';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { FullPageSpinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { formatBytes, formatDateTime } from '../utils/format';
import type { User, ApiResponse } from '../types';

export function Profile() {
  const { user, logout, encKey } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get<ApiResponse<User>>('/users/me');
      setProfile(res.data.data ?? null);
    } catch { /* non-critical */ }
  };

  const handleDelete = async () => {
    if (!profile || !deletePassword) return;
    setIsDeleting(true);
    try {
      const saltRes = await api.get<ApiResponse<{ authSalt: string; encSalt: string }>>('/auth/salt', {
        params: { email: profile.email },
      });
      const authKey = await deriveAuthKey(deletePassword, saltRes.data.data!.authSalt);
      await api.delete('/users/me', { data: { authKey } });
      toast.success('Account deleted successfully');
      await logout();
      window.location.href = '/';
    } catch {
      toast.error('Account deletion failed — check your password');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!encKey) return <FullPageSpinner message="Loading profile..." />;
  const displayUser = profile ?? user;

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Your account information</p>
      </motion.div>

      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-2xl font-bold">
            {displayUser?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{displayUser?.email}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">ID: {displayUser?.id?.slice(0, 8)}...</p>
          </div>
        </div>
        <div className="space-y-4">
          <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={displayUser?.email ?? '—'} />
          <InfoRow icon={<Calendar className="w-4 h-4" />} label="Member since" value={displayUser?.createdAt ? formatDateTime(displayUser.createdAt) : '—'} />
          <InfoRow icon={<HardDrive className="w-4 h-4" />} label="Storage used" value={formatBytes(displayUser?.storageUsed ?? 0)} />
          <InfoRow icon={<Shield className="w-4 h-4" />} label="Encryption" value="AES-256-GCM · PBKDF2 (600k)" />
        </div>
      </div>

      <div className="glass-card p-6 border-red-200 dark:border-red-900/50">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Danger Zone</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Permanently delete your account and all encrypted files. This cannot be undone.
            </p>
          </div>
        </div>
        <Button variant="danger" onClick={() => setShowDelete(true)}>Delete Account</Button>
      </div>

      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Delete Account">
        <div className="space-y-4">
          <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-xl">
            <p className="text-sm text-red-700 dark:text-red-300">
              This will permanently delete all your encrypted files, embeddings, and search history.
            </p>
          </div>
          <Input label="Enter your password to confirm" type="password" value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)} placeholder="Your password" />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>Delete Permanently</Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  );
}

