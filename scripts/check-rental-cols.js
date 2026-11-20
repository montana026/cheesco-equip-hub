const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
  const parts = line.trim().split('=');
  const k = parts[0];
  const v = parts.slice(1).join('=');
  if (k && v) envVars[k.trim()] = v.trim().replace(/^['"]|['"]$/g, '');
});

const { createClient } = require('@supabase/supabase-js');
const s = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await s.from('rental_requests').select('*').limit(1);
  if (data && data[0]) {
    console.log('rental_requests keys:', Object.keys(data[0]));
  } else {
    console.log('error:', error);
  }
}
check();
