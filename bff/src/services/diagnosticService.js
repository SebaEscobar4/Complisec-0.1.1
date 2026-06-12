import { query } from '../config/db.js';

export const saveDiagnostic = async (organizationId, risks) => {
  for (const r of risks) {
    await query(
      `INSERT INTO diagnostic_risks
        (organization_id, domain_key, domain_label, probability, impact_value, risk_score, risk_level_label)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (organization_id, domain_key)
       DO UPDATE SET
         probability       = EXCLUDED.probability,
         impact_value      = EXCLUDED.impact_value,
         risk_score        = EXCLUDED.risk_score,
         risk_level_label  = EXCLUDED.risk_level_label,
         updated_at        = CURRENT_TIMESTAMP`,
      [organizationId, r.domain_key, r.domain_label, r.probability, r.impact_value, r.risk_score, r.risk_level_label]
    );
  }
};

/**
 * Aplica las respuestas del diagnóstico inicial al SoA: para cada control
 * referenciado, crea (si no existe) la fila correspondiente en `soa` con el
 * estado de implementación derivado de la respuesta. No sobreescribe filas
 * ya existentes para no perder ajustes manuales posteriores.
 */
export const applyDiagnosticToSoA = async (organizationId, controlAssessments) => {
  const soaMap = {};

  for (const ca of controlAssessments) {
    const controlRes = await query(
      `SELECT id FROM annex_a_controls WHERE control_number = $1`,
      [ca.control_number]
    );
    const control = controlRes.rows[0];
    if (!control) continue;

    const insertRes = await query(
      `INSERT INTO soa (organization_id, control_id, is_applicable, justification, implementation_status)
       VALUES ($1, $2, true, 'Definido en diagnóstico inicial', $3)
       ON CONFLICT (organization_id, control_id) DO NOTHING
       RETURNING id`,
      [organizationId, control.id, ca.implementation_status]
    );

    let soaId = insertRes.rows[0]?.id;
    if (!soaId) {
      const existing = await query(
        `SELECT id FROM soa WHERE organization_id = $1 AND control_id = $2`,
        [organizationId, control.id]
      );
      soaId = existing.rows[0]?.id;
    }

    if (soaId) soaMap[ca.control_number] = soaId;
  }

  return soaMap;
};

export const getDiagnostic = async (organizationId) => {
  const result = await query(
    `SELECT domain_key, domain_label, probability, impact_value, risk_score, risk_level_label
     FROM diagnostic_risks
     WHERE organization_id = $1
     ORDER BY risk_score DESC`,
    [organizationId]
  );
  return result.rows;
};

/**
 * Guarda o actualiza el responsable de seguridad y compromisos
 * en la tabla organizations.
 */
export const saveOfficerData = async (organizationId, { officerName, officerRole, reviewFrequency, commitments }) => {
  await query(
    `UPDATE organizations
     SET security_officer_name = $1,
         security_officer_role = $2,
         review_frequency      = $3,
         commitments           = $4::jsonb,
         updated_at            = CURRENT_TIMESTAMP
     WHERE id = $5`,
    [officerName || null, officerRole || null, reviewFrequency || '12m', JSON.stringify(commitments || []), organizationId]
  );
};

/**
 * Obtiene los datos del responsable y compromisos de la organización.
 */
export const getOfficerData = async (organizationId) => {
  const result = await query(
    `SELECT security_officer_name, security_officer_role, review_frequency, commitments
     FROM organizations
     WHERE id = $1`,
    [organizationId]
  );
  return result.rows[0] || null;
};