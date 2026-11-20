const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
  const parts = line.trim().split('=');
  const k = parts[0];
  const v = parts.slice(1).join('=');
  if (k && v) envVars[k.trim()] = v.trim().replace(/^['"]|['"]$/g, '');
});

async function testSqlApi() {
  const endpoints = [
    'https://vmnszggrtvzspquwcrjt.supabase.co/rest/v1/rpc',
    'https://vmnszggrtvzspquwcrjt.supabase.co/pg',
    'https://api.supabase.com/v1/projects/vmnszggrtvzspquwcrjt/database/query',
  ];
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'apikey': envVars.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${envVars.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: 'SELECT 1;' })
      });
      const text = await res.text();
      console.log(ep, res.status, text.slice(0, 100));
    } catch (e) {
      console.log(ep, 'Error:', e.message);
    }
  }
}
testSqlApi();
