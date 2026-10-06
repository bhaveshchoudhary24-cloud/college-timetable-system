import { Router } from 'express';
import { getSettings, updateSettings, resetSettings, getSystemStats, reseedCanonical168Controller } from '../controllers/settingsController';

const router = Router();

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/reset', resetSettings);
router.get('/stats', getSystemStats);
router.post('/reseed-168', reseedCanonical168Controller);

export default router;
