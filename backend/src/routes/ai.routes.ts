import { Router } from 'express';
import { getAiStatus, postAiCapture, postAiChat, postAiRecipe, postAiRework } from '../controllers/ai.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { aiAccessMiddleware } from '../middleware/ai-access.middleware.js';

const router = Router();
router.use(authMiddleware);

// Status is readable by any signed-in user so the UI can explain why the
// assistant is missing; everything that spends tokens sits behind the gate.
router.get('/status', getAiStatus);
router.use(aiAccessMiddleware);
router.post('/chat', postAiChat);
router.post('/recipe', postAiRecipe);
router.post('/capture', postAiCapture);
router.post('/rework', postAiRework);

export default router;
