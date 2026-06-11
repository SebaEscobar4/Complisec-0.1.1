import { createRisk, getRisksByOrganization, updateRisk, deleteRisk, getRiskTasks, addRiskTask, updateRiskTaskStatus, deleteRiskTask, getAllOrgTasks, getMitigationPlans } from '../services/riskService.js';

export const handleCreateRisk = async (req, res) => {
  try {
    const newRisk = await createRisk(req.body);
    return res.status(201).json({
      message: 'Risk evaluated successfully.',
      data: newRisk
    });
  } catch (error) {
    console.error('Create Risk Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create risk profile.' });
  }
};

export const handleGetRisks = async (req, res) => {
  try {
    const { organization_id } = req.query;
    
    if (!organization_id) {
      return res.status(400).json({ error: 'Bad Request', message: 'organization_id query parameter is required.' });
    }

    const risks = await getRisksByOrganization(organization_id);
    return res.status(200).json({ data: risks });
  } catch (error) {
    console.error('Get Risks Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve risk profiles.' });
  }
};

export const handleUpdateRisk = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedRisk = await updateRisk(id, req.body);
    return res.status(200).json({ data: updatedRisk });
  } catch (error) {
    console.error('Update Risk Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update risk profile.' });
  }
};

export const handleDeleteRisk = async (req, res) => {
  try {
    const { id } = req.params;
    const { organization_id } = req.query;
    await deleteRisk(id, organization_id);
    return res.status(200).json({ message: 'Risk deleted successfully.' });
  } catch (error) {
    console.error('Delete Risk Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete risk profile.' });
  }
};

export const handleGetRiskTasks = async (req, res) => {
  try {
    const { id } = req.params;
    const tasks = await getRiskTasks(id);
    return res.status(200).json({ data: tasks });
  } catch (error) {
    console.error('Get Risk Tasks Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get risk tasks.' });
  }
};

export const handleGetAllOrgTasks = async (req, res) => {
  try {
    const { org_id } = req.params;
    const tasks = await getAllOrgTasks(org_id);
    return res.status(200).json({ data: tasks });
  } catch (error) {
    console.error('Get All Org Tasks Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get all org tasks.' });
  }
};

export const handleGetMitigationPlans = async (req, res) => {
  try {
    const { org_id } = req.params;
    const plans = await getMitigationPlans(org_id);
    return res.status(200).json({ data: plans });
  } catch (error) {
    console.error('Get Mitigation Plans Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get mitigation plans.' });
  }
};

export const handleAddRiskTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;
    const task = await addRiskTask(id, description);
    return res.status(201).json({ data: task });
  } catch (error) {
    console.error('Add Risk Task Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to add risk task.' });
  }
};

export const handleUpdateRiskTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    const task = await updateRiskTaskStatus(taskId, status);
    return res.status(200).json({ data: task });
  } catch (error) {
    console.error('Update Risk Task Status Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update risk task status.' });
  }
};

export const handleDeleteRiskTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    await deleteRiskTask(taskId);
    return res.status(200).json({ message: 'Task deleted successfully.' });
  } catch (error) {
    console.error('Delete Risk Task Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete risk task.' });
  }
};
