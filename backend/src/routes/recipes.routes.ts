import { Router } from 'express';
import multer from 'multer';
import {
  listRecipes,
  getRecipe,
  patchRecipe,
  removeRecipe,
  updateTags,
  listImages,
  uploadImage,
  removeImage,
  setCoverImage,
  getRecipeCollections,
} from '../controllers/recipes.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const router = Router();
router.use(authMiddleware);
router.get('/', listRecipes);
router.get('/:id', getRecipe);
router.patch('/:id', patchRecipe);
router.delete('/:id', removeRecipe);
router.post('/:id/tags', updateTags);
router.get('/:id/images', listImages);
router.post('/:id/images', upload.single('image'), uploadImage);
router.delete('/:id/images/:imageId', removeImage);
router.patch('/:id/cover-image', setCoverImage);
router.get('/:id/collections', getRecipeCollections);
export default router;
