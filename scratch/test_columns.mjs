import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdojjzhogiyifovcbnjh.supabase.co';
const supabaseAnonKey = 'sb_publishable_0oNmf07nEQHnMP5e4vTlOA_0Frxoq6u';

const client = createClient(supabaseUrl, supabaseAnonKey);

async function testColumns() {
  const fieldsToTry = [
    { id: 'GPA-TEST-1', profile_name: 'Test', university: 'U', faculty: 'F' },
    { id: 'GPA-TEST-2', profile_name: 'Test', university: 'U', faculty: 'F', department: 'D' },
    { id: 'GPA-TEST-3', profile_name: 'Test', university: 'U', faculty: 'F', profile_id: 'GPA-TEST-3' },
    { id: 'GPA-TEST-4', profile_name: 'Test', university: 'U', faculty: 'F', passcode_hash: '123' },
    { id: 'GPA-TEST-5', profile_name: 'Test', university: 'U', faculty: 'F', password_hash: '123' },
  ];

  for (const f of fieldsToTry) {
    console.log('Trying insert with keys:', Object.keys(f));
    const { data, error } = await client.from('profiles').insert(f).select();
    console.log('Result:', { data, error });
    if (data && data.length > 0) {
      console.log('SUCCESS! Columns in table are:', Object.keys(data[0]));
      // Clean up
      await client.from('profiles').delete().eq('id', f.id);
      break;
    }
  }
}

testColumns();
