import { saveDiagnostic, getDiagnostic, saveOfficerData, getOfficerData } from '../services/diagnosticService.js';

export const handleSaveDiagnostic = async (req, res, next) => {
  try {
    const { organization_id, risks, officer } = req.body;

    if (!organization_id || !Array.isArray(risks)) {
      return res.status(400).json({ error: 'Bad Request', message: 'organization_id y risks son requeridos.' });
    }

    await saveDiagnostic(organization_id, risks);

    // Guardar responsable y compromisos si vienen en el body
    if (officer) {
      await saveOfficerData(organization_id, officer);
    }

    return res.status(201).json({ message: 'Diagnóstico guardado correctamente.' });
  } catch (error) {
    next(error);
  }
};

export const handleGetDiagnostic = async (req, res, next) => {
  try {
    const { organization_id } = req.query;

    if (!organization_id) {
      return res.status(400).json({ error: 'Bad Request', message: 'organization_id es requerido.' });
    }

    const [risks, officer] = await Promise.all([
      getDiagnostic(organization_id),
      getOfficerData(organization_id),
    ]);

    return res.status(200).json({ data: risks, officer });
  } catch (error) {
    next(error);
  }
};