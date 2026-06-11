import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { saveEvidence, getEvidencesBySoaId, reviewEvidence, getEvidencesByOrganization } from '../services/evidenceService.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + unique + path.extname(file.originalname));
  },
});

export const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/evidences — sube archivo
export const handleUploadEvidence = async (req, res, next) => {
  try {
    const { soa_id } = req.body;
    if (!soa_id)    return res.status(400).json({ message: 'El ID del SoA es requerido.' });
    if (!req.file)  return res.status(400).json({ message: 'No se subió ningún archivo.' });

    const evidence = await saveEvidence({
      soa_id,
      document_name: req.file.originalname,
      file_url:      `/uploads/${req.file.filename}`,
      uploaded_by:   req.user?.userId,
    });
    return res.status(201).json({ message: 'Evidencia subida correctamente.', data: evidence });
  } catch (error) { next(error); }
};

// GET /api/evidences/:soa_id — evidencias de un control
export const handleGetEvidences = async (req, res, next) => {
  try {
    const evidences = await getEvidencesBySoaId(req.params.soa_id);
    return res.status(200).json({ data: evidences });
  } catch (error) { next(error); }
};

// PATCH /api/evidences/:id/review — aprobar o rechazar
export const handleReviewEvidence = async (req, res, next) => {
  try {
    const { review_status, review_comment } = req.body;
    const validStatuses = ['APPROVED', 'REJECTED', 'PENDING'];

    if (!validStatuses.includes(review_status)) {
      return res.status(400).json({ message: 'Estado inválido. Usa APPROVED, REJECTED o PENDING.' });
    }

    const updated = await reviewEvidence(req.params.id, review_status, req.user?.userId, review_comment);
    if (!updated) return res.status(404).json({ message: 'Evidencia no encontrada.' });

    return res.status(200).json({ message: 'Revisión guardada.', data: updated });
  } catch (error) { next(error); }
};

// GET /api/evidences/repository?organization_id=:id — repositorio completo
export const handleGetRepository = async (req, res, next) => {
  try {
    const { organization_id } = req.query;
    if (!organization_id) return res.status(400).json({ message: 'organization_id es requerido.' });

    const evidences = await getEvidencesByOrganization(organization_id);
    return res.status(200).json({ data: evidences });
  } catch (error) { next(error); }
};