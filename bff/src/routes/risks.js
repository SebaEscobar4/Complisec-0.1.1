import express from 'express';
import { 
  handleCreateRisk, 
  handleGetRisks, 
  handleUpdateRisk, 
  handleDeleteRisk,
  handleGetRiskTasks,
  handleAddRiskTask,
  handleUpdateRiskTaskStatus,
  handleDeleteRiskTask,
  handleGetAllOrgTasks,
  handleGetMitigationPlans
} from '../controllers/riskController.js';
import { validate } from '../middlewares/validate.js';
import { riskSchema } from '../middlewares/schemas.js';

const router = express.Router();

router.post('/', validate(riskSchema), handleCreateRisk);
router.get('/', handleGetRisks);
router.put('/:id', validate(riskSchema), handleUpdateRisk);
router.delete('/:id', handleDeleteRisk);

// Get all tasks for an organization (old loose tasks approach)
router.get('/organization/:org_id/tasks', handleGetAllOrgTasks);

// Get mitigation plans (consolidated approach)
router.get('/organization/:org_id/mitigation-plans', handleGetMitigationPlans);
router.get('/:id/tasks', handleGetRiskTasks);
router.post('/:id/tasks', handleAddRiskTask);
router.put('/tasks/:taskId', handleUpdateRiskTaskStatus);
router.delete('/tasks/:taskId', handleDeleteRiskTask);

export default router;
