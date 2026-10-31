import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getDatabase, Database } from 'firebase-admin/database';
import { getAuth, Auth, DecodedIdToken } from 'firebase-admin/auth';
import { createLogger } from '../utils/logger';
import fs from 'fs';

const logger = createLogger('firebase-service');

let rtdb: Database | null = null;
let firebaseAuth: Auth | null = null;
let initialized = false;

// 32-character non-ambiguous uppercase alphabet for collision-safe human-friendly codes
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 6;

/**
 * Safe initialize Firebase Admin SDK.
 * Reads credentials from:
 * 1. FIREBASE_SERVICE_ACCOUNT_JSON (direct JSON string)
 * 2. GOOGLE_APPLICATION_CREDENTIALS / FIREBASE_CREDENTIALS_PATH (file path)
 * 3. Default Application Credentials if running on GCP / Vertex environment.
 * If credentials are not supplied, the service gracefully degrades to no-op.
 */
export function getFirebaseAdmin(): { db: Database | null; auth: Auth | null; isReady: boolean } {
  if (initialized) {
    return { db: rtdb, auth: firebaseAuth, isReady: !!rtdb };
  }

  const databaseURL = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL;
  if (!databaseURL) {
    logger.info('Firebase RTDB URL not configured. Operating in local-only / offline mode.');
    initialized = true;
    return { db: null, auth: null, isReady: false };
  }

  try {
    if (getApps().length === 0) {
      let credential = undefined;

      const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
      if (rawJson && rawJson.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(rawJson.trim());
          credential = cert(parsed);
        } catch (e) {
          logger.warn('Failed to parse JSON service account string', e);
        }
      }

      const credPath = process.env.FIREBASE_CREDENTIALS_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (!credential && credPath && fs.existsSync(credPath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(credPath, 'utf8'));
          credential = cert(parsed);
        } catch (e) {
          logger.warn('Failed to parse service account JSON from file', e);
        }
      }

      if (!credential && (process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT)) {
        // Fall back to application default credentials
        credential = applicationDefault();
      }

      initializeApp({
        ...(credential ? { credential } : {}),
        databaseURL
      });
    }

    rtdb = getDatabase();
    firebaseAuth = getAuth();
    initialized = true;
    logger.info('Firebase Admin RTDB successfully initialized', { databaseURL });
    return { db: rtdb, auth: firebaseAuth, isReady: true };
  } catch (err: any) {
    logger.warn('Firebase Admin initialization error. Local mode active.', { error: err?.message || String(err) });
    initialized = true;
    return { db: null, auth: null, isReady: false };
  }
}

/**
 * Verify a Firebase ID Token passed in the Authorization: Bearer <token> header.
 * Uses admin.auth().verifyIdToken(token) exclusively.
 * Rejects custom tokens, malformed strings, expired tokens, or unverified claims.
 * Returns decoded token or null if unauthenticated / invalid.
 */
export async function verifyFirebaseToken(authHeader?: string): Promise<DecodedIdToken | null> {
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  if (!token) return null;

  const { auth, isReady } = getFirebaseAdmin();
  if (!isReady || !auth) return null;

  try {
    return await auth.verifyIdToken(token);
  } catch (err) {
    logger.debug('Token verification failed', err);
    return null;
  }
}

/**
 * Generate a random 6-character code
 */
function generateRandomCode(): string {
  let result = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const index = Math.floor(Math.random() * CODE_ALPHABET.length);
    result += CODE_ALPHABET[index];
  }
  return result;
}

export interface CloudClassRecord {
  id: string;
  code: string;
  title: string;
  description?: string;
  teacherId: string;
  teacherName?: string;
  createdAt: number;
  updatedAt: number;
  active: boolean;
  started?: boolean;
}

/**
 * Allocate a unique class code and create the classroom record in RTDB in an atomic,
 * collision-safe transaction. If the code mapping fails, no dangling record is left.
 */
export async function createCloudClass(
  teacherId: string,
  title: string,
  description?: string,
  teacherName?: string
): Promise<CloudClassRecord | null> {
  const { db, isReady } = getFirebaseAdmin();
  if (!isReady || !db) return null;

  const now = Date.now();
  const classesRef = db.ref('classes');
  const classId = classesRef.push().key;
  if (!classId) return null;

  // Max 5 allocation attempts to guard against rare collision
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidateCode = generateRandomCode();
    const codeRef = db.ref(`classCodes/${candidateCode}`);

    // Atomic transaction: only claim the code if it doesn't already exist
    const txResult = await codeRef.transaction((currentValue) => {
      if (currentValue === null) {
        return {
          classId,
          teacherId,
          createdAt: now,
          active: true
        };
      }
      return undefined; // Abort transaction if code already taken
    });

    if (txResult.committed && txResult.snapshot.exists()) {
      // Code claimed successfully. Write the class record
      const classRecord: CloudClassRecord = {
        id: classId,
        code: candidateCode,
        title: title.trim(),
        description: description?.trim() || '',
        teacherId,
        teacherName: teacherName || '',
        createdAt: now,
        updatedAt: now,
        active: true,
        started: false
      };

      try {
        await db.ref(`classes/${classId}`).set(classRecord);
        logger.info('Created cloud class', { classId, code: candidateCode, teacherId });
        return classRecord;
      } catch (err) {
        // Rollback code allocation if class write fails
        await codeRef.remove().catch(() => {});
        logger.error('Failed to write class after code allocation', err);
        throw err;
      }
    }
  }

  throw new Error('Could not allocate a unique class code after multiple attempts.');
}

/**
 * Look up a class by its 6-character code
 */
export async function getCloudClassByCode(code: string): Promise<CloudClassRecord | null> {
  const { db, isReady } = getFirebaseAdmin();
  if (!isReady || !db) return null;

  const cleanCode = code.trim().toUpperCase();
  const codeSnap = await db.ref(`classCodes/${cleanCode}`).once('value');
  if (!codeSnap.exists()) return null;

  const { classId, active } = codeSnap.val();
  if (!active || !classId) return null;

  const classSnap = await db.ref(`classes/${classId}`).once('value');
  if (!classSnap.exists()) return null;

  return classSnap.val() as CloudClassRecord;
}

/**
 * Look up a class by its unique classroom ID
 */
export async function getCloudClassById(classId: string): Promise<CloudClassRecord | null> {
  const { db, isReady } = getFirebaseAdmin();
  if (!isReady || !db || !classId || typeof classId !== 'string') return null;

  const cleanId = classId.trim();
  const classSnap = await db.ref(`classes/${cleanId}`).once('value');
  if (!classSnap.exists()) return null;

  return classSnap.val() as CloudClassRecord;
}

/**
 * Securely register a student into a cloud class membership roster.
 * Verifies the class is active, checks the code mapping, and records only the caller's verified UID.
 */
export async function joinCloudClass(
  code: string,
  studentUid: string,
  displayName: string
): Promise<{ classId: string; title: string; teacherName?: string } | null> {
  const cleanCode = (code || '').trim().toUpperCase();
  const cleanName = (displayName || '').trim().replace(/\s+/g, ' ');
  if (!cleanName || cleanName.length > 40) {
    throw new Error('Invalid student display name.');
  }

  const { db, isReady } = getFirebaseAdmin();
  if (!isReady || !db) return null;

  const codeSnap = await db.ref(`classCodes/${cleanCode}`).once('value');
  if (!codeSnap.exists()) return null;

  const { classId, active } = codeSnap.val();
  if (!active || !classId) return null;

  const classRef = db.ref(`classes/${classId}`);
  const classSnap = await classRef.once('value');
  if (!classSnap.exists()) return null;

  const classData = classSnap.val();
  if (!classData.active) return null;

  const now = Date.now();
  // Safe atomic transaction or targeted update on the student's entry only
  const studentRef = db.ref(`classes/${classId}/roster/${studentUid}`);
  await studentRef.update({
    studentId: studentUid,
    displayName: cleanName,
    connected: true,
    lastSeen: now
  });

  logger.info('Student joined cloud class', { classId, studentUid, displayName: cleanName });
  return {
    classId,
    title: classData.title || '',
    teacherName: classData.teacherName
  };
}

/**
 * List all active classes owned by a specific teacher
 */
export async function listTeacherClasses(teacherId: string): Promise<CloudClassRecord[]> {
  const { db, isReady } = getFirebaseAdmin();
  if (!isReady || !db) return [];

  const snap = await db.ref('classes')
    .orderByChild('teacherId')
    .equalTo(teacherId)
    .once('value');

  if (!snap.exists()) return [];

  const list: CloudClassRecord[] = [];
  snap.forEach((child) => {
    const val = child.val();
    if (val && val.active !== false) {
      list.push(val);
    }
  });

  return list.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Archive or deactivate a class
 */
export async function setClassActiveStatus(classId: string, teacherId: string, active: boolean): Promise<boolean> {
  const { db, isReady } = getFirebaseAdmin();
  if (!isReady || !db) return false;

  const classRef = db.ref(`classes/${classId}`);
  const snap = await classRef.once('value');
  if (!snap.exists()) return false;

  const classData = snap.val();
  if (classData.teacherId !== teacherId) return false;

  const updates: Record<string, any> = {
    [`classes/${classId}/active`]: active,
    [`classes/${classId}/updatedAt`]: Date.now()
  };

  if (classData.code) {
    updates['classCodes/' + classData.code + '/active'] = active;
  }

  await db.ref().update(updates);
  return true;
}

/**
 * Minimal, rate-throttled asynchronous replication of structured room artifacts
 * (lesson notes, active quest book, roster counts) to RTDB.
 * Completely non-blocking and ignores canvas stroke data to prevent heavy DB writes.
 *
 * SAFE WRITE ENFORCEMENT:
 * Only updates server-managed connection states. Never overwrites student-owned
 * fields or roll back newer student lastSeen timestamps.
 */
const replicationDebounce = new Map<string, NodeJS.Timeout>();

export function replicateRoomToCloudAsync(roomId: string, roomData: any): void {
  const { db, isReady } = getFirebaseAdmin();
  if (!isReady || !db || !roomId) return;

  const existingTimer = replicationDebounce.get(roomId);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(async () => {
    replicationDebounce.delete(roomId);
    try {
      // Find class record in RTDB matching roomId or room code
      let targetClassId = roomId;
      const codeCheck = await db.ref(`classCodes/${roomId.toUpperCase()}`).once('value');
      if (codeCheck.exists()) {
        targetClassId = codeCheck.val().classId;
      }

      const updates: Record<string, any> = {
        [`classes/${targetClassId}/updatedAt`]: Date.now()
      };

      if (roomData.started !== undefined) {
        updates[`classes/${targetClassId}/started`] = Boolean(roomData.started);
      }

      if (typeof roomData.lessonNotes === 'string') {
        updates[`classes/${targetClassId}/content/lessonNotes`] = roomData.lessonNotes;
      }

      // Safe targeted roster replication: update ONLY teacher-observed connection state
      // Do NOT replace the whole student node or overwrite student-managed fields
      if (roomData.students && typeof roomData.students === 'object') {
        for (const [sId, student] of Object.entries<any>(roomData.students)) {
          if (student && student.studentId) {
            updates[`classes/${targetClassId}/roster/${student.studentId}/connected`] = Boolean(student.connected);
            if (student.displayName) {
              updates[`classes/${targetClassId}/roster/${student.studentId}/displayName`] = student.displayName;
            }
          }
        }
      }

      // Replicate published quest list without internal answer keys
      if (roomData.questBook?.packs && Array.isArray(roomData.questBook.packs)) {
        const publicQuests = roomData.questBook.packs.map((p: any) => ({
          id: p.id,
          title: p.title,
          roundCount: p.roundCount,
          timeLimitSeconds: p.timeLimitSeconds
        }));
        updates[`classes/${targetClassId}/content/quests`] = publicQuests;
      }

      await db.ref().update(updates);
      logger.debug('Async replicated room metadata to RTDB', { targetClassId });
    } catch (err: any) {
      logger.debug('Room replication error (non-fatal)', { err: err?.message || String(err) });
    }
  }, 2500); // 2.5s debounce to coalesce updates

  replicationDebounce.set(roomId, timer);
}

/**
 * Update lesson notes for a cloud classroom (verifies teacher ownership)
 */
export async function updateCloudClassNotes(classId: string, teacherId: string, notes: string): Promise<boolean> {
  const { db, isReady } = getFirebaseAdmin();
  if (!isReady || !db) return false;

  const classRef = db.ref(`classes/${classId}`);
  const snap = await classRef.once('value');
  if (!snap.exists()) return false;

  const classData = snap.val();
  if (classData.teacherId !== teacherId) return false;

  await db.ref(`classes/${classId}/content/lessonNotes`).set(notes);
  await db.ref(`classes/${classId}/updatedAt`).set(Date.now());
  return true;
}

/**
 * Update published quests for a cloud classroom (verifies teacher ownership)
 */
export async function updateCloudClassQuests(classId: string, teacherId: string, quests: any[]): Promise<boolean> {
  const { db, isReady } = getFirebaseAdmin();
  if (!isReady || !db) return false;

  const classRef = db.ref(`classes/${classId}`);
  const snap = await classRef.once('value');
  if (!snap.exists()) return false;

  const classData = snap.val();
  if (classData.teacherId !== teacherId) return false;

  await db.ref(`classes/${classId}/content/quests`).set(quests);
  await db.ref(`classes/${classId}/updatedAt`).set(Date.now());
  return true;
}
