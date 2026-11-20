const { Client } = require('pg');

async function testPg(pw) {
  const client = new Client({
    host: 'db.vmnszggrtvzspquwcrjt.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: pw,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    console.log('Connected to PG successfully with password!');
    const res = await client.query('SELECT current_database(), current_user;');
    console.log('Result:', res.rows);
    await client.end();
    return true;
  } catch (e) {
    console.log('Failed with password:', e.message);
    try { await client.end(); } catch(_) {}
    return false;
  }
}

testPg('Ch33sc0-System-2026!');
