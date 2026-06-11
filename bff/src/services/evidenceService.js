import { query } from '../config/db.js';

export const saveEvidence = async (evidenceData) => {
  const result = await query(
    `INSERT INTO evidences (soa_id, document_name, file_url, uploaded_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [evidenceData.soa_id, evidenceData.document_name, evidenceData.file_url, evidenceData.uploaded_by]
  );
  return result.rows[0];
};

export const getEvidencesBySoaId = async (soaId) => {
  const result = await query(
    `SELECT e.*, u.name as uploader_name
     FROM evidences e
     LEFT JOIN users u ON e.uploaded_by = u.id
     WHERE e.soa_id = $1
     ORDER BY e.uploaded_at DESC`,
    [soaId]
  );
  return result.rows;
};

/**
 * Actualiza el estado de revisión de una evidencia (PENDING → APPROVED | REJECTED).
 * Solo ADMIN o CISO pueden hacerlo.
 */
export const reviewEvidence = async (evidenceId, reviewStatus, reviewedBy, reviewComment = null) => {
  const result = await query(
    `UPDATE evidences
     SET review_status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, review_comment = $3
     WHERE id = $4
     RETURNING *`,
    [reviewStatus, reviewedBy, reviewComment, evidenceId]
  );
  return result.rows[0];
};

/**
 * Obtiene todas las evidencias de una organización con contexto del control ISO.
 * Usado por el repositorio central de evidencias.
 */
export const getEvidencesByOrganization = async (organizationId) => {
  const result = await query(
    `SELECT
       e.id,
       e.document_name,
       e.file_url,
       e.review_status,
       e.review_comment,
       e.uploaded_at,
       e.reviewed_at,
       u.name  AS uploader_name,
       rv.name AS reviewer_name,
       c.control_number,
       c.control_name,
       c.control_domain,
       s.is_applicable,
       s.implementation_status
     FROM evidences e
     JOIN soa s           ON e.soa_id = s.id
     JOIN annex_a_controls c ON s.control_id = c.id
     LEFT JOIN users u    ON e.uploaded_by  = u.id
     LEFT JOIN users rv   ON e.reviewed_by  = rv.id
     WHERE s.organization_id = $1
     ORDER BY e.uploaded_at DESC`,
    [organizationId]
  );
  return result.rows;
};