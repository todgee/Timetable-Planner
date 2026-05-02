/* ==========================================================
   SUPABASE-CLIENT.JS
   Initialises the Supabase client and enforces authentication.

   window.authReady — Promise that resolves to the active session.
                      Await it in any script that needs an auth'd client.
                      On pages other than login.html it redirects to
                      login.html when there is no session.
   window.signOut   — Signs the user out and redirects to login.html.
   ========================================================== */

const SUPABASE_URL = 'https://csqwfuvjbtkhestnfezt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sGE1GsTukTyUzbobi4oLHg_jKvZLBYT';

window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const _isLoginPage = window.location.pathname.endsWith('/login.html');

window.signOut = async function () {
  await window.supabase.auth.signOut();
  window.location.replace('login.html');
};

window.authReady = (async () => {
  const { data: { session } } = await window.supabase.auth.getSession();

  if (_isLoginPage) {
    // Already logged in — skip past the login page
    if (session) window.location.replace('portal.html');
    return null;
  }

  if (!session) {
    window.location.replace('login.html');
    return new Promise(() => {}); // suspend while the redirect fires
  }

  return session;
})();

// Redirect to login if the session expires or the user signs out in another tab
window.supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' && !_isLoginPage) {
    window.location.replace('login.html');
  }
});
