/**
 * UploadZone — drag-and-drop file upload area with progress tracking.
 * @module components/files/UploadZone
 */

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFiles } from '../../hooks/useFiles';
import { useAuth } from '../../hooks/useAuth';
import { ProgressBar } from '../ui/ProgressBar';
import { config } from '../../config';

export function UploadZone() {
  const { uploadFile, isUploading, uploadProgress } = useFiles();
  const { encKey } = useAuth();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!encKey) {
        toast.error('Encryption key not available. Please log in again.');
        return;
      }

      for (const file of acceptedFiles) {
        if (file.size > config.upload.maxFileSize) {
          toast.error(`${file.name} exceeds the 100 MB limit`);
          continue;
        }
        const promise = uploadFile(file, encKey);
        toast.promise(promise, {
          loading: `Uploading ${file.name}...`,
          success: `${file.name} uploaded and encrypted successfully!`,
          error: (err) => `Failed to upload ${file.name}: ${err.message}`,
        });
        try {
          await promise;
        } catch {
          /* handled by toast */
        }
      }
    },
    [encKey, uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: config.upload.maxFileSize,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all hover:scale-[1.01] ${
          isDragActive
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
            : 'border-gray-300 dark:border-gray-700 hover:border-brand-400 dark:hover:border-brand-600'
        }`}
      >
        <input {...getInputProps()} />
        <motion.div
          animate={isDragActive ? { y: -4 } : { y: 0 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center">
            <UploadCloud className="w-8 h-8 text-brand-500" />
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              or click to browse — PDF, DOCX, TXT, MD, CSV, JSON (max 100 MB)
            </p>
          </div>
        </motion.div>
      </div>

      {isUploading && uploadProgress && (
        <div className="glass-card p-4">
          <ProgressBar
            progress={uploadProgress.progress}
            label={uploadProgress.stage}
          />
        </div>
      )}
    </div>
  );
}
