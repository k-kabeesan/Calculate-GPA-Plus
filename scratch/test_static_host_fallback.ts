import assert from 'node:assert/strict';
import { createProfile, updateProfile, deleteProfile, verifyOwnerPasscode } from '../src/services/dbService';

globalThis.fetch = async () => new Response('<html>Not found</html>', {
  status: 404, headers: { 'content-type': 'text/html' }
});
const profile = { profile_name: 'Test', university: 'U', faculty: 'F', passcode: 'secret', semesters: [] };
await assert.rejects(createProfile(profile), /HTML/);
await assert.rejects(updateProfile('GPA-TEST', 'secret', profile), /HTML/);
await assert.rejects(deleteProfile('GPA-TEST', 'secret'), /HTML/);
assert.equal(await verifyOwnerPasscode('GPA-TEST', 'secret'), false);
console.log('Static hosting correctly rejects writes without an API.');
