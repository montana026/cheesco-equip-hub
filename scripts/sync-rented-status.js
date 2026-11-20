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
  const todayStr = new Date().toISOString().split('T')[0];
  console.log('Syncing leased equipment status for today:', todayStr);

  const { data: activeLeasedRequests } = await s
    .from('rental_requests')
    .select('id, reference_number, equipment_id, current_state, end_date')
    .in('current_state', [
      'PAYMENT_CONFIRMED',
      'IN_TRANSIT',
      'DELIVERED',
      'RENTAL_ACTIVE',
      'DEPOSIT_HELD',
      'POST_RENTAL_INSPECTION',
    ])
    .gte('end_date', todayStr);

  console.log('Active leased requests:', activeLeasedRequests);

  for (const req of (activeLeasedRequests || [])) {
    if (req.equipment_id) {
      const { data, error } = await s
        .from('equipment')
        .update({ availability_status: 'RENTED' })
        .eq('id', req.equipment_id)
        .select('id, name, availability_status');
      console.log(`Updated equipment ${req.equipment_id} to RENTED:`, data, error);
    }
  }

  // Also check if any equipment completed lease and should be AVAILABLE
  const { data: completedRequests } = await s
    .from('rental_requests')
    .select('equipment_id, current_state, end_date')
    .or(`current_state.in.(COMPLETED,DEPOSIT_SETTLED,CANCELLED,QUOTATION_DECLINED),end_date.lt.${todayStr}`);

  console.log('Done sync.');
}
run();
