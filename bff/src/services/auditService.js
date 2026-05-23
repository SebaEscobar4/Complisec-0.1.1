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
  const {
    organization_id, title, audit_type, auditor_name, responsible_name,
    start_date, end_date, status, observations, created_by,
  } = data;

  const result = await query(
    `INSERT INTO audits
       (organization_id, title, audit_type, auditor_name, responsible_name,
        planned_date, start_date, end_date, status, general_observations, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      organization_id,
      title,
      audit_type       || 'INTERNAL',
      auditor_name,
      responsible_name,
      start_date       || null,   // planned_date
      start_date       || null,   // start_date
      end_date         || null,
      status           || 'PLANNED',
      observations     || null,
      created_by       || null,
    ]
  );
  return result.rows[0];
};

export const updateAudit = async (id, data) => {
  const {
    title, audit_type, auditor_name, responsible_name,
    start_date, end_date, status, rating, action_plan_stage,
    general_observations, observations,
  } = data;

  const result = await query(
    `UPDATE audits SET
       title                = COALESCE($1,  title),
       audit_type           = COALESCE($2,  audit_type),
       auditor_name         = COALESCE($3,  auditor_name),
       responsible_name     = COALESCE($4,  responsible_name),
       planned_date         = $5,
       start_date           = $6,
       end_date             = $7,
       status               = COALESCE($8,  status),
       rating               = $9,
       action_plan_stage    = COALESCE($10, action_plan_stage),
       general_observations = COALESCE($11, $12, general_observations),
       updated_at           = CURRENT_TIMESTAMP
     WHERE id = $13
     RETURNING *`,
    [
      title, audit_type, auditor_name, responsible_name,
      start_date || null, start_date || null, end_date || null,
      status, rating || null, action_plan_stage,
      general_observations || null, observations || null,
      id,
    ]
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