/**
 * Dashboard page — file overview with storage analytics charts.
 * @module pages/Dashboard
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { FileText, HardDrive, TrendingUp, Upload as UploadIcon, Search as SearchIcon } from 'lucide-react';
import api from '../services/api.service';
import { useAuth } from '../hooks/useAuth';
import { useFiles } from '../hooks/useFiles';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { FileGrid } from '../components/files/FileGrid';
import { FilePreview } from '../components/files/FilePreview';
import { FullPageSpinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { formatBytes } from '../utils/format';
import type { StorageAnalytics, ApiResponse } from '../types';

const PIE_COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'];

export function Dashboard() {
  const navigate = useNavigate();
  const { encKey, user } = useAuth();
  const { files, isLoading, loadFiles } = useFiles();
  const [analytics, setAnalytics] = useState<StorageAnalytics | null>(null);

  useEffect(() => {
    if (!encKey) return;
    loadFiles(encKey);
    fetchAnalytics();
  }, [encKey, loadFiles]);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get<ApiResponse<StorageAnalytics>>('/users/me/analytics');
      setAnalytics(res.data.data ?? null);
    } catch {
      /* non-critical */
    }
  };

  if (!encKey) return <FullPageSpinner message="Initializing encryption key..." />;

  const recentFiles = files.slice(0, 8);
  const pieData = analytics
    ? Object.entries(analytics.storageByType).map(([name, value]) => ({ name, value }))
    : [];
  const chartData = analytics?.uploadsOverTime.map((u) => ({ date: u.date.slice(5), uploads: u.count })) ?? [];

  return (
    <DashboardLayout>
      <FilePreview />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Welcome back, {user?.email}</p>
        </div>
        <Button onClick={() => navigate('/upload')} leftIcon={<UploadIcon className="w-4 h-4" />}>
          Upload Files
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={<FileText className="w-5 h-5" />} label="Total Files" value={analytics?.totalFiles?.toString() ?? '0'} delay={0} />
        <StatCard icon={<HardDrive className="w-5 h-5" />} label="Storage Used" value={formatBytes(analytics?.totalSize ?? user?.storageUsed ?? 0)} delay={0.1} />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Uploads (30d)" value={chartData.reduce((s, d) => s + d.uploads, 0).toString()} delay={0.2} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Upload Activity</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.9)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="uploads" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No upload activity yet</div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">File Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.9)', border: 'none', borderRadius: '8px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No files yet</div>
          )}
        </motion.div>
      </div>

      {/* Recent files */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Files</h2>
        <button onClick={() => navigate('/search')} className="text-sm text-brand-600 dark:text-brand-400 font-medium hover:underline flex items-center gap-1">
          <SearchIcon className="w-4 h-4" /> Search all files
        </button>
      </div>
      {isLoading ? (
        <FullPageSpinner message="Decrypting your files..." />
      ) : (
        <FileGrid files={recentFiles} emptyMessage="No files uploaded yet. Click 'Upload Files' to get started." />
      )}
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value, delay }: { icon: React.ReactNode; label: string; value: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="glass-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center text-brand-500">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

