import { Router } from 'express';
import { deleteApiKey, getApiKeys, postApiKey } from '../controllers/api-keys.controller.js';
import { requireSession, requireUser } from '../middleware/auth.middleware.js';

const router = Router();

// Session-only: an API key must not be able to mint or revoke API keys. A key
// that could do that would outlive any attempt to take it away, which is more
// than its owner ever granted it.
router.use(requireUser, requireSession);

router.get('/', getApiKeys);
router.post('/', postApiKey);
router.delete('/:id', deleteApiKey);

export default router;
