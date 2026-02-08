import { Response, NextFunction } from 'express';
import { seedService } from '../services/seed.service.js';
import { AuthRequest } from '../middleware/auth.js';

export const importSeedData = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await seedService.seedData(req.userId!);
        if (result.alreadySeeded) {
            res.status(200).json(result);
        } else {
            res.status(201).json(result);
        }
    } catch (error) {
        next(error);
    }
};
