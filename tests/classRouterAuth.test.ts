/**
 * tests/classRouterAuth.test.ts
 *
 * Authorization enforcement tests for the classRouter HTTP middleware.
 *
 * `verifyFirebaseToken` is mocked so all tests run fully offline.
 * Every test exercises a real HTTP request through `express` + `supertest`
 * and asserts the correct HTTP status code and JSON error code.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ---------------------------------------------------------------------------
// Mock firebaseService BEFORE importing classRouter.
// The real RTDB helpers return null/false in offline mode — that's fine.
// We only stub verifyFirebaseToken to control what "verified" tokens look like.
// ---------------------------------------------------------------------------
vi.mock('../server/firebaseService', async (importOriginal) => {
  const original = await importOriginal<typeof import('../server/firebaseService')>();
  return {
    ...original,
    verifyFirebaseToken: vi.fn().mockResolvedValue(null),
    createCloudClass: vi.fn().mockResolvedValue(null),
    getCloudClassByCode: vi.fn().mockResolvedValue(null),
    joinCloudClass: vi.fn().mockResolvedValue(null),
    listTeacherClasses: vi.fn().mockResolvedValue([]),
    setClassActiveStatus: vi.fn().mockResolvedValue(false),
    updateCloudClassNotes: vi.fn().mockResolvedValue(false),
    updateCloudClassQuests: vi.fn().mockResolvedValue(false),
    replicateRoomToCloudAsync: vi.fn().mockResolvedValue(undefined),
    getFirebaseAdmin: vi.fn().mockReturnValue({ db: null, auth: null, isReady: false }),
  };
});

// Import AFTER vi.mock so the module sees the mocked exports
const { verifyFirebaseToken: mockVerify } = await import('../server/firebaseService');
const { classRouter } = await import('../server/classRouter');

function buildApp() {
  const app = express();
  app.use('/api/classes', classRouter);
  return app;
}

describe('requireTeacherAuth middleware — authorization enforcement', () => {
  beforeEach(() => {
    vi.mocked(mockVerify).mockReset();
    // Default: token verification fails (no token / invalid token)
    vi.mocked(mockVerify).mockResolvedValue(null);
  });

  // ── 401 cases ────────────────────────────────────────────────────────────

  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(buildApp())
      .post('/api/classes')
      .send({ title: 'Test Class' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('auth_required');
  });

  it('returns 401 when token verification fails (invalid / expired token)', async () => {
    const res = await request(buildApp())
      .post('/api/classes')
      .set('Authorization', 'Bearer bad.token.here')
      .send({ title: 'Test Class' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('auth_required');
  });

  // ── 403 cases — authenticated but not a teacher ───────────────────────────

  it('returns 403 when token is valid but has no teacher claim (anonymous / student user)', async () => {
    vi.mocked(mockVerify).mockResolvedValueOnce({ uid: 'student_uid_abc' } as any);
    const res = await request(buildApp())
      .post('/api/classes')
      .set('Authorization', 'Bearer valid_student_token')
      .send({ title: 'Sneaky Student Class' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('teacher_required');
  });

  it('returns 403 when token has teacher: false', async () => {
    vi.mocked(mockVerify).mockResolvedValueOnce({ uid: 'user_uid_xyz', teacher: false } as any);
    const res = await request(buildApp())
      .post('/api/classes')
      .set('Authorization', 'Bearer token_teacher_false')
      .send({ title: 'Another Sneaky Class' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('teacher_required');
  });

  // ── Auth passes — response determined by offline RTDB ────────────────────

  it('allows request and proceeds past auth when token has teacher: true', async () => {
    vi.mocked(mockVerify).mockResolvedValueOnce({
      uid: 'teacher_uid_001',
      email: 'teacher@school.edu',
      teacher: true,
    } as any);
    const res = await request(buildApp())
      .post('/api/classes')
      .set('Authorization', 'Bearer valid_teacher_id_token')
      .send({ title: 'Real Teacher Class' });
    // Auth passed — 503 comes from offline RTDB (createCloudClass returns null), not auth failure
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('cloud_unavailable');
  });

  // ── Student cannot access any teacher-only endpoints ─────────────────────

  it('students cannot access teacher-only PATCH /:id/archive', async () => {
    vi.mocked(mockVerify).mockResolvedValueOnce({ uid: 'student_uid_abc' } as any);
    const res = await request(buildApp())
      .patch('/api/classes/some-class-id/archive')
      .set('Authorization', 'Bearer valid_student_token');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('teacher_required');
  });

  it('students cannot access teacher-only PUT /:id/notes', async () => {
    vi.mocked(mockVerify).mockResolvedValueOnce({ uid: 'student_uid_abc' } as any);
    const res = await request(buildApp())
      .put('/api/classes/some-class-id/notes')
      .set('Authorization', 'Bearer valid_student_token')
      .send({ notes: 'Student trying to overwrite notes' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('teacher_required');
  });

  it('students cannot access teacher-only PUT /:id/quests', async () => {
    vi.mocked(mockVerify).mockResolvedValueOnce({ uid: 'student_uid_abc' } as any);
    const res = await request(buildApp())
      .put('/api/classes/some-class-id/quests')
      .set('Authorization', 'Bearer valid_student_token')
      .send({ quests: [] });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('teacher_required');
  });

  it('students cannot list teacher classes via GET /my-classes', async () => {
    vi.mocked(mockVerify).mockResolvedValueOnce({ uid: 'student_uid_abc' } as any);
    const res = await request(buildApp())
      .get('/api/classes/my-classes')
      .set('Authorization', 'Bearer valid_student_token');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('teacher_required');
  });

  // ── Public & lookup routes ───────────────────────────────────────────────

  it('GET /status returns cloudEnabled boolean', async () => {
    const res = await request(buildApp()).get('/api/classes/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('cloudEnabled');
    expect(res.body).toHaveProperty('provider');
  });

  it('GET /by-code rejects invalid code lengths', async () => {
    const res = await request(buildApp()).get('/api/classes/by-code/123');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('6 characters');
  });

  it('GET /:id returns 404 when class does not exist', async () => {
    const res = await request(buildApp()).get('/api/classes/nonexistent-id');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('class_not_found');
  });

  it('POST /join requires authentication', async () => {
    const res = await request(buildApp())
      .post('/api/classes/join')
      .send({ code: 'ABCDEF', displayName: 'Student' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('auth_required');
  });
});

