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
  const { data: r, error: rErr } = await s
    .from('rental_requests')
    .select(`
      id,
      reference_number,
      customer_id,
      equipment_id,
      current_state,
      equipment(id, name)
    `)
    .eq('reference_number', 'RNT-MV7V64SD-4208');

  console.log('Query without !inner:', JSON.stringify(r, null, 2), rErr);

  const { data: rInner, error: rInnerErr } = await s
    .from('rental_requests')
    .select(`
      id,
      reference_number,
      customer_id,
      equipment_id,
      current_state,
      equipment:equipment!inner(name, category, images:equipment_images(image_url, is_primary))
    `)
    .eq('reference_number', 'RNT-MV7V64SD-4208');

  console.log('Query WITH !inner:', JSON.stringify(rInner, null, 2), rInnerErr);

  const { data: q } = await s
    .from('quotations')
    .select('id, reference_number, rental_request_id, status, total_amount')
    .eq('rental_request_id', r && r[0] ? r[0].id : '');
  console.log('Quotation for RNT-MV7V64SD-4208:', JSON.stringify(q, null, 2));
}
run();
