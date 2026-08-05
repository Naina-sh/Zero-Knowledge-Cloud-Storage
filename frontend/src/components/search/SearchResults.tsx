/**
 * SearchResults — displays semantic search results with similarity scores.
 * @module components/search/SearchResults
 */

import { motion } from 'framer-motion';
import { Download, SearchX } from 'lucide-react';
import toast from 'react-hot-toast';
import type { SearchResult } from '../../types';
import { downloadAndDecryptFile } from '../../services/file.service';
import { useAuth } from '../../hooks/useAuth';
import { formatBytes, getFileType, getFileTypeIcon, scoreToPercentage } from '../../utils/format';

interface SearchResultsProps {
  results: Array<SearchResult & { decryptedName: string }>;
  hasSearched: boolean;
}

export function SearchResults({ results, hasSearched }: SearchResultsProps) {
  const { encKey } = useAuth();

  const handleDownload = async (fileId: string, name: string) => {
    if (!encKey) return;
    try {
      const { blob } = await downloadAndDecryptFile(fileId, encKey);
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

  if (!hasSearched) return null;

  if (results.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <SearchX className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400">No matching files found</p>
        <p className="text-sm text-gray-400 mt-1">Try a different query or lower the similarity threshold</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 dark:text-gray-400 px-1">
        {results.length} result{results.length !== 1 ? 's' : ''} found
      </p>
      {results.map((result, index) => {
        const fileType = getFileType(result.decryptedName);
        return (
          <motion.div
            key={result.fileId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="glass-card p-4 flex items-center gap-4 group hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl flex-shrink-0">
              {getFileTypeIcon(fileType)}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {result.decryptedName}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                <span>{formatBytes(result.size)}</span>
              </div>
            </div>

            {/* Similarity score */}
            <div className="flex-shrink-0 text-right">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/50">
                <div className="w-2 h-2 rounded-full bg-brand-500" />
                <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
                  {scoreToPercentage(result.score)}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleDownload(result.fileId, result.decryptedName)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
