import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdojjzhogiyifovcbnjh.supabase.co';
const supabaseAnonKey = 'sb_publishable_0oNmf07nEQHnMP5e4vTlOA_0Frxoq6u';

const client = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  console.log('Testing profiles insert...');
  const testId = 'GPA-TEST-' + Date.now();
  const { data, error } = await client.from('profiles').insert({
    id: testId,
    profile_id: testId,
    profile_name: 'Test Profile',
    university: 'Test Uni',
    faculty: 'Test Faculty',
    department: 'Test Dept',
    degree: '',
    academic_year: '2024/2025',
    description: 'Test',
    visibility: 'public',
    passcode_hash: '12345',
    password_hash: '12345'
  }).select();

  console.log('Profiles insert result:', { data, error });

  if (error) return;

  console.log('Testing semesters insert...');
  const { data: semData, error: semError } = await client.from('semesters').insert({
    profile_id: testId,
    semester_name: 'Semester 1',
    semester_order: 1
  }).select();

  console.log('Semesters insert result:', { semData, error: semError });

  if (semError || !semData || semData.length === 0) return;

  console.log('Testing subjects insert...');
  const { data: subData, error: subError } = await client.from('subjects').insert({
    semester_id: semData[0].id,
    subject_code: 'TEST101',
    module_number: 'TEST101',
    subject_name: 'Test Subject',
    credit: 3
  }).select();

  console.log('Subjects insert result:', { subData, error: subError });
}

testInsert();
