import express, { Router, Request, Response } from 'express';
import {
  createCloudClass,
  getCloudClassByCode,
  getCloudClassById,
  joinCloudClass,
  listTeacherClasses,
  setClassActiveStatus,
  updateCloudClassNotes,
  updateCloudClassQuests,
  verifyFirebaseToken,
  getFirebaseAdmin
} from './firebaseService';
import { createLogger } from '../utils/logger';

const logger = createLogger('class-router');
export const classRouter = Router();
classRouter.use(express.json());

// Middleware: Verify teacher identity via Firebase ID token + server-managed teacher claim
async function requireTeacherAuth(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  const decoded = await verifyFirebaseToken(authHeader);

  if (!decoded || !decoded.uid) {
    return res.status(401).json({
      error: 'Unauthorized: A valid Firebase ID token is required.',
      code: 'auth_required'
    });
  }

  // Enforce the server-managed `teacher` custom claim set via Admin SDK only.
  // Clients can never self-assign this claim — it must be granted by scripts/assignTeacher.ts.
  if (decoded.teacher !== true) {
    return res.status(403).json({
      error: 'Forbidden: Teacher privileges required. Contact your administrator to be granted access.',
      code: 'teacher_required'
    });
  }

  (req as any).user = decoded;
  next();
}

// Middleware: Verify any authenticated user (e.g. anonymous student or teacher)
async function requireUserAuth(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  const decoded = await verifyFirebaseToken(authHeader);

  if (!decoded || !decoded.uid) {
    return res.status(401).json({
      error: 'Unauthorized: A valid Firebase authentication token is required.',
      code: 'auth_required'
    });
  }

  (req as any).user = decoded;
  next();
}

/**
 * GET /api/classes/status
 * Returns whether Firebase cloud database is configured and ready
 */
classRouter.get('/status', (_req, res) => {
  const { isReady } = getFirebaseAdmin();
  res.json({
    cloudEnabled: isReady,
    provider: isReady ? 'firebase_rtdb' : 'local_only'
  });
});

/**
 * POST /api/classes
 * Protected: Teacher creates a new classroom with a unique 6-character code
 */
classRouter.post('/', requireTeacherAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { title, description } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'A valid class title is required.' });
    }

    const teacherName = user.name || user.email || 'Teacher';
    const classRecord = await createCloudClass(user.uid, title, description, teacherName);

    if (!classRecord) {
      return res.status(503).json({
        error: 'Cloud classroom database is not available on this server.',
        code: 'cloud_unavailable'
      });
    }

    res.status(201).json({
      success: true,
      classRecord
    });
  } catch (err: any) {
    logger.error('Failed to create cloud class', err);
    res.status(500).json({ error: err.message || 'Failed to create cloud class.' });
  }
});

/**
 * GET /api/classes/by-code/:code
 * Public (with validation):
 * Look up classroom metadata and active state by 6-character code
 */
classRouter.get('/by-code/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    if (!code || typeof code !== 'string' || code.trim().length !== 6) {
      return res.status(400).json({ error: 'Class code must be exactly 6 characters.' });
    }

    const classRecord = await getCloudClassByCode(code);
    if (!classRecord) {
      return res.status(404).json({
        error: 'Classroom not found or code is no longer active.',
        code: 'class_not_found'
      });
    }

    // Return safe public summary for joining
    res.json({
      success: true,
      classSummary: {
        id: classRecord.id,
        code: classRecord.code,
        title: classRecord.title,
        description: classRecord.description,
        teacherName: classRecord.teacherName,
        active: classRecord.active,
        started: classRecord.started
      }
    });
  } catch (err: any) {
    logger.error('Failed to resolve class code', err);
    res.status(500).json({ error: 'Failed to look up class code.' });
  }
});

/**
 * POST /api/classes/join
 * Authenticated: Student joins an active classroom using a verified 6-character code
 * Ensures caller UID from verified token is registered in the cloud roster.
 */
classRouter.post('/join', requireUserAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { code, displayName } = req.body;

    if (!code || typeof code !== 'string' || code.trim().length !== 6) {
      return res.status(400).json({ error: 'Valid 6-character class code is required.' });
    }

    const name = typeof displayName === 'string' && displayName.trim() ? displayName.trim() : (user.name || 'Student');
    const result = await joinCloudClass(code, user.uid, name);

    if (!result) {
      return res.status(404).json({
        error: 'Class not found or inactive.',
        code: 'join_failed'
      });
    }

    res.json({
      success: true,
      membership: {
        classId: result.classId,
        title: result.title,
        teacherName: result.teacherName,
        studentId: user.uid,
        displayName: name
      }
    });
  } catch (err: any) {
    logger.error('Failed to join cloud class', err);
    res.status(500).json({ error: err.message || 'Failed to join cloud class.' });
  }
});

/**
 * GET /api/classes/my-classes
 * Protected: List all active classes belonging to the authenticated teacher
 */
classRouter.get('/my-classes', requireTeacherAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const classes = await listTeacherClasses(user.uid);
    res.json({
      success: true,
      classes
    });
  } catch (err: any) {
    logger.error('Failed to list teacher classes', err);
    res.status(500).json({ error: 'Failed to retrieve classes.' });
  }
});

/**
 * GET /api/classes/:id
 * Retrieve a classroom by its unique ID
 */
classRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id || typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({ error: 'Valid classroom ID is required.' });
    }

    const classRecord = await getCloudClassById(id);
    if (!classRecord) {
      return res.status(404).json({
        error: 'Classroom not found.',
        code: 'class_not_found'
      });
    }

    res.json({
      success: true,
      classRecord
    });
  } catch (err: any) {
    logger.error('Failed to get class by id', err);
    res.status(500).json({ error: 'Failed to retrieve classroom.' });
  }
});

/**
 * PATCH /api/classes/:id/archive
 * Protected: Teacher archives/deactivates a classroom
 */
classRouter.patch('/:id/archive', requireTeacherAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const ok = await setClassActiveStatus(id, user.uid, false);
    if (!ok) {
      return res.status(403).json({ error: 'Forbidden: You do not own this class or it does not exist.' });
    }

    res.json({ success: true, message: 'Classroom archived.' });
  } catch (err: any) {
    logger.error('Failed to archive class', err);
    res.status(500).json({ error: 'Failed to archive class.' });
  }
});

/**
 * PUT /api/classes/:id/notes
 * Protected: Teacher updates lesson notes for a cloud classroom
 */
classRouter.put('/:id/notes', requireTeacherAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { notes } = req.body;

    if (typeof notes !== 'string') {
      return res.status(400).json({ error: 'Valid notes text string is required.' });
    }

    const ok = await updateCloudClassNotes(id, user.uid, notes);
    if (!ok) {
      return res.status(403).json({ error: 'Forbidden: You do not own this class or it does not exist.' });
    }

    res.json({ success: true, message: 'Lesson notes updated in cloud.' });
  } catch (err: any) {
    logger.error('Failed to update class notes', err);
    res.status(500).json({ error: 'Failed to update lesson notes.' });
  }
});

/**
 * PUT /api/classes/:id/quests
 * Protected: Teacher publishes or updates quests for a cloud classroom
 */
classRouter.put('/:id/quests', requireTeacherAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { quests } = req.body;

    if (!Array.isArray(quests)) {
      return res.status(400).json({ error: 'Quests must be an array.' });
    }

    const ok = await updateCloudClassQuests(id, user.uid, quests);
    if (!ok) {
      return res.status(403).json({ error: 'Forbidden: You do not own this class or it does not exist.' });
    }

    res.json({ success: true, message: 'Quests updated in cloud.' });
  } catch (err: any) {
    logger.error('Failed to update quests', err);
    res.status(500).json({ error: 'Failed to update quests.' });
  }
});
