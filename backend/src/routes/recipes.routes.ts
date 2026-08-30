import { Router } from 'express';
import multer from 'multer';
import {
  listRecipes,
  postRecipe,
  getRecipe,
  patchRecipe,
  removeRecipe,
  duplicateRecipeHandler,
  updateTags,
  listImages,
  uploadImage,
  removeImage,
  reorderImagesHandler,
  setCoverImage,
  getRecipeCollections,
  listRecipeSites,
  shareRecipe,
} from '../controllers/recipes.controller.js';
import { requireUser } from '../middleware/auth.middleware.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const router = Router();
router.use(requireUser);
router.get('/', listRecipes);
router.post('/', postRecipe);
router.get('/sites', listRecipeSites);
router.get('/:id', getRecipe);
router.patch('/:id', patchRecipe);
router.delete('/:id', removeRecipe);
router.post('/:id/duplicate', duplicateRecipeHandler);
router.post('/:id/tags', updateTags);
router.get('/:id/images', listImages);
router.post('/:id/images', upload.single('image'), uploadImage);
router.patch('/:id/images/reorder', reorderImagesHandler);
router.delete('/:id/images/:imageId', removeImage);
router.patch('/:id/cover-image', setCoverImage);
router.get('/:id/collections', getRecipeCollections);
router.post('/:id/share', shareRecipe);
export default router;
