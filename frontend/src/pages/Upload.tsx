/**
 * Upload page — drag-and-drop file upload with zero-knowledge encryption.
 * @module pages/Upload
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Brain, Upload as UploadIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFiles } from '../hooks/useFiles';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { UploadZone } from '../components/files/UploadZone';
import { FilePreview } from '../components/files/FilePreview';
import { FullPageSpinner } from '../components/ui/Spinner';

export function Upload() {
  const { encKey } = useAuth();
  const { loadFiles } = useFiles();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!encKey) return;
    loadFiles(encKey).then(() => setReady(true));
  }, [encKey, loadFiles]);

  if (!encKey) return <FullPageSpinner message="Initializing encryption key..." />;

  return (
    <DashboardLayout>
      <FilePreview />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Upload Files</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Files are encrypted in your browser before upload. The server never sees your plaintext.
        </p>
      </motion.div>

      {/* Pipeline explanation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <PipelineStep
          icon={<Brain className="w-5 h-5" />}
          title="1. Extract & Embed"
          desc="Text is extracted and converted to a semantic embedding — all in your browser."
        />
        <PipelineStep
          icon={<Lock className="w-5 h-5" />}
          title="2. Encrypt"
          desc="AES-256-GCM encryption with keys derived from your password."
        />
        <PipelineStep
          icon={<Shield className="w-5 h-5" />}
          title="3. Upload"
          desc="Only encrypted files and embedding vectors are sent to the server."
        />
      </div>

      {/* Upload zone */}
      <UploadZone />

      {/* Supported formats */}
      <div className="mt-6 glass-card p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
          <UploadIcon className="w-4 h-4" />
          Supported Formats
        </h3>
        <div className="flex flex-wrap gap-2">
          {['PDF', 'DOCX', 'TXT', 'Markdown', 'CSV', 'JSON'].map((fmt) => (
            <span
              key={fmt}
              className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400"
            >
              {fmt}
            </span>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

function PipelineStep({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center text-brand-500">
          {icon}
        </div>
        <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">{title}</h3>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
    </div>
  );
}
