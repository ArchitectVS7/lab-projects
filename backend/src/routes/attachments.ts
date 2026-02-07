import { Router, Response, NextFunction, Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validateUUID(id: string, label: string): void {
  if (!uuidRegex.test(id)) throw new AppError(`Invalid ${label} format`, 400);
}

async function getProjectMembership(userId: string, projectId: string) {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

// Setup uploads directory
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'text/csv',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`File type ${file.mimetype} is not allowed`, 400) as any);
    }
  },
});

// POST /api/attachments/task/:taskId - Upload file
router.post('/task/:taskId', upload.single('file'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.taskId, 'task ID');

    if (!req.file) throw new AppError('No file uploaded', 400);

    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) throw new AppError('Task not found', 404);

    const membership = await getProjectMembership(req.userId!, task.projectId);
    if (!membership || membership.role === 'VIEWER') {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      throw new AppError('Cannot upload to this task', 403);
    }

    const attachment = await prisma.attachment.create({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        taskId: req.params.taskId,
        uploadedById: req.userId!,
      },
      include: { uploadedBy: { select: { id: true, name: true, avatarUrl: true } } },
    });
    res.status(201).json(attachment);
  } catch (error) { next(error); }
});

// GET /api/attachments/task/:taskId - List attachments
router.get('/task/:taskId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.taskId, 'task ID');
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) throw new AppError('Task not found', 404);

    const membership = await getProjectMembership(req.userId!, task.projectId);
    if (!membership) throw new AppError('Not a member of this project', 403);

    const attachments = await prisma.attachment.findMany({
      where: { taskId: req.params.taskId },
      include: { uploadedBy: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(attachments);
  } catch (error) { next(error); }
});

// GET /api/attachments/:id/download - Download file
router.get('/:id/download', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'attachment ID');
    const attachment = await prisma.attachment.findUnique({
      where: { id: req.params.id },
      include: { task: true },
    });
    if (!attachment) throw new AppError('Attachment not found', 404);

    const membership = await getProjectMembership(req.userId!, attachment.task.projectId);
    if (!membership) throw new AppError('Not a member of this project', 403);

    if (!fs.existsSync(attachment.path)) {
      throw new AppError('File not found on server', 404);
    }

    res.download(attachment.path, attachment.originalName);
  } catch (error) { next(error); }
});

// DELETE /api/attachments/:id - Delete attachment
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    validateUUID(req.params.id, 'attachment ID');
    const attachment = await prisma.attachment.findUnique({
      where: { id: req.params.id },
      include: { task: true },
    });
    if (!attachment) throw new AppError('Attachment not found', 404);

    const membership = await getProjectMembership(req.userId!, attachment.task.projectId);
    const isUploader = attachment.uploadedById === req.userId;
    const isAdminOrOwner = membership && ['OWNER', 'ADMIN'].includes(membership.role);

    if (!isUploader && !isAdminOrOwner) {
      throw new AppError('Cannot delete this attachment', 403);
    }

    // Delete file from disk
    if (fs.existsSync(attachment.path)) {
      fs.unlinkSync(attachment.path);
    }

    await prisma.attachment.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) { next(error); }
});

export default router;
