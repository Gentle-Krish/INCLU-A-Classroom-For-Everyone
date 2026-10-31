import 'dotenv/config';
import {
  getFirebaseAdmin,
  createCloudClass,
  getCloudClassByCode,
  getCloudClassById,
  joinCloudClass,
  updateCloudClassNotes,
  updateCloudClassQuests,
  listTeacherClasses,
  setClassActiveStatus
} from '../server/firebaseService';

async function verifyRealRtdb() {
  console.log('--- Phase 6: Real Firebase RTDB Verification ---');
  
  const { db, isReady } = getFirebaseAdmin();
  if (!isReady || !db) {
    throw new Error('Firebase Admin RTDB is not ready! Check FIREBASE_DATABASE_URL and credentials.');
  }
  console.log('Step 1: Firebase Admin initialized successfully. Testing DB connection...');

  // Ping .info/connected
  const connectedSnap = await db.ref('.info/connected').once('value');
  console.log('Step 2: Database connectivity check passed (connected state:', connectedSnap.val(), ')');

  const testTeacherId = `qa_teacher_${Date.now()}`;
  const testTitle = `QA Test Classroom ${Date.now()}`;

  // Step 3: Create class
  console.log('Step 3: Creating test cloud classroom via createCloudClass...');
  const created = await createCloudClass(testTeacherId, testTitle, 'Automated verification test', 'QA Tester');
  if (!created || !created.id || !created.code) {
    throw new Error('Failed to create test classroom');
  }
  console.log('  -> Class created: ID =', created.id, 'Code =', created.code);

  // Step 4: Read by Code
  console.log('Step 4: Reading class by 6-character code:', created.code);
  const byCode = await getCloudClassByCode(created.code);
  if (!byCode || byCode.id !== created.id || byCode.title !== testTitle) {
    throw new Error(`getCloudClassByCode verification failed for code ${created.code}`);
  }
  console.log('  -> Read by code confirmed matching ID:', byCode.id);

  // Step 5: Read by ID
  console.log('Step 5: Reading class by unique ID:', created.id);
  const byId = await getCloudClassById(created.id);
  if (!byId || byId.code !== created.code) {
    throw new Error(`getCloudClassById verification failed for ID ${created.id}`);
  }
  console.log('  -> Read by ID confirmed matching code:', byId.code);

  // Step 6: Verify direct RTDB snapshot
  console.log('Step 6: Directly querying RTDB ref at classes/' + created.id);
  const rawSnap = await db.ref(`classes/${created.id}`).once('value');
  if (!rawSnap.exists() || rawSnap.val().title !== testTitle) {
    throw new Error('Direct RTDB check failed: record not found in database');
  }
  console.log('  -> Record exists directly in Realtime Database:', rawSnap.val().title);

  // Step 7: Update notes
  console.log('Step 7: Updating lesson notes in RTDB...');
  const testNotes = `Lesson notes verified at ${new Date().toISOString()}`;
  const notesOk = await updateCloudClassNotes(created.id, testTeacherId, testNotes);
  if (!notesOk) throw new Error('updateCloudClassNotes returned false');
  
  const notesSnap = await db.ref(`classes/${created.id}/content/lessonNotes`).once('value');
  if (notesSnap.val() !== testNotes) {
    throw new Error('Notes in RTDB do not match updated notes');
  }
  console.log('  -> Notes updated and verified in RTDB:', notesSnap.val());

  // Step 8: Update quests
  console.log('Step 8: Updating quests in RTDB...');
  const testQuests = [{ id: 'q_test_1', title: 'Solar System Quest', roundCount: 3, timeLimitSeconds: 60 }];
  const questsOk = await updateCloudClassQuests(created.id, testTeacherId, testQuests);
  if (!questsOk) throw new Error('updateCloudClassQuests returned false');

  const questsSnap = await db.ref(`classes/${created.id}/content/quests`).once('value');
  if (!Array.isArray(questsSnap.val()) || questsSnap.val().length !== 1) {
    throw new Error('Quests in RTDB do not match updated quests');
  }
  console.log('  -> Quests updated and verified in RTDB:', questsSnap.val()[0].title);

  // Step 9: Join classroom as student
  console.log('Step 9: Testing student join to classroom...');
  const testStudentId = `qa_student_${Date.now()}`;
  const joinResult = await joinCloudClass(created.code, testStudentId, 'Alice Student');
  if (!joinResult || joinResult.classId !== created.id) {
    throw new Error('joinCloudClass failed');
  }

  const rosterSnap = await db.ref(`classes/${created.id}/roster/${testStudentId}`).once('value');
  if (!rosterSnap.exists() || rosterSnap.val().displayName !== 'Alice Student') {
    throw new Error('Student roster not found in RTDB');
  }
  console.log('  -> Student join confirmed in RTDB roster:', rosterSnap.val());

  // Step 10: List teacher classes
  console.log('Step 10: Listing classes for teacher:', testTeacherId);
  const teacherClasses = await listTeacherClasses(testTeacherId);
  if (!teacherClasses.some(c => c.id === created.id)) {
    throw new Error('Classroom not found in listTeacherClasses');
  }
  console.log('  -> listTeacherClasses returned', teacherClasses.length, 'class(es)');

  // Step 11: Archive class
  console.log('Step 11: Archiving classroom...');
  const archiveOk = await setClassActiveStatus(created.id, testTeacherId, false);
  if (!archiveOk) throw new Error('setClassActiveStatus returned false');

  const archivedSnap = await db.ref(`classes/${created.id}/active`).once('value');
  const codeActiveSnap = await db.ref(`classCodes/${created.code}/active`).once('value');
  if (archivedSnap.val() !== false || codeActiveSnap.val() !== false) {
    throw new Error('Class was not deactivated in RTDB');
  }
  console.log('  -> Class and code successfully marked active = false in RTDB');

  // Step 12: Clean up test records
  console.log('Step 12: Cleaning up temporary test records...');
  await db.ref(`classes/${created.id}`).remove();
  await db.ref(`classCodes/${created.code}`).remove();
  console.log('  -> Temporary test records removed cleanly from RTDB.');

  console.log('\n>>> ALL 12 REAL FIREBASE RTDB PERSISTENCE CHECKS PASSED SUCCESSFULLY! <<<');
  process.exit(0);
}

verifyRealRtdb().catch(err => {
  console.error('\nFAIL: Real RTDB verification error:', err);
  process.exit(1);
});

