/* ==========================================================
   SUPABASE-CLIENT.JS — single initialisation point
   Only the publishable key is used here — never the secret key.
   ========================================================== */

const SUPABASE_URL  = 'https://csqwfuvjbtkhestnfezt.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_uXML9SWQOZYTSIwAI80-iQ_9F83W8vb';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
