import { createAsset, getAssetsByOrganization, updateAsset } from '../services/assetService.js';

export const handleCreateAsset = async (req, res, next) => {
  try {
    const newAsset = await createAsset(req.body);
    return res.status(201).json({ message: 'Activo registrado correctamente.', data: newAsset });
  } catch (error) {
    console.error('Create Asset Error:', error);
    next(error);
  }
};

export const handleGetAssets = async (req, res, next) => {
  try {
    const { organization_id } = req.query;
    if (!organization_id) {
      return res.status(400).json({ error: 'Bad Request', message: 'organization_id es requerido.' });
    }
    const assets = await getAssetsByOrganization(organization_id);
    return res.status(200).json({ data: assets });
  } catch (error) {
    console.error('Get Assets Error:', error);
    next(error);
  }
};

export const handleUpdateAsset = async (req, res, next) => {
  try {
    const updated = await updateAsset(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Activo no encontrado.' });
    return res.status(200).json({ data: updated });
  } catch (error) {
    console.error('Update Asset Error:', error);
    next(error);
  }
};