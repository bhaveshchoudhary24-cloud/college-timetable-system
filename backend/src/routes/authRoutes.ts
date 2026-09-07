import { Router } from 'express';
import { login, register, getMe, changePassword } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/change-password', changePassword);
router.get('/me', authenticateToken, getMe);

export default router;
