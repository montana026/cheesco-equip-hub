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

async function inspect() {
  const res = await fetch(envVars.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/', {
    headers: {
      'apikey': envVars.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${envVars.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  const json = await res.json();
  const def = json.definitions.payments;
  console.log('payments properties:', def ? Object.keys(def.properties) : 'not found');
}
inspect();
