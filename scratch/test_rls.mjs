import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdojjzhogiyifovcbnjh.supabase.co';
const supabaseAnonKey = 'sb_publishable_0oNmf07nEQHnMP5e4vTlOA_0Frxoq6u';

const client = createClient(supabaseUrl, supabaseAnonKey);

async function testRls() {
  const testId = 'GPA-RLSTEST-' + Math.floor(100000 + Math.random() * 900000);
  console.log('1. Testing INSERT...');
  const { data: pIns, error: errIns } = await client.from('profiles').insert({
    id: testId,
    profile_name: 'RLS Test',
    university: '',
    faculty: '',
    degree: '',
    passcode_hash: 'hash'
  }).select();
  console.log('INSERT:', { pIns, errIns });

  if (errIns) return;

  console.log('\n2. Testing SELECT...');
  const { data: pSel, error: errSel } = await client.from('profiles').select('*').eq('id', testId);
  console.log('SELECT:', { pSel, errSel });

  console.log('\n3. Testing UPDATE...');
  const { data: pUpd, error: errUpd } = await client.from('profiles').update({ profile_name: 'RLS Test Updated' }).eq('id', testId).select();
  console.log('UPDATE:', { pUpd, errUpd });

  console.log('\n4. Testing DELETE...');
  const { data: pDel, error: errDel } = await client.from('profiles').delete().eq('id', testId).select();
  console.log('DELETE:', { pDel, errDel });
}

testRls();
