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
const s = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: r, error: rErr } = await s.from('rental_requests').select('id, reference_number, customer_id, current_state').limit(5);
  console.log('Rental Requests:', r, rErr);
  const { data: q, error: qErr } = await s.from('quotations').select('id, reference_number, rental_request_id, status, total_amount').limit(5);
  console.log('Quotations:', q, qErr);
  const { data: u, error: uErr } = await s.from('users').select('id, email, role, full_name').limit(10);
  console.log('Users:', u, uErr);
}
run();
