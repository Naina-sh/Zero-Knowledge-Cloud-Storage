/**
 * FilePreview — modal for previewing a decrypted file's content.
 * @module components/files/FilePreview
 */

import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useFiles } from '../../hooks/useFiles';
import { useAuth } from '../../hooks/useAuth';
import { downloadAndDecryptFile } from '../../services/file.service';
import { formatBytes, formatDateTime, getFileType, getFileTypeIcon } from '../../utils/format';

export function FilePreview() {
  const { selectedFile, setSelectedFile } = useFiles();
  const { encKey } = useAuth();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFile || !encKey) return;

    let revoked = false;
    const loadPreview = async () => {
      setIsLoading(true);
      try {
        const { blob, mimeType } = await downloadAndDecryptFile(selectedFile.id, encKey!);
        if (revoked) return;

        // For text-based files, show content
        if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('csv')) {
          const text = await blob.text();
          setTextContent(text);
        } else if (mimeType.startsWith('image/')) {
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }
        // PDFs and other types: offer download only
      } catch {
        toast.error('Failed to load preview');
      } finally {
        setIsLoading(false);
      }
    };

    loadPreview();

    return () => {
      revoked = true;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setTextContent(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile, encKey]);

  if (!selectedFile) return null;

  const fileType = getFileType(selectedFile.name);

  const handleDownload = async () => {
    if (!encKey) return;
    try {
      const { blob, name } = await downloadAndDecryptFile(selectedFile.id, encKey);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${name}`);
    } catch {
      toast.error('Download failed');
    }
  };

  return (
    <Modal
      isOpen={!!selectedFile}
      onClose={() => setSelectedFile(null)}
      title={selectedFile.name}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* File info */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-900 flex items-center justify-center text-xl">
            {getFileTypeIcon(fileType)}
          </div>
          <div className="flex-1 text-sm">
            <p className="text-gray-500 dark:text-gray-400">Size: {formatBytes(selectedFile.originalSize)}</p>
            <p className="text-gray-500 dark:text-gray-400">Uploaded: {formatDateTime(selectedFile.createdAt)}</p>
          </div>
        </div>

        {/* Preview content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        ) : textContent ? (
          <div className="max-h-96 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words font-mono">
              {textContent.slice(0, 5000)}
              {textContent.length > 5000 && '\n\n... (truncated for preview)'}
            </pre>
          </div>
        ) : previewUrl ? (
          <div className="flex justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <img src={previewUrl} alt={selectedFile.name} className="max-h-96 rounded-lg" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Preview not available for this file type. Download to view.
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleDownload} leftIcon={<Download className="w-4 h-4" />}>
            Download
          </Button>
        </div>
      </div>
    </Modal>
  );
}
