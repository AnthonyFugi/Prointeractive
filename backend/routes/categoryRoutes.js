import { Router } from 'express';
import { listCategories, createCategory, deleteCategory, renameCategory, reorderCategories } from '../controllers/categoryController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();
router.get('/', listCategories);
router.post('/', protect, restrictTo('admin'), createCategory);
router.put('/reorder', protect, restrictTo('admin'), reorderCategories);
router.patch('/:id', protect, restrictTo('admin'), renameCategory);
router.delete('/:id', protect, restrictTo('admin'), deleteCategory);

export default router;
