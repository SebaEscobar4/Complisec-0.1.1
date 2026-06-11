import express from 'express';
import {
  handleUploadEvidence,
  handleGetEvidences,
  handleReviewEvidence,
  handleGetRepository,
  upload,
} from '../controllers/evidenceController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET  /api/evidences/repository?organization_id=:id  — repositorio completo (debe ir ANTES de /:soa_id)
router.get('/repository', requireAuth, handleGetRepository);

// GET  /api/evidences/:soa_id  — evidencias de un control
router.get('/:soa_id', requireAuth, handleGetEvidences);

// POST /api/evidences  — subir evidencia
router.post('/', requireAuth, upload.single('file'), handleUploadEvidence);

// PATCH /api/evidences/:id/review  — aprobar o rechazar (ADMIN, CISO, AUDITOR)
router.patch('/:id/review', requireAuth, requireRole(['ADMIN', 'CISO', 'AUDITOR']), handleReviewEvidence);

export default router;