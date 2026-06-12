import { saveDiagnostic, getDiagnostic, saveOfficerData, getOfficerData, applyDiagnosticToSoA } from '../services/diagnosticService.js';

export const handleSaveDiagnostic = async (req, res, next) => {
  try {
    const { organization_id, risks, officer, control_assessments } = req.body;

    if (!organization_id || !Array.isArray(risks)) {
      return res.status(400).json({ error: 'Bad Request', message: 'organization_id y risks son requeridos.' });
    }

    await saveDiagnostic(organization_id, risks);

    // Guardar responsable y compromisos si vienen en el body
    if (officer) {
      await saveOfficerData(organization_id, officer);
    }

    // Aplicar respuestas del diagnóstico al SoA (estado de implementación por control)
    let soaMap = {};
    if (Array.isArray(control_assessments) && control_assessments.length) {
      soaMap = await applyDiagnosticToSoA(organization_id, control_assessments);
    }

    return res.status(201).json({ message: 'Diagnóstico guardado correctamente.', data: { soaMap } });
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