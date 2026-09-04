import app from '../server/app';
import { safeFetchJson } from '../src/services/dbService';
import http from 'http';

async function runApiValidation() {
  console.log('=== Verifying Production API Endpoints & Contracts ===\n');

  // Start test server on ephemeral port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`Test API Server running on ${baseUrl}\n`);

  let testProfileId = '';

  // 1. Health check
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    const data = await res.json();
    const contentType = res.headers.get('content-type');
    console.log(`✓ GET /api/health: Status ${res.status}`);
    console.log(`  Content-Type: ${contentType}`);
    console.log(`  Response: ${JSON.stringify(data)}`);
    if (!contentType?.includes('application/json')) throw new Error('Content-Type is not JSON');
    if (!data.success) throw new Error('Expected success: true');
  } catch (err: any) {
    console.error('✗ GET /api/health failed:', err.message);
    process.exit(1);
  }

  // 2. Filters
  try {
    const res = await fetch(`${baseUrl}/api/profiles/filters`);
    const data = await res.json();
    console.log(`\n✓ GET /api/profiles/filters: Status ${res.status}`);
    console.log(`  Universities array:`, data.universities);
    console.log(`  Success flag:`, data.success);
    if (data.success !== true) throw new Error('Expected success: true on filters');
  } catch (err: any) {
    console.error('✗ GET /api/profiles/filters failed:', err.message);
    process.exit(1);
  }

  // 3. Profiles list (Returns { success: true, profiles: [] })
  try {
    const res = await fetch(`${baseUrl}/api/profiles`);
    const data = await res.json();
    console.log(`\n✓ GET /api/profiles: Status ${res.status}`);
    console.log(`  Response format: success=${data.success}, profiles.length=${data.profiles?.length}`);
    if (!data.success || !Array.isArray(data.profiles)) {
      throw new Error('Expected { success: true, profiles: [] }');
    }
  } catch (err: any) {
    console.error('✗ GET /api/profiles failed:', err.message);
    process.exit(1);
  }

  // 4. Create Profile (POST /api/profiles)
  try {
    const createRes = await fetch(`${baseUrl}/api/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile_name: 'CS Year 2 Semester 1',
        university: 'Test University',
        faculty: 'Faculty of Computing',
        department: 'Computer Science',
        academic_year: '2024/2025',
        description: 'Automated test profile',
        visibility: 'public',
        passcode: '1234',
        semesters: [
          {
            semester_name: 'Semester 1',
            semester_order: 1,
            subjects: [
              { subject_code: 'CS201', subject_name: 'Data Structures', credit: 3 },
              { subject_code: 'CS202', subject_name: 'Algorithms', credit: 3 }
            ]
          }
        ]
      })
    });
    const createData = await createRes.json();
    console.log(`\n✓ POST /api/profiles: Status ${createRes.status}`);
    console.log(`  Created Profile ID: ${createData.id}`);
    testProfileId = createData.id;
    if (!createData.success || !testProfileId) throw new Error('Failed to create profile');
  } catch (err: any) {
    console.error('✗ POST /api/profiles failed:', err.message);
    process.exit(1);
  }

  // 5. Fetch Profile by ID (GET /api/profiles/:id)
  try {
    const res = await fetch(`${baseUrl}/api/profiles/${testProfileId}`);
    const data = await res.json();
    console.log(`\n✓ GET /api/profiles/${testProfileId}: Status ${res.status}`);
    console.log(`  Profile Name: ${data.profile?.profile_name || data.profile_name}`);
    console.log(`  Semesters: ${data.semesters?.length || data.profile?.semesters?.length}`);
    if (!data.success && !data.id && !data.profile) throw new Error('Expected profile data');
  } catch (err: any) {
    console.error('✗ GET /api/profiles/:id failed:', err.message);
    process.exit(1);
  }

  // 6. Verify Passcode
  try {
    const res = await fetch(`${baseUrl}/api/profiles/${testProfileId}/verify-passcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: '1234' })
    });
    const data = await res.json();
    console.log(`\n✓ POST /api/profiles/:id/verify-passcode: Valid=${data.valid}`);
    if (!data.valid) throw new Error('Expected passcode to be valid');
  } catch (err: any) {
    console.error('✗ Verify passcode failed:', err.message);
    process.exit(1);
  }

  // 7. Delete Profile
  try {
    const res = await fetch(`${baseUrl}/api/profiles/${testProfileId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: '1234' })
    });
    const data = await res.json();
    console.log(`\n✓ DELETE /api/profiles/:id: Status ${res.status}, success=${data.success}`);
    if (!data.success) throw new Error('Expected delete success');
  } catch (err: any) {
    console.error('✗ Delete profile failed:', err.message);
    process.exit(1);
  }

  // 8. 404 Endpoint Guarantee: Non-existent /api/xyz MUST return JSON, NEVER HTML!
  try {
    const res = await fetch(`${baseUrl}/api/non-existent-endpoint-test`);
    const contentType = res.headers.get('content-type');
    const data = await res.json();
    console.log(`\n✓ Unknown route /api/non-existent-endpoint-test: Status ${res.status}`);
    console.log(`  Content-Type: ${contentType}`);
    console.log(`  JSON payload: ${JSON.stringify(data)}`);
    if (!contentType?.includes('application/json')) throw new Error('404 route returned non-JSON content type!');
    if (data.success !== false) throw new Error('Expected success: false on 404');
  } catch (err: any) {
    console.error('✗ 404 JSON guarantee test failed:', err.message);
    process.exit(1);
  }

  // 9. Safe Response Handling Test (Verify safeFetchJson prevents HTML crashes)
  console.log('\n--- Testing safeFetchJson HTML Guard ---');
  // Create mock server returning HTML
  const htmlServer = http.createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><html><head><title>Vercel SPA</title></head><body>Vite App</body></html>');
  });
  await new Promise<void>((resolve) => htmlServer.listen(0, resolve));
  const htmlPort = (htmlServer.address() as any).port;

  try {
    await safeFetchJson(`http://localhost:${htmlPort}/api/profiles`);
    console.error('✗ safeFetchJson failed to reject HTML response!');
    process.exit(1);
  } catch (err: any) {
    console.log('✓ safeFetchJson successfully intercepted HTML response!');
    console.log('  Handled error message:', err.message);
    if (!err.message.includes('Server returned HTML instead of JSON')) {
      throw new Error('Did not match expected HTML diagnostic error message');
    }
  } finally {
    htmlServer.close();
    server.close();
  }

  console.log('\n=== All Production API Tests Passed with 100% Success! ===');
}

runApiValidation();
