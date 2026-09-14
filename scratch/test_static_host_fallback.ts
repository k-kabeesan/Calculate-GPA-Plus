import {
  fetchPublicProfiles,
  createProfile,
  fetchProfileById,
  verifyOwnerPasscode,
  deleteProfile,
  fetchFilterOptions
} from '../src/services/dbService';

// Mock browser environment with window, localStorage, and fetch returning HTML (like GitHub Pages)
const storage: Record<string, string> = {};

(globalThis as any).window = {
  location: {
    hostname: 'my-username.github.io',
    origin: 'https://my-username.github.io',
    port: ''
  },
  localStorage: {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, val: string) => { storage[key] = val; },
    removeItem: (key: string) => { delete storage[key]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
  }
};
(globalThis as any).localStorage = (globalThis as any).window.localStorage;

// Mock fetch to simulate GitHub Pages returning HTML 404 for any /api request
(globalThis as any).fetch = async (url: string) => {
  return {
    ok: false,
    status: 404,
    headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
    text: async () => `<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>404</h1><p>Site not found</p></body></html>`,
    json: async () => { throw new SyntaxError('Unexpected token < in JSON at position 0'); }
  } as any;
};

async function runStaticHostSimulation() {
  console.log('=== Simulating GitHub Pages Static Hosting Behavior ===\n');

  // 1. Test initial load (no profiles yet)
  console.log('Test 1: Initial public profiles fetch on GitHub Pages');
  const initialProfiles = await fetchPublicProfiles();
  console.log('  Initial profiles returned:', initialProfiles.length);
  if (!Array.isArray(initialProfiles) || initialProfiles.length !== 0) {
    throw new Error(`Expected empty array [], got ${JSON.stringify(initialProfiles)}`);
  }
  console.log('  ✓ PASS: Safely returned [] without throwing HTML SyntaxError or Misconfigured error!\n');

  // 2. Test filter options on empty state
  console.log('Test 2: Filter options on empty state');
  const filters = await fetchFilterOptions();
  console.log('  Universities count:', filters.universities.length);
  console.log('  ✓ PASS: Returned empty filter arrays without crash!\n');

  // 3. Test creating a profile on GitHub Pages
  console.log('Test 3: Creating a profile on GitHub Pages (static host)');
  const created = await createProfile({
    profile_name: 'Software Engineering Year 3',
    university: 'University of Colombo',
    faculty: 'Faculty of Computing',
    passcode: 'secret123',
    semesters: [
      {
        id: 1,
        semester_name: 'Semester 1',
        semester_order: 1,
        subjects: [
          { id: 1, subject_code: 'SCS3201', subject_name: 'Machine Learning', credit: 3 },
          { id: 2, subject_code: 'SCS3202', subject_name: 'Distributed Systems', credit: 3 }
        ]
      }
    ]
  });
  console.log('  Created Profile ID:', created.id);
  if (!created.id || created.id.length !== 6) {
    throw new Error(`Invalid created profile ID: ${created.id}`);
  }
  console.log('  ✓ PASS: Profile created and persisted to client storage!\n');

  // 4. Test fetching public profiles after creation
  console.log('Test 4: Fetching public profiles after creation');
  const loadedProfiles = await fetchPublicProfiles();
  console.log('  Loaded profiles count:', loadedProfiles.length);
  if (loadedProfiles.length !== 1 || loadedProfiles[0].id !== created.id) {
    throw new Error('Expected 1 loaded profile matching created ID');
  }
  console.log('  Profile Name:', loadedProfiles[0].profile_name);
  console.log('  Total Credits:', loadedProfiles[0].total_credits);
  console.log('  ✓ PASS: Created profile successfully loaded into feed!\n');

  // 5. Test opening profile by ID
  console.log('Test 5: Fetching profile by ID on GitHub Pages');
  const fetched = await fetchProfileById(created.id);
  console.log('  Fetched profile by ID:', fetched.id, fetched.profile_name);
  if (fetched.id !== created.id) throw new Error('Profile ID mismatch');
  console.log('  ✓ PASS: Profile Viewer can open profile by ID without backend!\n');

  // 6. Test verifying passcode
  console.log('Test 6: Verifying passcode on static host');
  const valid = await verifyOwnerPasscode(created.id, 'secret123');
  const invalid = await verifyOwnerPasscode(created.id, 'wrongpass');
  console.log('  Valid passcode check:', valid);
  console.log('  Invalid passcode check:', invalid);
  if (!valid || invalid) throw new Error('Passcode verification failed');
  console.log('  ✓ PASS: Passcode security works on static host!\n');

  // 7. Test deleting profile
  console.log('Test 7: Deleting profile on static host');
  await deleteProfile(created.id, 'secret123');
  const afterDelete = await fetchPublicProfiles();
  console.log('  Profiles after deletion:', afterDelete.length);
  if (afterDelete.length !== 0) throw new Error('Profile was not deleted');
  console.log('  ✓ PASS: Profile deleted successfully from client storage!\n');

  console.log('=== ALL GITHUB PAGES STATIC HOSTING SIMULATION TESTS PASSED! ===');
}

runStaticHostSimulation().catch(err => {
  console.error('STATIC HOST TEST FAILED:', err);
  process.exit(1);
});
