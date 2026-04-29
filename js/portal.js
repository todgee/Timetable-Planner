/* ==========================================================
   PORTAL.JS
   ========================================================== */

document.getElementById('btn-signout').addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.replace('auth.html');
});
