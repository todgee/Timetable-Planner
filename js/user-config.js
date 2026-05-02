/* ==========================================================
   USER-CONFIG.JS
   Loads global per-user appearance settings from Supabase and
   applies them via ThemeEngine, fixing cross-account theme bleed.

   Must load after: supabase-client.js, shared.js, theme-engine.js

   Exposes:
     window.userConfigReady  — Promise<data|null>  resolved config row
     window.saveUserConfig   — async (fields) => void
   ========================================================== */

window.userConfigReady = (async function () {
  try {
    var session = await window.authReady;
    if (!session) return null;

    var userId = session.user.id;

    // ── Detect user switch ─────────────────────────────────
    // If a different user was previously active on this browser,
    // clear their theme from localStorage before applying ours.
    var lastId = localStorage.getItem('timetable.lastUserId');
    if (lastId && lastId !== userId) {
      localStorage.removeItem('timetable.theme');
      localStorage.removeItem('timetable.bg');
      localStorage.removeItem('timetable.logo');
      if (typeof ThemeEngine !== 'undefined') ThemeEngine.reset();
    }
    localStorage.setItem('timetable.lastUserId', userId);

    // ── Load from Supabase ─────────────────────────────────
    var result = await window.supabase
      .from('user_config')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    var data = result.data;
    if (!data) return null;

    // ── Apply theme ────────────────────────────────────────
    if (typeof ThemeEngine !== 'undefined') {
      var theme = {
        primary: data.theme_primary || ThemeEngine.DEFAULTS.primary,
        accent:  data.theme_accent  || ThemeEngine.DEFAULTS.accent,
        mode:    data.theme_mode    || ThemeEngine.DEFAULTS.mode,
      };
      ThemeEngine.save(theme);
      ThemeEngine.apply(theme);

      if (data.bg_start && data.bg_end) {
        ThemeEngine.saveBg({ start: data.bg_start, end: data.bg_end });
      }
    }

    return data;
  } catch (e) {
    return null;
  }
})();

// ── Save helper (used by config.js in user mode) ───────────
window.saveUserConfig = async function (fields) {
  var session = await window.authReady;
  if (!session) return;
  var payload = Object.assign({ updated_at: new Date().toISOString() }, fields);
  payload.user_id = session.user.id;
  var result = await window.supabase
    .from('user_config')
    .upsert(payload, { onConflict: 'user_id' });
  if (result.error) throw result.error;
};
