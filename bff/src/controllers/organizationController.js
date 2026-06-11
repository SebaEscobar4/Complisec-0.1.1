import { getComplianceGoals, updateComplianceGoals } from '../services/organizationService.js';

export const handleGetComplianceGoals = async (req, res) => {
  try {
    const { id } = req.params;
    const goals = await getComplianceGoals(id);
    return res.status(200).json({ data: goals });
  } catch (error) {
    console.error('Get Compliance Goals Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve compliance goals.' });
  }
};

export const handleUpdateComplianceGoals = async (req, res) => {
  try {
    const { id } = req.params;
    const { goals } = req.body;
    
    if (!Array.isArray(goals)) {
      return res.status(400).json({ error: 'Bad Request', message: 'Goals must be an array.' });
    }

    const updatedGoals = await updateComplianceGoals(id, goals);
    return res.status(200).json({ data: updatedGoals });
  } catch (error) {
    console.error('Update Compliance Goals Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update compliance goals.' });
  }
};
