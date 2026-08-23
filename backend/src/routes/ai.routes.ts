import { Router } from 'express';
import {
  getAiLanguages, getAiStatus, patchAiLanguage, postAiCapture, postAiChat, postAiRecipe, postAiRework,
} from '../controllers/ai.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { aiAccessMiddleware } from '../middleware/ai-access.middleware.js';

const router = Router();
router.use(authMiddleware);

// Status and the language preference are open to any signed-in user: the UI has
// to explain why the assistant is missing, and the language is a setting you can
// have an opinion about before an admin turns the assistant on for you.
// Everything that spends tokens sits behind the gate.
router.get('/status', getAiStatus);
router.get('/languages', getAiLanguages);
router.patch('/language', patchAiLanguage);
router.use(aiAccessMiddleware);
router.post('/chat', postAiChat);
router.post('/recipe', postAiRecipe);
router.post('/capture', postAiCapture);
router.post('/rework', postAiRework);

export default router;
