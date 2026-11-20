import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to read .env.local manually
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || '').trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[key] = val;
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vmnszggrtvzspquwcrjt.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const VALID_ROLES = [
  'SUPER_ADMIN',
  'OPERATIONS_ADMIN',
  'VERIFICATION_ADMIN',
  'FINANCE_ADMIN',
  'SUPPORT_ADMIN',
  'MERCHANT',
  'CUSTOMER',
];

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
=====================================================
  Cheesco Equip Hub - Admin Account Creator
=====================================================
Usage:
  node scripts/create-admin.mjs <email> <password> [fullName] [role]

Examples:
  node scripts/create-admin.mjs admin@cheesco.com password123 "Cheesco Admin" SUPER_ADMIN
  node scripts/create-admin.mjs ops@cheesco.com password123 "Ops Lead" OPERATIONS_ADMIN
  node scripts/create-admin.mjs verify@cheesco.com password123 "Verification Officer" VERIFICATION_ADMIN

Available Roles:
  - SUPER_ADMIN (Full access to all dashboards & controls)
  - OPERATIONS_ADMIN (Equipment moderation, logistics, rental disputes)
  - VERIFICATION_ADMIN (Merchant KYC & Document approvals)
  - FINANCE_ADMIN (Payments, payouts, escrow refunds)
  - SUPPORT_ADMIN (Customer inquiries, tickets)
=====================================================
`);
    process.exit(0);
  }

  const email = args[0].trim().toLowerCase();
  const password = args[1];
  const fullName = args[2] || 'Admin User';
  const role = (args[3] || 'SUPER_ADMIN').toUpperCase();

  if (!VALID_ROLES.includes(role)) {
    console.error(`❌ Invalid role: "${role}". Valid roles: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }

  console.log(`\n⏳ Checking account for: ${email}...`);

  // Check if auth user exists
  const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Failed to list users:', listError.message);
    process.exit(1);
  }

  const existingAuthUser = usersData?.users.find((u) => u.email?.toLowerCase() === email);

  let userId;

  if (existingAuthUser) {
    userId = existingAuthUser.id;
    console.log(`ℹ️ User already exists in auth (ID: ${userId}). Updating password & profile...`);
    
    // Update password & role metadata
    const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: { role },
    });
    if (updateAuthErr) {
      console.warn('⚠️ Could not update auth password:', updateAuthErr.message);
    }
  } else {
    console.log(`⏳ Creating new Supabase Auth user...`);
    const { data: newAuthUser, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: { role },
    });

    if (createAuthErr || !newAuthUser.user) {
      console.error('❌ Failed to create user in Auth:', createAuthErr?.message);
      process.exit(1);
    }
    userId = newAuthUser.user.id;
    console.log(`✅ Auth user created (ID: ${userId})`);
  }

  // Upsert user profile into public.users
  console.log(`⏳ Setting database profile role="${role}"...`);
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('users')
    .upsert({
      id: userId,
      email,
      full_name: fullName,
      role: role,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (profileErr) {
    console.error('❌ Failed to update profile in database:', profileErr.message);
    process.exit(1);
  }

  console.log(`
=====================================================
🎉 SUCCESS! Admin account is ready.
-----------------------------------------------------
Email:     ${email}
Role:      ${role}
Name:      ${fullName}
User ID:   ${userId}
-----------------------------------------------------
You can now log in at http://localhost:3000/login
and access your dashboard:
- Operations Admin: http://localhost:3000/admin/operations
- Verification Admin: http://localhost:3000/admin/verification
=====================================================
`);
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
