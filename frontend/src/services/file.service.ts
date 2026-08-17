/**
 * File orchestration service — coordinates the full zero-knowledge upload/download flow.
 *
 * Upload:  extract text → generate embedding → encrypt file → encrypt metadata → upload
 * Download: fetch encrypted file → decrypt file → decrypt metadata → return
 * Search:  generate query embedding → send to server → fetch results → decrypt filenames
 *
 * @module services/file.service
 */

import api from './api.service';
import { generateEmbedding, generateQueryEmbedding } from './embedding.service';
import { extractText } from './extraction.service';
import {
  encryptFile,
  decryptFile,
  encryptString,
  decryptString,
  generateIV,
  readFileAsBytes,
  bytesToBlob,
} from './crypto.service';
import type { ApiResponse, FileDTO, FileListResponse, SearchResult, DecryptedFile } from '../types';

/**
 * Upload a file through the full zero-knowledge pipeline.
 *
 * @param file The File object to upload
 * @param encKey The AES-GCM encryption key (derived from password, in memory)
 * @param onProgress Optional progress callback (0-100)
 * @returns The created file metadata
 */
export async function uploadFile(
  file: File,
  encKey: CryptoKey,
  onProgress?: (progress: number, stage: string) => void
): Promise<FileDTO> {
  // 1. Extract text from the document (client-side)
  onProgress?.(10, 'Extracting text...');
  const text = await extractText(file);

  // 2. Generate semantic embedding from extracted text (client-side)
  onProgress?.(30, 'Generating embedding...');
  const embedding = await generateEmbedding(text);

  // 3. Read file as bytes
  onProgress?.(50, 'Reading file...');
  const fileBytes = await readFileAsBytes(file);

  // 4. Encrypt the file with AES-256-GCM
  onProgress?.(65, 'Encrypting file...');
  const fileIv = generateIV();
  const encryptedFile = await encryptFile(encKey, fileBytes, fileIv);

  // 5. Encrypt the filename
  onProgress?.(75, 'Encrypting metadata...');
  const nameIv = generateIV();
  const encryptedName = await encryptString(encKey, file.name, nameIv);

  // 6. Encrypt the MIME type
  const mimeIv = generateIV();
  const encryptedMime = await encryptString(encKey, file.type || 'application/octet-stream', mimeIv);

  // 7. Upload to server (multipart form data)
  onProgress?.(85, 'Uploading...');
  const formData = new FormData();
  formData.append('file', new Blob([encryptedFile as unknown as BlobPart]));
  formData.append('encryptedName', encryptedName);
  formData.append('nameIv', nameIv);
  formData.append('fileIv', fileIv);
  formData.append('embedding', JSON.stringify(embedding));
  formData.append('originalSize', file.size.toString());
  formData.append('mimeType', encryptedMime);
  formData.append('mimeIv', mimeIv);

  const response = await api.post<ApiResponse<FileDTO>>('/files/upload', formData);

  onProgress?.(100, 'Done');
  return response.data.data!;
}

/**
 * List all files for the current user (encrypted metadata).
 */
export async function listFiles(page = 1, limit = 20): Promise<FileListResponse> {
  const response = await api.get<ApiResponse<FileListResponse>>('/files', {
    params: { page, limit },
  });
  return response.data.data!;
}

/**
 * Download and decrypt a single file.
 * @returns Decrypted file as Blob + decrypted metadata
 */
export async function downloadAndDecryptFile(
  fileId: string,
  encKey: CryptoKey
): Promise<{ blob: Blob; name: string; mimeType: string }> {
  const response = await api.get(`/files/${fileId}/download`, { responseType: 'arraybuffer' });
  const encryptedBytes = new Uint8Array(response.data);

  const fileIv = response.headers['x-file-iv'];
  const encryptedName = response.headers['x-encrypted-name'];
  const nameIv = response.headers['x-name-iv'];
  const encryptedMime = response.headers['x-mime-encrypted'];
  const mimeIv = response.headers['x-mime-iv'];

  const decryptedBytes = await decryptFile(encKey, encryptedBytes, fileIv);
  const name = await decryptString(encKey, encryptedName, nameIv);

  let mimeType = 'application/octet-stream';
  if (encryptedMime && mimeIv) {
    mimeType = await decryptString(encKey, encryptedMime, mimeIv);
  }

  return { blob: bytesToBlob(decryptedBytes, mimeType), name, mimeType };
}

/**
 * Rename a file (encrypt the new name client-side).
 */
export async function renameFile(fileId: string, newName: string, encKey: CryptoKey): Promise<FileDTO> {
  const nameIv = generateIV();
  const encryptedName = await encryptString(encKey, newName, nameIv);
  const response = await api.patch<ApiResponse<FileDTO>>(`/files/${fileId}/rename`, {
    encryptedName,
    nameIv,
  });
  return response.data.data!;
}

/**
 * Delete a file permanently.
 */
export async function deleteFile(fileId: string): Promise<void> {
  await api.delete(`/files/${fileId}`);
}

/**
 * Decrypt file metadata (filename + MIME) for display.
 */
export async function decryptFileMetadata(file: FileDTO, encKey: CryptoKey): Promise<DecryptedFile> {
  const name = await decryptString(encKey, file.encryptedName, file.nameIv);
  let mimeType: string | undefined;
  if (file.mimeEncrypted && file.mimeIv) {
    mimeType = await decryptString(encKey, file.mimeEncrypted, file.mimeIv);
  }
  return { ...file, name, mimeType };
}

/**
 * Perform semantic search.
 * @param query The plaintext search query
 * @param encKey Encryption key (for decrypting result filenames)
 * @param topK Number of results
 * @returns Decrypted search results with filenames
 */
export async function semanticSearch(
  query: string,
  encKey: CryptoKey,
  topK = 10
): Promise<Array<SearchResult & { decryptedName: string }>> {
  const queryEmbedding = await generateQueryEmbedding(query);
  const queryIv = generateIV();
  const encryptedQuery = await encryptString(encKey, query, queryIv);

  const response = await api.post<ApiResponse<{ results: SearchResult[] }>>('/search', {
    queryEmbedding,
    topK,
    threshold: 0.3,
    encryptedQuery,
    queryIv,
  });

  const results = response.data.data?.results ?? [];
  const decrypted = await Promise.all(
    results.map(async (r) => ({
      ...r,
      decryptedName: await decryptString(encKey, r.encryptedName, r.nameIv),
    }))
  );
  return decrypted;
}

