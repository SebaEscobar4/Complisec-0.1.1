import express from 'express';
import { handleGetComplianceGoals, handleUpdateComplianceGoals } from '../controllers/organizationController.js';

const router = express.Router();

router.get('/:id/goals', handleGetComplianceGoals);
router.put('/:id/goals', handleUpdateComplianceGoals);

export default router;
