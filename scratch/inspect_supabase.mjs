import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdojjzhogiyifovcbnjh.supabase.co';
const supabaseAnonKey = 'sb_publishable_0oNmf07nEQHnMP5e4vTlOA_0Frxoq6u';

const client = createClient(supabaseUrl, supabaseAnonKey);

async function inspectSchema() {
  console.log('--- SELECT 1 FROM profiles ---');
  const { data: pData, error: pError } = await client.from('profiles').select('*').limit(1);
  console.log('Profiles SELECT:', { pData, pError });

  console.log('\n--- SELECT 1 FROM semesters ---');
  const { data: sData, error: sError } = await client.from('semesters').select('*').limit(1);
  console.log('Semesters SELECT:', { sData, sError });

  console.log('\n--- SELECT 1 FROM subjects ---');
  const { data: subData, error: subError } = await client.from('subjects').select('*').limit(1);
  console.log('Subjects SELECT:', { subData, subError });
}

inspectSchema();
