/**
 * FileCard — displays a single decrypted file with actions.
 * @module components/files/FileCard
 */

import { motion } from 'framer-motion';
import { Download, Trash2, Edit3, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import type { DecryptedFile } from '../../types';
import { formatBytes, timeAgo, getFileType, getFileTypeIcon } from '../../utils/format';
import { downloadAndDecryptFile } from '../../services/file.service';
import { useAuth } from '../../hooks/useAuth';
import { useFiles } from '../../hooks/useFiles';
import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface FileCardProps {
  file: DecryptedFile;
  index?: number;
  score?: number;
}

export function FileCard({ file, index = 0, score }: FileCardProps) {
  const { encKey } = useAuth();
  const { removeFile, renameFile, setSelectedFile } = useFiles();
  const [showRename, setShowRename] = useState(false);
  const [newName, setNewName] = useState(file.name);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!encKey) return;
    setIsDownloading(true);
    try {
      const { blob, name } = await downloadAndDecryptFile(file.id, encKey);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${name}`);
    } catch (err) {
      toast.error('Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!encKey) return;
    if (!confirm(`Delete "${file.name}" permanently?`)) return;
    await removeFile(file.id, encKey);
    toast.success('File deleted');
  };

  const handleRename = async () => {
    if (!encKey || !newName.trim()) return;
    await renameFile(file.id, newName.trim(), encKey);
    toast.success('File renamed');
    setShowRename(false);
  };

  const handlePreview = () => {
    setSelectedFile(file);
  };

  const fileType = getFileType(file.name);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ y: -2 }}
        className="glass-card p-4 group"
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl flex-shrink-0">
            {getFileTypeIcon(fileType)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate" title={file.name}>
              {file.name}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>{formatBytes(file.originalSize)}</span>
              <span>•</span>
              <span>{timeAgo(file.createdAt)}</span>
              {score !== undefined && (
                <>
                  <span>•</span>
                  <span className="text-brand-500 font-medium">{Math.round(score * 100)}% match</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handlePreview}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowRename(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            title="Rename"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 ml-auto"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Rename modal */}
      <Modal isOpen={showRename} onClose={() => setShowRename(false)} title="Rename File">
        <div className="space-y-4">
          <Input
            label="New filename"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowRename(false)}>Cancel</Button>
            <Button onClick={handleRename}>Rename</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
