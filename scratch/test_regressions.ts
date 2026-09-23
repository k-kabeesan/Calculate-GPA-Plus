import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createApp } from '../server/app';
import type { Profile, ProfileCard, ProfileDraft, ProfileFilters, SearchResult } from '../src/domain/model';
import type { ProfileRepository } from '../server/repository';
import { newDraft } from '../src/domain/model';

class MemoryRepository implements ProfileRepository {
  records = new Map<string, { profile: Profile; hash: string }>();
  failWrite = false;
  async search(filters: ProfileFilters): Promise<SearchResult> {
    const page = filters.page || 1;
    const matches = [...this.records.values()].map(item => item.profile).filter(profile =>
      (!filters.search || JSON.stringify(profile).toLowerCase().includes(filters.search.toLowerCase())) &&
      (!filters.university || profile.university === filters.university) &&
      (!filters.faculty || profile.faculty === filters.faculty) &&
      (!filters.department || profile.department === filters.department) &&
      (!filters.degree || profile.degree === filters.degree) &&
      (!filters.academicYear || profile.academicYear === filters.academicYear) &&
      (!filters.semester || profile.semesters.some(item => item.name.includes(filters.semester!))));
    const profiles: ProfileCard[] = matches.slice((page - 1) * 12, page * 12).map(profile => ({ id: profile.id, name: profile.name, university: profile.university, faculty: profile.faculty, department: profile.department, degree: profile.degree, academicYear: profile.academicYear, createdAt: profile.createdAt, semesterCount: profile.semesters.length, subjectCount: profile.semesters.reduce((n, item) => n + item.subjects.length, 0) }));
    return { profiles, total: matches.length, page, pageSize: 12 };
  }
  async filters() { return { universities: [...new Set([...this.records.values()].map(item => item.profile.university))], faculties: [], departments: [], degrees: [], academicYears: [] }; }
  async get(id: string) { return this.records.get(id)?.profile ?? null; }
  async getHash(id: string) { return this.records.get(id)?.hash ?? null; }
  async create(id: string, draft: ProfileDraft, hash: string) {
    if (this.failWrite) throw new Error('simulated database failure');
    const date = new Date().toISOString();
    this.records.set(id, { profile: { ...structuredClone(draft), id, createdAt: date, updatedAt: date, hasPasscode: true }, hash });
  }
  async update(id: string, draft: ProfileDraft) {
    if (this.failWrite) throw new Error('simulated database failure');
    const entry = this.records.get(id)!;
    entry.profile = { ...structuredClone(draft), id, createdAt: entry.profile.createdAt, updatedAt: new Date().toISOString(), hasPasscode: true };
  }
  async remove(id: string) { if (this.failWrite) throw new Error('simulated database failure'); this.records.delete(id); }
}

const repo = new MemoryRepository();
const server = createApp(repo).listen(0);
await once(server, 'listening');
const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const request = async (path: string, method = 'GET', body?: unknown) => {
  const response = await fetch(`${origin}/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, json: await response.json() as { success: boolean; data?: { id?: string; total?: number; name?: string }; error?: { code: string } } };
};
try {
  const malformed = await fetch(`${origin}/api/profiles`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json() as { error: { code: string } }).error.code, 'INVALID_JSON');
  const draft = newDraft();
  draft.name = 'Alpha'; draft.university = 'University A'; draft.faculty = 'Science'; draft.department = 'Physics'; draft.degree = 'BSc'; draft.academicYear = '2025';
  draft.semesters[0].subjects[0] = { id: '1', code: 'CS101', name: 'Computing', credits: 3, grade: 'A' };
  assert.equal((await request('/profiles', 'POST', { ...draft, university: '' })).status, 400);
  const first = await request('/profiles', 'POST', { ...draft, passcode: 'secret' });
  assert.equal(first.status, 201);
  const id = first.json.data?.id;
  assert.ok(id);
  const second = await request('/profiles', 'POST', { ...draft, name: 'Beta', university: 'University B', department: 'Chemistry', passcode: 'another' });
  assert.equal(second.status, 201);
  assert.equal((await request('/profiles')).json.data?.total, 2);
  assert.equal((await request('/profiles?search=bet')).json.data?.total, 1);
  assert.equal((await request('/profiles?university=University%20A')).json.data?.total, 1);
  assert.equal((await request('/profiles?department=Physics')).json.data?.total, 1);
  assert.equal((await request(`/profiles/${id}`)).json.data?.name, 'Alpha');
  assert.equal((await request(`/profiles/${id}/verify`, 'POST', { passcode: 'wrong' })).status, 401);
  assert.equal((await request(`/profiles/${id}`, 'PUT', { ...draft, name: 'Changed', passcode: 'wrong' })).status, 401);
  assert.equal((await request(`/profiles/${id}`)).json.data?.name, 'Alpha');
  repo.failWrite = true;
  assert.equal((await request(`/profiles/${id}`, 'PUT', { ...draft, name: 'Changed', passcode: 'secret' })).status, 503);
  assert.equal((await request(`/profiles/${id}`)).json.data?.name, 'Alpha');
  repo.failWrite = false;
  assert.equal((await request(`/profiles/${id}/verify`, 'POST', { passcode: 'secret' })).status, 200);
  assert.equal((await request(`/profiles/${id}`, 'PUT', { ...draft, name: 'Changed', passcode: 'secret' })).status, 200);
  assert.equal((await request(`/profiles/${id}`)).json.data?.name, 'Changed');
  assert.equal((await request(`/profiles/${id}`, 'DELETE', { passcode: 'wrong' })).status, 401);
  assert.equal((await request(`/profiles/${id}`, 'DELETE', { passcode: 'secret' })).status, 200);
  assert.equal((await request(`/profiles/${id}`)).status, 404);
  assert.equal((await request('/profiles')).json.data?.total, 1);
  console.log('API CRUD, search, owner protection, and failure checks passed.');
} finally { server.close(); }
