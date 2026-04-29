/* ==========================================================
   REQUIRE-AUTH.JS — redirect to auth.html if no active session
   Load this after supabase-client.js on every protected page.
   The body starts hidden (set visibility:hidden on the <body>
   tag) and is revealed only once a valid session is confirmed,
   preventing a flash of content before the redirect fires.
   ========================================================== */

(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.replace('auth.html');
  } else {
    document.body.style.visibility = 'visible';
  }
})();
