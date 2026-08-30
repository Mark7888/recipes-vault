import { Router } from 'express';
import {
  getAiLanguages, getAiStatus, patchAiLanguage, postAiCapture, postAiChat, postAiRecipe, postAiRework,
} from '../controllers/ai.controller.js';
import { requireUser } from '../middleware/auth.middleware.js';
import { aiAccessMiddleware } from '../middleware/ai-access.middleware.js';
import { aiRateLimit } from '../middleware/rate-limit.middleware.js';
import { env } from '../config/env.js';

const router = Router();
router.use(requireUser);

// Status and the language preference are open to any signed-in user: the UI has
// to explain why the assistant is missing, and the language is a setting you can
// have an opinion about before an admin turns the assistant on for you.
// Everything that spends tokens sits behind the gate.
router.get('/status', getAiStatus);
router.get('/languages', getAiLanguages);
router.patch('/language', patchAiLanguage);
// The gate first, then the budget: a user without access is turned away before
// they can spend anyone's allowance. Both are per user, so a request through an
// API key is checked and counted exactly like one from the browser.
router.use(aiAccessMiddleware);
router.use(aiRateLimit(env.AI_RATE_LIMIT_PER_MINUTE));
router.post('/chat', postAiChat);
router.post('/recipe', postAiRecipe);
router.post('/capture', postAiCapture);
router.post('/rework', postAiRework);

export default router;
