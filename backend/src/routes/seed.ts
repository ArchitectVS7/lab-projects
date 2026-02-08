import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { importSeedData } from '../controllers/seed.controller.js';

const router = Router();

router.use(authenticate);

router.post('/', importSeedData);

export default router;
