import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabaseServerInstance: SupabaseClient | null = null;

/**
 * Lazy initialization of server-side Supabase client with service role key.
 * Prevents build-time / client-bundling module evaluation crashes.
 *
 * In test environments (NODE_ENV === 'test'), falls back to anon key so unit
 * tests can run without a service role key.
 * In production, throws immediately if env vars are missing.
 */
export function getSupabaseServer(): SupabaseClient {
  if (_supabaseServerInstance) return _supabaseServerInstance;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    if (process.env.NODE_ENV === 'test') {
      // Allow tests to run without service role key
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';
      _supabaseServerInstance = createClient(supabaseUrl || 'https://test.supabase.co', anonKey, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      });
      return _supabaseServerInstance;
    }
    throw new Error(
      'Missing Supabase server environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Set these in your deployment environment.'
    );
  }

  _supabaseServerInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return _supabaseServerInstance;
}

/**
 * Create a short-lived auth-only client using the anon key.
 * Used for auth operations (signUp, signIn, resetPassword, verifyOtp, exchangeCodeForSession)
 * that must NOT use the service role key.
 * Session is NOT persisted — this is a one-shot request client.
 */
export function createAuthClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      'Missing Supabase anon environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// Server-side client with service role key (bypasses RLS)
// Transparent proxy allows drop-in compatibility for all `supabaseServer.from(...)` usages
export const supabaseServer = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseServer();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
