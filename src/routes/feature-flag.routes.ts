import { Router } from 'express';
import { FeatureFlagController } from '../controllers/feature-flag.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  flagKeyParamSchema,
  flagIdParamSchema,
  evaluateFlagSchema,
  trackConversionSchema,
  createFeatureFlagSchema,
  updateFeatureFlagSchema,
  getMetricsSchema,
} from '../validators/schemas/feature-flag.schemas';

const router = Router();

// ── Public evaluation (requires auth to identify user) ───────────────────────
router.get('/evaluate/:key', authenticate, validate(evaluateFlagSchema), FeatureFlagController.evaluate);
router.post(
  '/evaluate/:key/conversion',
  authenticate,
  validate(trackConversionSchema),
  FeatureFlagController.trackConversion,
);

// ── Admin CRUD (admin only) ───────────────────────────────────────────────────
router.use(authenticate, requireAdmin);

router.get('/', FeatureFlagController.list);
router.post('/', validate(createFeatureFlagSchema), FeatureFlagController.create);
router.get('/key/:key', validate(flagKeyParamSchema), FeatureFlagController.getByKey);
router.get('/:id', validate(flagIdParamSchema), FeatureFlagController.getById);
router.put('/:id', validate(updateFeatureFlagSchema), FeatureFlagController.update);
router.delete('/:id', validate(flagIdParamSchema), FeatureFlagController.remove);
router.post('/:id/disable', validate(flagIdParamSchema), FeatureFlagController.disable);
router.get('/metrics/:key', validate(getMetricsSchema), FeatureFlagController.getMetrics);

export default router;
