/* ==========================================================
   REQUIRE-AUTH.JS — redirect to auth.html if no active session
   Load this after supabase-client.js on every protected page.
   ========================================================== */

(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.replace('auth.html');
  }
})();
