import express from 'express';
import { handleCreateAsset, handleGetAssets, handleUpdateAsset } from '../controllers/assetController.js';
import { validate } from '../middlewares/validate.js';
import { assetSchema } from '../middlewares/schemas.js';

const router = express.Router();

router.get('/',    handleGetAssets);
router.post('/',   validate(assetSchema), handleCreateAsset);
router.put('/:id', handleUpdateAsset);

export default router;