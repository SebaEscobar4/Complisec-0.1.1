import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getAudits, getAuditById, createAudit, updateAudit, saveAuditReport } from '../services/auditService.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const p = path.join(process.cwd(), 'uploads', 'audits');
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    cb(null, p);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
export const uploadReport = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// GET /api/audits?organization_id=:id
export const handleGetAudits = async (req, res, next) => {
  try {
    const { organization_id } = req.query;
    if (!organization_id) return res.status(400).json({ message: 'organization_id requerido.' });
    const audits = await getAudits(organization_id);
    return res.status(200).json({ data: audits });
  } catch (e) { next(e); }
};

// GET /api/audits/:id
export const handleGetAudit = async (req, res, next) => {
  try {
    const audit = await getAuditById(req.params.id);
    if (!audit) return res.status(404).json({ message: 'Auditoría no encontrada.' });
    return res.status(200).json({ data: audit });
  } catch (e) { next(e); }
};

// POST /api/audits
export const handleCreateAudit = async (req, res, next) => {
  try {
    const data = { ...req.body, created_by: req.user?.userId || null };
    const audit = await createAudit(data);
    return res.status(201).json({ data: audit });
  } catch (e) { next(e); }
};

// PUT /api/audits/:id
export const handleUpdateAudit = async (req, res, next) => {
  try {
    const audit = await updateAudit(req.params.id, req.body);
    if (!audit) return res.status(404).json({ message: 'Auditoría no encontrada.' });
    return res.status(200).json({ data: audit });
  } catch (e) { next(e); }
};

// POST /api/audits/:id/report
export const handleUploadReport = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se subió ningún archivo.' });
    const fileUrl  = `/uploads/audits/${req.file.filename}`;
    const fileName = req.file.originalname;
    const audit = await saveAuditReport(req.params.id, fileUrl, fileName);
    return res.status(200).json({ data: audit });
  } catch (e) { next(e); }
};