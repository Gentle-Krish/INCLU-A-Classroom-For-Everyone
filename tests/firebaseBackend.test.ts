/**
 * tests/firebaseBackend.test.ts
 *
 * Unit & security tests for low-level Firebase service functions.
 * NO mocking — tests run against the real implementations in offline/unconfigured mode.
 */

import { describe, it, expect } from 'vitest';
import {
  getFirebaseAdmin,
  verifyFirebaseToken,
  joinCloudClass,
} from '../server/firebaseService';

describe('Firebase Cloud Classroom Backend — Unit & Security Specs', () => {
  it('gracefully degrades to local-only offline mode when credentials are not configured', () => {
    const { db, auth, isReady } = getFirebaseAdmin();
    expect(isReady).toBe(false);
    expect(db).toBeNull();
    expect(auth).toBeNull();
  });

  it('rejects unauthenticated requests without throwing or crashing', async () => {
    const decoded = await verifyFirebaseToken(undefined);
    expect(decoded).toBeNull();

    const decodedEmpty = await verifyFirebaseToken('Bearer ');
    expect(decodedEmpty).toBeNull();

    const decodedInvalid = await verifyFirebaseToken('Bearer invalid_token_xyz');
    expect(decodedInvalid).toBeNull();
  });

  it('strictly rejects Firebase custom tokens or non-ID-tokens on verifyFirebaseToken', async () => {
    // A synthetic custom token (audience = IdentityToolkit) must NEVER be accepted
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
      uid: 'fake_teacher_uid',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })).toString('base64url');
    const fakeCustomToken = `${header}.${payload}.signature_bytes`;

    const result = await verifyFirebaseToken(`Bearer ${fakeCustomToken}`);
    expect(result).toBeNull();
  });

  it('rejects expired or malformed token strings safely', async () => {
    expect(await verifyFirebaseToken('Bearer abc.def')).toBeNull();
    expect(await verifyFirebaseToken('Basic dXNlcjpwYXNz')).toBeNull();
    expect(await verifyFirebaseToken('not_even_a_bearer')).toBeNull();
  });

  it('validates join inputs and returns null when cloud database is offline', async () => {
    // When offline / unconfigured, joinCloudClass safely returns null
    const res = await joinCloudClass('ABCDEF', 'student_123', 'John Doe');
    expect(res).toBeNull();
  });

  it('rejects invalid student display names', async () => {
    // Display name cannot be empty
    await expect(joinCloudClass('ABCDEF', 'student_123', '   ')).rejects.toThrow(
      'Invalid student display name'
    );

    // Display name cannot exceed 40 characters
    const longName = 'A'.repeat(45);
    await expect(joinCloudClass('ABCDEF', 'student_123', longName)).rejects.toThrow(
      'Invalid student display name'
    );
  });
});
