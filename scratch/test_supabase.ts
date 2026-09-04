import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdojjzhogiyifovcbnjh.supabase.co';
const supabaseAnonKey = 'sb_publishable_0oNmf07nEQHnMP5e4vTlOA_0Frxoq6u';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabase() {
  console.log('Testing Supabase query...');
  try {
    const { data, error, status, statusText } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);

    console.log('Status:', status, statusText);
    if (error) {
      console.error('Supabase error:', error);
    } else {
      console.log('Supabase data:', data);
    }
  } catch (err: any) {
    console.error('Exception querying Supabase:', err);
  }
}

testSupabase();
