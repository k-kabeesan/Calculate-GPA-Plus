import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdojjzhogiyifovcbnjh.supabase.co';
const supabaseAnonKey = 'sb_publishable_0oNmf07nEQHnMP5e4vTlOA_0Frxoq6u';

const client = createClient(supabaseUrl, supabaseAnonKey);

async function testFullInsert() {
  console.log('--- Testing insert with degree: "" ---');
  const testId = 'GPA-TEST-' + Math.floor(100000 + Math.random() * 900000);
  const profileRow = {
    id: testId,
    profile_name: 'N3-01',
    university: '',
    faculty: '',
    degree: '',
    academic_year: '',
    description: '',
    visibility: 'public',
    passcode_hash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' // test12345 sha256
  };

  const { data: pData, error: pErr } = await client.from('profiles').insert(profileRow).select();
  console.log('Profiles Insert:', { pData, pErr });

  if (pErr) return;

  console.log('\n--- Testing semesters insert ---');
  const { data: semData, error: semErr } = await client.from('semesters').insert({
    profile_id: testId,
    semester_name: 'Semester 1',
    semester_order: 1
  }).select();
  console.log('Semesters Insert:', { semData, semErr });

  if (semErr || !semData || semData.length === 0) return;

  console.log('\n--- Testing subjects insert ---');
  const { data: subData, error: subErr } = await client.from('subjects').insert({
    semester_id: semData[0].id,
    subject_code: 'NANO2112',
    subject_name: 'Nanotechnology II',
    credit: 2
  }).select();
  console.log('Subjects Insert:', { subData, subErr });

  console.log('\n--- Cleaning up test profile ---');
  await client.from('profiles').delete().eq('id', testId);
  console.log('Cleanup complete.');
}

testFullInsert();
