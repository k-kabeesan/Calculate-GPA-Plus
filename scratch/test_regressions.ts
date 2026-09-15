import { normalizeImportedProfile, importedSemesters } from '../src/utils/profileImport';
import { normalizeExtractedProfileClient } from '../src/services/dbService';
import { validTargetInputs } from '../src/utils/gpa';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { createProfile, updateProfile, deleteProfile, verifyOwnerPasscode, saveLocalProfile, getLocalProfileById, extractProfileFallbackClient } from '../src/services/dbService';

const storage = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k) };
(globalThis as any).window = { localStorage };
const nativeFetch = globalThis.fetch;
const json = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const payload = { profile_name: 'Test', university: 'U', faculty: 'F', passcode: 'secret', semesters: [{ semester_name: 'One', semester_order: 1, subjects: [{ subject_name: 'Programming', credit: 3 }] }] };

for (const [text, credit] of [['CS101 Programming - 3 Credits', 3], ['CS104 Seminar - 0 Credits', 0], ['CS103 Programming', null]] as const) {
  assert.equal(extractProfileFallbackClient(text).subjects[0].credit, credit);
}
for (const failure of [401, 404, 500, 'network', 'html', 'false']) {
  storage.clear();
  saveLocalProfile({ id: 'GPA-TEST', profile_name: 'Original' });
  globalThis.fetch = async () => {
    if (failure === 'network') throw new Error('Offline');
    if (failure === 'html') return new Response('<html>Error</html>', { status: 404 });
    return json({ success: false, error: 'Rejected' }, typeof failure === 'number' ? failure : 200);
  };
  await assert.rejects(createProfile(payload));
  await assert.rejects(updateProfile('GPA-TEST', 'wrong', payload));
  await assert.rejects(deleteProfile('GPA-TEST', 'wrong'));
  assert.equal(await verifyOwnerPasscode('GPA-TEST', 'wrong'), false);
  assert.equal(getLocalProfileById('GPA-TEST').profile_name, 'Original');
}
globalThis.fetch = async () => json({ success: true, id: 'GPA-NEW' });
await createProfile({ ...payload, passcode: 'secret' });
assert.equal(JSON.stringify([...storage.values()]).includes('secret'), false);
await updateProfile('GPA-NEW', 'secret', { ...payload, profile_name: 'Updated' });
assert.equal(getLocalProfileById('GPA-NEW').profile_name, 'Updated');
await deleteProfile('GPA-NEW', 'secret');
assert.equal(getLocalProfileById('GPA-NEW'), null);

// Exercise the actual Express cloud-only routes with an isolated mock database transport.
process.env.VERCEL = '1';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
let rpcFails = false;
let deleteFails = false;
let deleteCalls = 0;
let rpcCalls: any[] = [];
globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (url.includes('passcode_hash') || url.includes('password_hash')) {
    return json({ passcode_hash: createHash('sha256').update('secret').digest('hex'), password_hash: '' });
  }
  if (url.includes('/rest/v1/') || url.includes('/rpc/')) {
    if (init?.method === 'DELETE') {
      deleteCalls++;
      return deleteFails ? json({ message: 'failed' }, 500) : new Response(null, { status: 204 });
    }
    if (init?.body) {
      try {
        rpcCalls.push(JSON.parse(String(init.body)));
      } catch {}
    }
    return rpcFails ? json({ message: 'insert failed', code: '23514' }, 400) : json([{ id: 'GPA-CLOUD' }], 201);
  }
  throw new Error('Unexpected database request: ' + url);
};
const { default: app } = await import('../server/app');
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address() as { port: number };
const request = (method: string, suffix: string, data: any) => nativeFetch('http://127.0.0.1:' + address.port + '/api/profiles' + suffix, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
try {
  const databaseFetch = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = 'test-only';
  globalThis.fetch = async () => json({ choices: [{ message: { content: JSON.stringify({ semesters: [
    { name: 'Semester 1', subjects: [{ moduleCode: 'CS101', subjectName: 'Course', credit: 3 }] },
    { name: 'Semester 2', subjects: [{ moduleCode: 'CS102', subjectName: 'Next', credit: null }] }
  ] }) } }] });
  const extractedResponse = await nativeFetch('http://127.0.0.1:' + address.port + '/api/ai/extract-profile', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'test syllabus' }) });
  const extracted = (await extractedResponse.json() as any).profile;
  assert.equal(extracted.subjects[0].moduleNumber, 'CS101');
  assert.equal(extracted.subjects[1].semester, 'Semester 2');
  assert.equal(extracted.subjects[1].credit, null);
  delete process.env.OPENROUTER_API_KEY;
  globalThis.fetch = databaseFetch;
  assert.equal((await request('DELETE', '/GPA-CLOUD', { passcode: 'wrong' })).status, 401);
  assert.equal(deleteCalls, 0);
  assert.equal((await request('PUT', '/GPA-CLOUD', { ...payload, passcode: 'wrong' })).status, 401);
  assert.equal(rpcCalls.length, 0);
  assert.equal((await request('POST', '', payload)).status, 201);
  assert.equal(rpcCalls.length > 0, true);
  assert.equal((await request('PUT', '/GPA-CLOUD', { ...payload, passcode: 'secret' })).status, 200);
  assert.equal(rpcCalls.length > 1, true);
  rpcFails = true;
  assert.equal((await request('POST', '', payload)).status, 500);
  assert.equal((await request('PUT', '/GPA-CLOUD', { ...payload, passcode: 'secret' })).status, 500);
  deleteFails = true;
  assert.equal((await request('DELETE', '/GPA-CLOUD', { passcode: 'secret' })).status, 500);
  deleteFails = false;
  assert.equal((await request('DELETE', '/GPA-CLOUD', { passcode: 'secret' })).status, 200);
} finally {
  server.close();
  server.closeAllConnections();
  globalThis.fetch = nativeFetch;
}
console.log('Regression checks passed: credits, rejected writes, passcodes, cloud RPC failures, and deletes.');

const imported = normalizeImportedProfile({ semesters: [
 { name: 'Semester 1', subjects: [{ moduleCode: 'CS101', subjectName: 'Programming', credit: 3 }, { moduleCode: 'CS102', subjectName: 'Lab', credit: 0 }] },
 { semester_name: 'Semester 2', subjects: [{ moduleCode: 'CS101', subjectName: 'Repeat', credit: null }] }
] });
assert.equal(imported.subjects[0].moduleNumber, 'CS101');
assert.equal(imported.subjects[0].credit, 3);
assert.equal(imported.subjects[1].credit, 0);
assert.equal(imported.subjects[2].credit, null);
const reviewed = normalizeExtractedProfileClient(imported);
assert.equal(reviewed.subjects.length, 3);
assert.equal(reviewed.subjects[2].semester, 'Semester 2');
reviewed.subjects[2].credit = 2;
const semesters = importedSemesters(reviewed.subjects, reviewed.semester);
assert.equal(semesters.length, 2);
assert.equal(semesters[1].subjects[0].subject_code, 'CS101');
for (const values of [['-1','30','3','30'], ['5','30','3','30'], ['3','-1','3','30'], ['','30','3','30'], ['Infinity','30','3','30'], ['3x','30','3','30'], ['3','30','3','0']]) assert.equal(validTargetInputs(values,4),false);
assert.equal(validTargetInputs(['0','0','3','30'],4),true);
assert.equal(validTargetInputs(['4.5','30','4.8','30'],5),true);
console.log('Import semester preservation and target input regression checks passed.');
