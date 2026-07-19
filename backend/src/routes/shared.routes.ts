import { Router } from 'express';
import { getSharedRecipe } from '../controllers/recipes.controller.js';

// Public routes — no auth; access is granted by knowing the share token.
const router = Router();
router.get('/:token', getSharedRecipe);
export default router;
