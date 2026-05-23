import { query } from '../config/db.js';

export const createAsset = async (assetData) => {
  const result = await query(
    `INSERT INTO assets (organization_id, name, description, confidentiality_req, integrity_req, availability_req)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [assetData.organization_id, assetData.name, assetData.description || null,
     assetData.confidentiality_req, assetData.integrity_req, assetData.availability_req]
  );
  return result.rows[0];
};

export const getAssetsByOrganization = async (organizationId) => {
  const result = await query(
    `SELECT * FROM assets WHERE organization_id = $1 ORDER BY created_at DESC`,
    [organizationId]
  );
  return result.rows;
};

export const updateAsset = async (id, data) => {
  const { name, description, confidentiality_req, integrity_req, availability_req } = data;
  const result = await query(
    `UPDATE assets SET
       name                 = COALESCE($1, name),
       description          = $2,
       confidentiality_req  = COALESCE($3, confidentiality_req),
       integrity_req        = COALESCE($4, integrity_req),
       availability_req     = COALESCE($5, availability_req)
     WHERE id = $6 RETURNING *`,
    [name, description || null, confidentiality_req, integrity_req, availability_req, id]
  );
  return result.rows[0] || null;
};