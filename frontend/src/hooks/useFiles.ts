/**
 * useFiles hook — convenience wrapper around the file store.
 * @module hooks/useFiles
 */

import { useFileStore } from '../store/file.store';

export function useFiles() {
  const store = useFileStore();

  return {
    files: store.files,
    pagination: store.pagination,
    isLoading: store.isLoading,
    isUploading: store.isUploading,
    uploadProgress: store.uploadProgress,
    error: store.error,
    selectedFile: store.selectedFile,
    loadFiles: store.loadFiles,
    uploadFile: store.uploadFile,
    removeFile: store.removeFile,
    renameFile: store.renameFile,
    setSelectedFile: store.setSelectedFile,
    clearError: store.clearError,
  };
}
