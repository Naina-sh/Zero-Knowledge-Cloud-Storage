/**
 * File store — manages file list state, loading, and decrypted file names.
 * @module store/file.store
 */

import { create } from 'zustand';
import {
  listFiles,
  decryptFileMetadata,
  deleteFile as deleteFileApi,
  uploadFile as uploadFileApi,
  renameFile as renameFileApi,
} from '../services/file.service';
import type { FileDTO, DecryptedFile, FileListResponse } from '../types';

interface FileState {
  files: DecryptedFile[];
  pagination: FileListResponse['pagination'] | null;
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: { progress: number; stage: string } | null;
  error: string | null;
  selectedFile: DecryptedFile | null;

  // Actions
  loadFiles: (encKey: CryptoKey, page?: number) => Promise<void>;
  uploadFile: (file: File, encKey: CryptoKey) => Promise<void>;
  removeFile: (fileId: string, encKey: CryptoKey) => Promise<void>;
  renameFile: (fileId: string, newName: string, encKey: CryptoKey) => Promise<void>;
  setSelectedFile: (file: DecryptedFile | null) => void;
  clearError: () => void;
}

export const useFileStore = create<FileState>((set, get) => ({
  files: [],
  pagination: null,
  isLoading: false,
  isUploading: false,
  uploadProgress: null,
  error: null,
  selectedFile: null,

  loadFiles: async (encKey, page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const result = await listFiles(page);
      // Decrypt all file names
      const decrypted = await Promise.all(
        result.files.map((f) => decryptFileMetadata(f, encKey))
      );
      set({ files: decrypted, pagination: result.pagination, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to load files' });
    }
  },

  uploadFile: async (file, encKey) => {
    set({ isUploading: true, uploadProgress: { progress: 0, stage: 'Starting...' }, error: null });
    try {
      await uploadFileApi(file, encKey, (progress, stage) => {
        set({ uploadProgress: { progress, stage } });
      });
      // Reload files after upload
      await get().loadFiles(encKey);
      set({ isUploading: false, uploadProgress: null });
    } catch (err) {
      set({
        isUploading: false,
        uploadProgress: null,
        error: err instanceof Error ? err.message : 'Upload failed',
      });
      throw err;
    }
  },

  removeFile: async (fileId, encKey) => {
    try {
      await deleteFileApi(fileId);
      set({ files: get().files.filter((f) => f.id !== fileId) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Delete failed' });
    }
  },

  renameFile: async (fileId, newName, encKey) => {
    try {
      await renameFileApi(fileId, newName, encKey);
      // Update local state
      set({
        files: get().files.map((f) =>
          f.id === fileId ? { ...f, name: newName } : f
        ),
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Rename failed' });
    }
  },

  setSelectedFile: (file) => set({ selectedFile: file }),
  clearError: () => set({ error: null }),
}));
