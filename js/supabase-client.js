/* ==========================================================
   SUPABASE-CLIENT.JS
   Initialises the Supabase client and ensures a session exists
   before any page logic runs.

   DEV MODE: auto-signs in with hardcoded credentials so there
   is no login UI during development. Replace this block with
   real auth when the login flow is added back.

   window.authReady — Promise that resolves to the session.
   Await it in any script that needs an authenticated client.
   ========================================================== */

const SUPABASE_URL = 'https://csqwfuvjbtkhestnfezt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sGE1GsTukTyUzbobi4oLHg_jKvZLBYT';

window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DEV: hardcoded credentials — swap for real auth later
const DEV_EMAIL    = 'dev@dev.com';
const DEV_PASSWORD = 'password';

window.authReady = (async () => {
  const { data: { session } } = await window.supabase.auth.getSession();
  if (session) return session;

  const { data, error } = await window.supabase.auth.signInWithPassword({
    email:    DEV_EMAIL,
    password: DEV_PASSWORD,
  });

  if (error) {
    console.error('Dev auto-signin failed:', error.message);
    throw error;
  }

  return data.session;
})();
