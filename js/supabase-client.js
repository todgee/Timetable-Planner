/* ==========================================================
   SUPABASE-CLIENT.JS — single initialisation point
   Only the publishable key is used here — never the secret key.
   window.supabase is replaced with the initialised client so
   all other scripts can reference it as a plain global.
   ========================================================== */

const SUPABASE_URL = 'https://csqwfuvjbtkhestnfezt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_uXML9SWQOZYTSIwAI80-iQ_9F83W8vb';

window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
