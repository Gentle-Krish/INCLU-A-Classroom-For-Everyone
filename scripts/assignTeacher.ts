/**
 * scripts/assignTeacher.ts
 *
 * Admin-only script: assigns the `teacher: true` custom claim to a Firebase user.
 *
 * This is the SOLE mechanism to grant teacher privileges. It must NEVER be exposed
 * as a REST endpoint. Only a server administrator with access to the service-account
 * credentials may run this script.
 *
 * Usage:
 *   npx tsx scripts/assignTeacher.ts --email teacher@school.edu
 *   npx tsx scripts/assignTeacher.ts --uid  <firebase-uid>
 *
 * Prerequisites:
 *   GOOGLE_APPLICATION_CREDENTIALS must point to the service-account JSON file.
 *   FIREBASE_DATABASE_URL must be set (optional but recommended).
 */

import 'dotenv/config';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// ---------------------------------------------------------------------------
// Initialise Firebase Admin SDK (modular API — same style as firebaseService.ts)
// ---------------------------------------------------------------------------
function initAdmin(): void {
  if (getApps().length > 0) return;

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) {
    console.error('ERROR: GOOGLE_APPLICATION_CREDENTIALS is not set.');
    process.exit(1);
  }

  try {
    initializeApp({
      credential: applicationDefault(),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  } catch (err: any) {
    console.error('ERROR: Failed to initialise Firebase Admin SDK:', err.message);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Parse CLI arguments — accept either --email or --uid
// ---------------------------------------------------------------------------
function parseArgs(): { email?: string; uid?: string } {
  const args = process.argv.slice(2);
  const result: { email?: string; uid?: string } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      result.email = args[++i].trim();
    } else if (args[i] === '--uid' && args[i + 1]) {
      result.uid = args[++i].trim();
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Validate the resolved email address (basic sanity check)
// ---------------------------------------------------------------------------
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const { email, uid } = parseArgs();

  if (!email && !uid) {
    console.error('Usage: npx tsx scripts/assignTeacher.ts --email <email>');
    console.error('       npx tsx scripts/assignTeacher.ts --uid   <firebase-uid>');
    process.exit(1);
  }

  if (email && !isValidEmail(email)) {
    console.error(`ERROR: "${email}" does not look like a valid email address.`);
    process.exit(1);
  }

  initAdmin();
  const auth = getAuth();

  let userRecord: Awaited<ReturnType<typeof auth.getUser>>;

  try {
    if (uid) {
      userRecord = await auth.getUser(uid);
    } else {
      userRecord = await auth.getUserByEmail(email!);
    }
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      console.error(
        `ERROR: No Firebase user found for ${uid ? 'UID' : 'email'}: ${uid ?? email}`
      );
    } else {
      console.error('ERROR: Failed to look up user:', err.message);
    }
    process.exit(1);
  }

  // Merge with any existing custom claims — never wipe unrelated claims
  const existingClaims: Record<string, unknown> =
    (userRecord.customClaims as Record<string, unknown>) ?? {};

  if (existingClaims.teacher === true) {
    console.log(
      `INFO: User ${userRecord.uid} (${userRecord.email ?? 'no email'}) already has teacher privileges. No change made.`
    );
    process.exit(0);
  }

  const updatedClaims: Record<string, unknown> = {
    ...existingClaims,
    teacher: true,
    role: 'teacher',
  };

  try {
    await auth.setCustomUserClaims(userRecord.uid, updatedClaims);
  } catch (err: any) {
    console.error('ERROR: Failed to set custom claims:', err.message);
    process.exit(1);
  }

  // Confirm — no credential material is printed
  console.log('SUCCESS: Teacher role assigned.');
  console.log(`  UID  : ${userRecord.uid}`);
  console.log(`  Email: ${userRecord.email ?? '(none)'}`);
  console.log('');
  console.log('NOTE: The user must sign out and sign back in for the new claim to take effect.');
}

main().catch((err) => {
  console.error('Unexpected error:', err.message ?? err);
  process.exit(1);
});
