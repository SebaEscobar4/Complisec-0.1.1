import express from 'express';
import {
  handleGetAudits, handleGetAudit,
  handleCreateAudit, handleUpdateAudit,
  handleUploadReport, uploadReport,
} from '../controllers/AuditController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/',          requireAuth, handleGetAudits);
router.get('/:id',       requireAuth, handleGetAudit);
router.post('/',         requireAuth, handleCreateAudit);
router.put('/:id',       requireAuth, handleUpdateAudit);
router.post('/:id/report', requireAuth, uploadReport.single('file'), handleUploadReport);

export default router;