import { query } from '../config/db.js';

export const createRisk = async (riskData) => {
  const insertQuery = `
    INSERT INTO risk_profiles (
      organization_id, 
      asset_id, 
      threat, 
      vulnerability, 
      likelihood, 
      impact,
      treatment_decision,
      residual_likelihood,
      residual_impact
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
    RETURNING *
  `;
  
  const values = [
    riskData.organization_id,
    riskData.asset_id,
    riskData.threat,
    riskData.vulnerability,
    riskData.likelihood,
    riskData.impact,
    riskData.treatment_decision,
    riskData.residual_likelihood || null,
    riskData.residual_impact || null
  ];

  const result = await query(insertQuery, values);
  return result.rows[0];
};

export const updateRisk = async (id, riskData) => {
  const updateQuery = `
    UPDATE risk_profiles SET
      asset_id = $1,
      threat = $2,
      vulnerability = $3,
      likelihood = $4,
      impact = $5,
      treatment_decision = $6,
      residual_likelihood = $7,
      residual_impact = $8
    WHERE id = $9 AND organization_id = $10
    RETURNING *
  `;
  
  const values = [
    riskData.asset_id,
    riskData.threat,
    riskData.vulnerability,
    riskData.likelihood,
    riskData.impact,
    riskData.treatment_decision,
    riskData.residual_likelihood || null,
    riskData.residual_impact || null,
    id,
    riskData.organization_id
  ];

  const result = await query(updateQuery, values);
  return result.rows[0];
};

export const deleteRisk = async (id, organizationId) => {
  const deleteQuery = `DELETE FROM risk_profiles WHERE id = $1 AND organization_id = $2 RETURNING id`;
  const result = await query(deleteQuery, [id, organizationId]);
  return result.rows[0];
};

export const getRisksByOrganization = async (organizationId) => {
  const selectQuery = `
    SELECT r.*, a.name as asset_name, 
           EXISTS(SELECT 1 FROM soa WHERE soa.risk_profile_id = r.id) as has_plan
    FROM risk_profiles r
    JOIN assets a ON r.asset_id = a.id
    WHERE r.organization_id = $1 
    ORDER BY r.risk_level DESC
  `;
  
  const result = await query(selectQuery, [organizationId]);
  return result.rows;
};

// --- RISK TASKS ---

export const getRiskTasks = async (riskProfileId) => {
  const selectQuery = `
    SELECT * FROM risk_tasks 
    WHERE risk_profile_id = $1 
    ORDER BY created_at ASC
  `;
  const result = await query(selectQuery, [riskProfileId]);
  return result.rows;
};

export const addRiskTask = async (riskProfileId, description) => {
  const insertQuery = `
    INSERT INTO risk_tasks (risk_profile_id, description)
    VALUES ($1, $2)
    RETURNING *
  `;
  const result = await query(insertQuery, [riskProfileId, description]);
  return result.rows[0];
};

export const updateRiskTaskStatus = async (taskId, status) => {
  const updateQuery = `
    UPDATE risk_tasks SET status = $1
    WHERE id = $2
    RETURNING *
  `;
  const result = await query(updateQuery, [status, taskId]);
  return result.rows[0];
};

export const deleteRiskTask = async (taskId) => {
  const deleteQuery = `DELETE FROM risk_tasks WHERE id = $1 RETURNING id`;
  const result = await query(deleteQuery, [taskId]);
  return result.rows[0];
};

export const getAllOrgTasks = async (organizationId) => {
  const selectQuery = `
    SELECT 
      t.*, 
      r.threat, 
      r.vulnerability, 
      a.name as asset_name, 
      s.id as soa_id, 
      c.control_name, 
      c.control_number
    FROM risk_tasks t
    JOIN risk_profiles r ON t.risk_profile_id = r.id
    JOIN assets a ON r.asset_id = a.id
    LEFT JOIN soa s ON s.risk_profile_id = r.id
    LEFT JOIN annex_a_controls c ON s.control_id = c.id
    WHERE r.organization_id = $1
    ORDER BY t.created_at DESC
  `;
  const result = await query(selectQuery, [organizationId]);
  return result.rows;
};

export const getMitigationPlans = async (organizationId) => {
  const selectQuery = `
    SELECT 
      r.id as risk_profile_id,
      r.threat,
      r.vulnerability,
      a.name as asset_name,
      s.id as soa_id,
      s.implementation_status,
      c.control_number,
      c.control_name,
      COALESCE(
        (SELECT json_agg(json_build_object('id', t.id, 'description', t.description, 'status', t.status))
         FROM risk_tasks t WHERE t.risk_profile_id = r.id),
        '[]'::json
      ) as tasks
    FROM risk_profiles r
    JOIN assets a ON r.asset_id = a.id
    JOIN soa s ON s.risk_profile_id = r.id
    JOIN annex_a_controls c ON s.control_id = c.id
    WHERE r.organization_id = $1 AND r.treatment_decision = 'MITIGATE'
    ORDER BY s.updated_at DESC
  `;
  const result = await query(selectQuery, [organizationId]);
  return result.rows;
};
