/**
 * FileGrid — grid layout for displaying files.
 * @module components/files/FileGrid
 */

import type { DecryptedFile } from '../../types';
import { FileCard } from './FileCard';
import { FileText } from 'lucide-react';

interface FileGridProps {
  files: DecryptedFile[];
  scores?: Map<string, number>;
  emptyMessage?: string;
}

export function FileGrid({ files, scores, emptyMessage = 'No files yet' }: FileGridProps) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {files.map((file, index) => (
        <FileCard
          key={file.id}
          file={file}
          index={index}
          score={scores?.get(file.id)}
        />
      ))}
    </div>
  );
}
