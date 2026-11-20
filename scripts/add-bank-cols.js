const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: 'db.vmnszggrtvzspquwcrjt.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'Ch33sc0-System-2026!',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('Connected to PG');

    await client.query(`
      ALTER TABLE public.merchant_profiles 
      ADD COLUMN IF NOT EXISTS bank_name TEXT,
      ADD COLUMN IF NOT EXISTS account_number TEXT,
      ADD COLUMN IF NOT EXISTS account_name TEXT;
    `);

    // Add sample settlement accounts for existing merchants if null
    await client.query(`
      UPDATE public.merchant_profiles 
      SET 
        bank_name = COALESCE(bank_name, 'Access Bank Plc'),
        account_number = COALESCE(account_number, '0123456789'),
        account_name = COALESCE(account_name, business_name || ' Fleet Settlement')
      WHERE bank_name IS NULL;
    `);

    const res = await client.query(`
      SELECT id, business_name, bank_name, account_number, account_name 
      FROM public.merchant_profiles;
    `);
    console.log('Merchant settlement accounts:', res.rows);

    await client.end();
  } catch (e) {
    console.error('Error:', e);
    try { await client.end(); } catch(_) {}
  }
}

run();
