import { query } from '../config/db.js';

export const getComplianceGoals = async (organizationId) => {
  const selectQuery = `SELECT compliance_goals FROM organizations WHERE id = $1`;
  const result = await query(selectQuery, [organizationId]);
  
  if (result.rows.length === 0) return null;
  
  // Si es nulo o vacío en BD, retornamos null para que el frontend use sus defaults
  const goals = result.rows[0].compliance_goals;
  if (!goals || goals.length === 0) return null;
  return goals;
};

export const updateComplianceGoals = async (organizationId, goalsData) => {
  const updateQuery = `
    UPDATE organizations 
    SET compliance_goals = $1::jsonb, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING compliance_goals
  `;
  const result = await query(updateQuery, [JSON.stringify(goalsData), organizationId]);
  return result.rows[0]?.compliance_goals;
};
