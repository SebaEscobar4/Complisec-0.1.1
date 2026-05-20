import { query } from '../config/db.js';

export const getAudits = async (organizationId) => {
  const result = await query(
    `SELECT * FROM audits WHERE organization_id = $1 ORDER BY created_at DESC`,
    [organizationId]
  );
  return result.rows;
};

export const getAuditById = async (id) => {
  const result = await query(`SELECT * FROM audits WHERE id = $1`, [id]);
  return result.rows[0] || null;
};

export const createAudit = async (data) => {
  const { organization_id, title, auditor_name, responsible_name,
          start_date, end_date, status, audit_type, observations } = data;
  const result = await query(
    `INSERT INTO audits
       (organization_id, title, auditor_name, responsible_name,
        start_date, end_date, status, audit_type, observations)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [organization_id, title, auditor_name, responsible_name,
     start_date || null, end_date || null,
     status || 'NOT_STARTED', audit_type || 'INTERNAL', observations || null]
  );
  return result.rows[0];
};

export const updateAudit = async (id, data) => {
  const { title, auditor_name, responsible_name, start_date, end_date,
          status, rating, action_plan_stage, audit_type, observations } = data;
  const result = await query(
    `UPDATE audits SET
       title             = COALESCE($1, title),
       auditor_name      = COALESCE($2, auditor_name),
       responsible_name  = COALESCE($3, responsible_name),
       start_date        = $4,
       end_date          = $5,
       status            = COALESCE($6, status),
       rating            = $7,
       action_plan_stage = COALESCE($8, action_plan_stage),
       audit_type        = COALESCE($9, audit_type),
       observations      = $10,
       updated_at        = CURRENT_TIMESTAMP
     WHERE id = $11 RETURNING *`,
    [title, auditor_name, responsible_name,
     start_date || null, end_date || null,
     status, rating || null, action_plan_stage,
     audit_type, observations || null, id]
  );
  return result.rows[0];
};

export const saveAuditReport = async (id, fileUrl, fileName) => {
  const result = await query(
    `UPDATE audits SET report_url=$1, report_name=$2, updated_at=CURRENT_TIMESTAMP
     WHERE id=$3 RETURNING *`,
    [fileUrl, fileName, id]
  );
  return result.rows[0];
};