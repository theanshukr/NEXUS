import { Router } from 'express';
import multer from 'multer';
import { storageService } from '../index.js';
import { STORAGE_CONFIG } from '../config.js';

const router = Router();

// Configure multer to store files in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: STORAGE_CONFIG.LIMITS.MAX_SIZE_BYTES
  },
  fileFilter: (req, file, cb) => {
    if (STORAGE_CONFIG.LIMITS.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid MIME type. Allowed types: ${STORAGE_CONFIG.LIMITS.ALLOWED_MIME_TYPES.join(', ')}`));
    }
  }
});

/**
 * Health endpoint to verify connection, bucket existence and access.
 * Performs a real upload and delete of a tiny .healthcheck file.
 */
router.get('/health', async (req, res, next) => {
  try {
    const healthCheckFile = {
      buffer: Buffer.from('OK'),
      mimetype: 'text/plain',
      size: 2
    };

    // Upload tiny file
    const uploadResult = await storageService.upload(healthCheckFile, { category: 'healthcheck' });
    
    // Delete tiny file
    await storageService.delete(uploadResult.path);

    res.status(200).json({
      success: true,
      provider: storageService.providerName,
      bucket: uploadResult.bucket,
      status: 'connected'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Upload test endpoint.
 */
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded or file rejected by filter.' });
    }

    const result = await storageService.upload(req.file, { category: 'development' });
    res.status(200).json({
      success: true,
      provider: result.provider,
      bucket: result.bucket,
      path: result.path,
      mimeType: result.mimeType,
      size: result.size,
      uploadedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Download test endpoint.
 * Note: Only for internal verification.
 */
router.get('/download', async (req, res, next) => {
  try {
    const { path } = req.query;
    if (!path) {
      return res.status(400).json({ error: 'Path query parameter is required.' });
    }

    const buffer = await storageService.download(path);
    // Since we don't store mimeType directly on the path name, we send default octet-stream for test
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    res.status(200).send(buffer);
  } catch (error) {
    next(error);
  }
});

/**
 * Signed URL test endpoint.
 */
router.get('/signed-url', async (req, res, next) => {
  try {
    const { path } = req.query;
    if (!path) {
      return res.status(400).json({ error: 'Path query parameter is required.' });
    }

    const expiresInSeconds = 60;
    const signedUrl = await storageService.createSignedUrl(path, expiresInSeconds);

    res.status(200).json({
      success: true,
      signedUrl,
      expiresIn: expiresInSeconds
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete test endpoint.
 */
router.delete('/test-delete', async (req, res, next) => {
  try {
    const { path } = req.query;
    if (!path) {
      return res.status(400).json({ error: 'Path query parameter is required.' });
    }

    const success = await storageService.delete(path);

    res.status(200).json({ success });
  } catch (error) {
    next(error);
  }
});

// Error handling specific to multer and storage
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File size exceeds the configured limit.' });
    }
    return res.status(400).json({ error: error.message });
  }
  // Let global error handler deal with standard AppErrors
  next(error);
});

export default router;
