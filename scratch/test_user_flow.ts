// Set environment BEFORE importing dbService
process.env.VITE_API_URL = 'http://127.0.0.1:5002';

import app from '../server/app';
import { createProfile, fetchPublicProfiles, fetchProfileById, verifyOwnerPasscode, updateProfile } from '../src/services/dbService';
import http from 'http';

let server: http.Server;
const PORT = 5002;

async function runVerification() {
  console.log('====================================================');
  console.log('Verification: Public Visibility & Creator Password Flow');
  console.log('====================================================\n');

  // Start local Express server for testing
  server = app.listen(PORT, '127.0.0.1');
  await new Promise(res => setTimeout(res, 500));

  try {
    // Step 1: User A creates a profile
    console.log('1. User A creates Profile A ("Physics Major Batch 2025" with passcode "Pass123!")...');
    const createRes = await createProfile({
      profile_name: 'Physics Major Batch 2025',
      university: 'State University',
      faculty: 'Faculty of Science',
      department: 'Physics',
      academic_year: '2025',
      description: 'Physics undergraduate curriculum',
      visibility: 'public',
      passcode: 'Pass123!',
      semesters: [
        {
          semester_name: 'Semester 1',
          semester_order: 1,
          subjects: [
            { subject_code: 'PHYS101', subject_name: 'Mechanics', credit: 3 },
            { subject_code: 'PHYS102', subject_name: 'Electromagnetism', credit: 4 }
          ]
        }
      ]
    });

    const profileId = createRes.id;
    console.log(`   ✓ Profile created successfully with ID: ${profileId}`);

    // Step 2: User B searches for Profile A
    console.log('\n2. User B searches for "Physics Major Batch 2025"...');
    const publicList = await fetchPublicProfiles('Physics Major');
    const found = publicList.find((p: any) => p.id === profileId);
    if (!found) throw new Error('Profile A not found in public search results!');
    console.log(`   ✓ User B found Profile A in search results! Name: "${found.profile_name}"`);

    // Step 3: User B opens Profile A by ID
    console.log('\n3. User B opens Profile A using Profile ID...');
    const profileB = await fetchProfileById(profileId);
    if (!profileB || profileB.profile_name !== 'Physics Major Batch 2025') {
      throw new Error('User B failed to open Profile A!');
    }
    console.log(`   ✓ User B successfully loaded Profile A details. Total subjects: ${profileB.semesters[0].subjects.length}`);

    // Step 4: User B cannot edit without passcode
    console.log('\n4. User B attempts to verify with wrong/empty password...');
    const wrongPassValid = await verifyOwnerPasscode(profileId, 'wrongpass');
    if (wrongPassValid) throw new Error('Security flaw: Wrong passcode allowed authorization!');
    console.log('   ✓ Wrong passcode correctly rejected (User B cannot edit)!');

    // Step 5: User A enters correct passcode
    console.log('\n5. User A enters correct password ("Pass123!")...');
    const correctPassValid = await verifyOwnerPasscode(profileId, 'Pass123!');
    if (!correctPassValid) throw new Error('Correct passcode was rejected!');
    console.log('   ✓ Correct passcode verified!');

    // Step 6 & 7: User A edits and saves profile (adds a new subject)
    console.log('\n6 & 7. User A adds new subject "Quantum Physics (3 Cr)" and saves change...');
    await updateProfile(profileId, 'Pass123!', {
      profile_name: 'Physics Major Batch 2025 (Updated)',
      university: 'State University',
      faculty: 'Faculty of Science',
      department: 'Physics',
      academic_year: '2025',
      description: 'Physics undergraduate curriculum - updated by creator',
      visibility: 'public',
      semesters: [
        {
          semester_name: 'Semester 1',
          semester_order: 1,
          subjects: [
            { subject_code: 'PHYS101', subject_name: 'Mechanics', credit: 3 },
            { subject_code: 'PHYS102', subject_name: 'Electromagnetism', credit: 4 },
            { subject_code: 'PHYS201', subject_name: 'Quantum Physics', credit: 3 }
          ]
        }
      ]
    });
    console.log('   ✓ Profile updated and saved successfully by User A!');

    // Step 8 & 9: User B refreshes profile and sees updated profile
    console.log('\n8 & 9. User B refreshes profile and verifies updated content...');
    const updatedProfileB = await fetchProfileById(profileId);
    if (!updatedProfileB || updatedProfileB.profile_name !== 'Physics Major Batch 2025 (Updated)') {
      throw new Error('User B did not see updated profile name!');
    }
    const updatedSubjects = updatedProfileB.semesters[0].subjects;
    if (updatedSubjects.length !== 3) {
      throw new Error(`Expected 3 subjects after update, got ${updatedSubjects.length}`);
    }
    console.log(`   ✓ User B refreshed and sees updated profile name: "${updatedProfileB.profile_name}"`);
    console.log(`   ✓ User B sees all 3 subjects including newly added "${updatedSubjects[2].subject_name}"!`);

    console.log('\n====================================================');
    console.log('ALL VERIFICATION STEPS PASSED SUCCESSFULLY! 🎉');
    console.log('====================================================\n');
  } finally {
    server.close();
  }
}

runVerification().catch((err) => {
  console.error('\n✗ VERIFICATION FAILED:', err);
  if (server) server.close();
});
