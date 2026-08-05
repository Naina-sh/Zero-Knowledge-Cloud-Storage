/**
 * File routes.
 * @module modules/files/files.routes
 */

import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { uploadLimiter } from '../../middleware/rateLimit.middleware';
import { listFilesSchema, renameFileSchema, fileIdParamSchema } from './files.schema';
import { upload, list, getOne, download, rename, remove } from './files.controller';

const router = Router();

// Multer — store file in memory (we write it to storage service ourselves)
// Limit to 100 MB per encrypted file
const storage = multer.memoryStorage();
const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // Accept all — files are encrypted blobs with generic content type
    if (!file) {
      cb(new Error('No file provided'));
      return;
    }
    cb(null, true);
  },
});

// All file routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/files/upload
 * @desc    Upload an encrypted file with embedding
 * @access  Private
 */
router.post('/upload', uploadLimiter, uploadMiddleware.single('file'), upload);

/**
 * @route   GET /api/files
 * @desc    List user's files with pagination
 * @access  Private
 */
router.get('/', validate(listFilesSchema), list);

/**
 * @route   GET /api/files/:id
 * @desc    Get file metadata
 * @access  Private
 */
router.get('/:id', validate(fileIdParamSchema), getOne);

/**
 * @route   GET /api/files/:id/download
 * @desc    Download encrypted file blob
 * @access  Private
 */
router.get('/:id/download', validate(fileIdParamSchema), download);

/**
 * @route   PATCH /api/files/:id/rename
 * @desc    Rename a file (client encrypts new name)
 * @access  Private
 */
router.patch('/:id/rename', validate(fileIdParamSchema), validate(renameFileSchema), rename);

/**
 * @route   DELETE /api/files/:id
 * @desc    Delete a file and its embedding
 * @access  Private
 */
router.delete('/:id', validate(fileIdParamSchema), remove);

export { router as fileRoutes };
