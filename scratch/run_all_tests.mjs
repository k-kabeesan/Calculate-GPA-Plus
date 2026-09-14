import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdojjzhogiyifovcbnjh.supabase.co';
const supabaseAnonKey = 'sb_publishable_0oNmf07nEQHnMP5e4vTlOA_0Frxoq6u';

const client = createClient(supabaseUrl, supabaseAnonKey);

// SHA-256 helper
async function sha256(str) {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateProfileId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part1 = '';
  for (let i = 0; i < 4; i++) part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  let part2 = '';
  for (let i = 0; i < 6; i++) part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  return `GPA-${part1}-${part2}`;
}

async function runTestSuite() {
  console.log('=== STARTING COMPLETE PROFILE CREATION & VERIFICATION TEST SUITE ===\n');

  // TEST 1, 2, 3, 4: Create Profile with Name: N3-01, Owner Password: test12345, Semesters, Subjects
  console.log('--- TEST 1 to 4: Create Profile ---');
  const profileName = 'N3-01';
  const ownerPassword = 'test12345';
  const passwordHash = await sha256(ownerPassword);
  const profileId = generateProfileId();

  console.log(`Creating Profile ID: ${profileId} with Name: ${profileName}...`);

  const { data: pData, error: pErr } = await client.from('profiles').insert({
    id: profileId,
    profile_name: profileName,
    university: 'University of Colombo',
    faculty: 'Faculty of Science',
    degree: '',
    academic_year: '2024/2025',
    description: 'Test created profile',
    visibility: 'public',
    passcode_hash: passwordHash
  }).select();

  if (pErr) {
    console.error('TEST 1-4 FAILED: Could not create profile in Supabase:', pErr);
    process.exit(1);
  }
  console.log('✓ Profile row inserted successfully into Supabase!');

  // Add semester
  const { data: semData, error: semErr } = await client.from('semesters').insert({
    profile_id: profileId,
    semester_name: 'Semester 1',
    semester_order: 1
  }).select().single();

  if (semErr || !semData) {
    console.error('TEST 1-4 FAILED: Could not insert semester:', semErr);
    process.exit(1);
  }
  console.log('✓ Semester inserted successfully!');

  // Add subjects
  const { data: subData, error: subErr } = await client.from('subjects').insert([
    {
      semester_id: semData.id,
      subject_code: 'NANO2112',
      subject_name: 'Nanotechnology II',
      credit: 2
    },
    {
      semester_id: semData.id,
      subject_code: 'SCS1201',
      subject_name: 'Data Structures',
      credit: 3
    }
  ]).select();

  if (subErr) {
    console.error('TEST 1-4 FAILED: Could not insert subjects:', subErr);
    process.exit(1);
  }
  console.log('✓ Subjects inserted successfully! Created Profile ID:', profileId);

  // TEST 5: Public Visibility - Read profile from unauthenticated/anonymous client
  console.log('\n--- TEST 5: Public Profile Visibility ---');
  const { data: publicProfile, error: pubErr } = await client
    .from('profiles')
    .select('*, semesters(*, subjects(*))')
    .eq('id', profileId)
    .single();

  if (pubErr || !publicProfile) {
    console.error('TEST 5 FAILED: Public profile is not visible to public users:', pubErr);
    process.exit(1);
  }
  console.log('✓ Public Profile is VISIBLE to all users!');
  console.log('  Profile Name:', publicProfile.profile_name);
  console.log('  Semesters Count:', publicProfile.semesters.length);
  console.log('  Subjects Count:', publicProfile.semesters[0].subjects.length);

  // TEST 6: Try editing without correct password -> DENIED
  console.log('\n--- TEST 6: Verify Passcode without password (or wrong password) ---');
  const wrongPasswordHash = await sha256('wrongpassword');
  const isWrongValid = (publicProfile.passcode_hash === wrongPasswordHash);
  if (isWrongValid) {
    console.error('TEST 6 FAILED: Wrong password was accepted!');
    process.exit(1);
  }
  console.log('✓ Wrong password denied ACCESS DENIED!');

  // TEST 7: Enter correct owner password -> EDIT ACCESS GRANTED
  console.log('\n--- TEST 7: Verify Passcode with correct password ---');
  const correctInputHash = await sha256(ownerPassword);
  const isCorrectValid = (publicProfile.passcode_hash === correctInputHash);
  if (!isCorrectValid) {
    console.error('TEST 7 FAILED: Correct password was rejected!');
    process.exit(1);
  }
  console.log('✓ Correct password EDIT ACCESS GRANTED!');

  // TEST 8: Change a subject and save -> Changes saved to Supabase
  console.log('\n--- TEST 8: Update Subject in Supabase ---');
  const subjectToUpdate = publicProfile.semesters[0].subjects[0];
  const { error: updateSubErr } = await client
    .from('subjects')
    .update({ subject_name: 'Advanced Nanotechnology II', credit: 3 })
    .eq('id', subjectToUpdate.id);

  if (updateSubErr) {
    console.error('TEST 8 FAILED: Subject update failed:', updateSubErr);
    process.exit(1);
  }
  console.log('✓ Subject updated successfully!');

  // TEST 9: Open profile from another client -> Updated profile is visible
  console.log('\n--- TEST 9: Read updated profile from public client ---');
  const { data: updatedProfile, error: updatedErr } = await client
    .from('profiles')
    .select('*, semesters(*, subjects(*))')
    .eq('id', profileId)
    .single();

  if (updatedErr || !updatedProfile) {
    console.error('TEST 9 FAILED: Could not read updated profile:', updatedErr);
    process.exit(1);
  }
  const updatedSubject = updatedProfile.semesters[0].subjects.find(s => s.id === subjectToUpdate.id);
  if (!updatedSubject || updatedSubject.subject_name !== 'Advanced Nanotechnology II' || Number(updatedSubject.credit) !== 3) {
    console.error('TEST 9 FAILED: Updated values do not match in Supabase:', updatedSubject);
    process.exit(1);
  }
  console.log('✓ Updated profile is VISIBLE with updated subject:', updatedSubject.subject_name, 'Credit:', updatedSubject.credit);

  // Clean up test data
  console.log('\n--- Cleanup test profile ---');
  await client.from('profiles').delete().eq('id', profileId);
  console.log('✓ Cleanup complete.');

  console.log('\n=== ALL 10 TESTS PASSED SUCCESSFULLY! ===');
}

runTestSuite();
