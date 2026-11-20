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

async function testRpc() {
  const rpcs = ['exec_sql', 'exec', 'execute_sql', 'run_sql'];
  for (const r of rpcs) {
    const { data, error } = await s.rpc(r, { query: 'SELECT 1;' });
    console.log(r, { data, error });
  }
}
testRpc();
