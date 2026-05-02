// config.js — theme / logo picker, Supabase-backed (user_config only)
'use strict';

// ── State ──────────────────────────────────────────────────────
var currentMode        = ThemeEngine.DEFAULTS.mode;
var currentPrimary     = ThemeEngine.DEFAULTS.primary;
var accentMode         = 'auto';
var customAccent       = ThemeEngine.DEFAULTS.accent;
var currentLogoDataUrl = null;

var BG_DEFAULTS = { start: '#fdfbf7', end: '#f5f1e8' };
var bgStart     = BG_DEFAULTS.start;
var bgEnd       = BG_DEFAULTS.end;

// ── Supabase helpers ───────────────────────────────────────────

async function loadConfigFromSupabase() {
  return window.userConfigReady;
}

async function saveConfig(fields) {
  // Logo fields are localStorage-only; only persist theme/bg fields to user_config
  const userFields = {};
  ['theme_primary', 'theme_accent', 'theme_mode', 'bg_start', 'bg_end'].forEach(function (k) {
    if (k in fields) userFields[k] = fields[k];
  });
  if (Object.keys(userFields).length > 0) {
    await window.saveUserConfig(Object.assign(userFields, { setup_complete: true }));
  }
}

// ── Auto-accent ────────────────────────────────────────────────
function computeAutoAccent(primaryHex) {
  var hsl = ThemeEngine.hexToHsl(primaryHex);
  var h   = (hsl.h + 137.5) % 360;
  var s   = Math.min(hsl.s * 0.85 + 15, 75);
  var l   = Math.max(Math.min(hsl.l + 5, 68), 42);
  return ThemeEngine.hslToHex(h, s, l);
}

function resolvedAccent() {
  return accentMode === 'auto' ? computeAutoAccent(currentPrimary) : customAccent;
}

// ── Live preview ───────────────────────────────────────────────
function applyLivePreview() {
  var accent = resolvedAccent();
  ThemeEngine.apply({ primary: currentPrimary, accent: accent, mode: currentMode });
  updateSwatches(currentPrimary, accent);
  updatePreviewButtons(currentPrimary, accent);
  if (accentMode === 'auto') {
    var inp = document.getElementById('color-accent');
    var hex = document.getElementById('accent-hex');
    if (inp) inp.value = accent;
    if (hex) hex.textContent = accent;
  }
}

// ── Palette swatches ───────────────────────────────────────────
function updateSwatches(primary, accent) {
  var bp = ThemeEngine.buildPalette(primary, currentMode, 'brand');
  var ap = ThemeEngine.buildPalette(accent,  currentMode, 'accent');
  setSwatchBg('sw-brand-600',  bp['--brand-600']);
  setSwatchBg('sw-brand-500',  bp['--brand-500']);
  setSwatchBg('sw-brand-400',  bp['--brand-400']);
  setSwatchBg('sw-accent-600', ap['--accent-600']);
  setSwatchBg('sw-accent-500', ap['--accent-500']);
}

function setSwatchBg(id, color) {
  var el = document.getElementById(id);
  if (el) el.style.background = color;
}

function updatePreviewButtons(primary, accent) {
  var bp = ThemeEngine.buildPalette(primary, currentMode, 'brand');
  var ap = ThemeEngine.buildPalette(accent,  currentMode, 'accent');
  setPreviewBtn('preview-btn-primary', bp['--brand-500']);
  setPreviewBtn('preview-btn-light',   bp['--brand-400']);
  setPreviewBtn('preview-btn-accent',  ap['--accent-500']);
}

function setPreviewBtn(id, color) {
  var el = document.getElementById(id);
  if (el) { el.style.background = color; el.style.color = '#ffffff'; }
}

// ── Mode / accent toggles ──────────────────────────────────────
function setModeToggle(mode) {
  currentMode = mode;
  document.getElementById('mode-btn-light').classList.toggle('active', mode === 'light');
  document.getElementById('mode-btn-dark').classList.toggle('active',  mode === 'dark');
}

function setAccentToggle(mode) {
  accentMode = mode;
  document.getElementById('accent-btn-auto').classList.toggle('active',   mode === 'auto');
  document.getElementById('accent-btn-custom').classList.toggle('active', mode === 'custom');
  var row = document.getElementById('accent-override-row');
  if (row) row.classList.toggle('visible', mode === 'custom');
}

// ── Background gradient ────────────────────────────────────────
function applyBgPreview() {
  var grad = 'linear-gradient(135deg, ' + bgStart + ' 0%, ' + bgEnd + ' 100%)';
  document.body.style.background = grad;
  var bar = document.getElementById('bg-gradient-preview');
  if (bar) bar.style.background = grad;
}

function syncBgPresetSelected() {
  document.querySelectorAll('.bg-preset').forEach(function (p) {
    p.classList.toggle('selected', p.dataset.start === bgStart && p.dataset.end === bgEnd);
  });
}

function loadBgIntoForm(cfg) {
  bgStart = (cfg && cfg.bg_start) || BG_DEFAULTS.start;
  bgEnd   = (cfg && cfg.bg_end)   || BG_DEFAULTS.end;
  document.getElementById('bg-start').value        = bgStart;
  document.getElementById('bg-start-hex').textContent = bgStart;
  document.getElementById('bg-end').value          = bgEnd;
  document.getElementById('bg-end-hex').textContent   = bgEnd;
  applyBgPreview();
  syncBgPresetSelected();
}

// ── Load saved config into form ────────────────────────────────
function loadThemeIntoForm(cfg) {
  currentMode    = (cfg && cfg.theme_mode)    || ThemeEngine.DEFAULTS.mode;
  currentPrimary = (cfg && cfg.theme_primary) || ThemeEngine.DEFAULTS.primary;
  customAccent   = (cfg && cfg.theme_accent)  || ThemeEngine.DEFAULTS.accent;

  document.getElementById('color-primary').value    = currentPrimary;
  document.getElementById('primary-hex').textContent = currentPrimary;
  document.getElementById('color-accent').value     = customAccent;
  document.getElementById('accent-hex').textContent  = customAccent;

  setModeToggle(currentMode);
  setAccentToggle('auto');

  document.querySelectorAll('.preset-color').forEach(function (p) {
    p.classList.toggle('selected', p.dataset.primary === currentPrimary);
  });
}

function loadLogoIntoForm(cfg) {
  if (!cfg || !cfg.logo_url) return;
  document.getElementById('logo-position').value = cfg.logo_position || 'header-left';
  document.getElementById('logo-size').value     = cfg.logo_size     || 'medium';
  var preview = document.getElementById('logo-preview');
  preview.src = cfg.logo_url;
  preview.style.display = 'block';
  document.getElementById('logo-placeholder').style.display = 'none';
  currentLogoDataUrl = cfg.logo_url;
}

// ── Save handlers ──────────────────────────────────────────────
async function handleSaveColors() {
  var accent = resolvedAccent();
  try {
    await saveConfig({ theme_primary: currentPrimary, theme_accent: accent, theme_mode: currentMode });
    ThemeEngine.save({ primary: currentPrimary, accent: accent, mode: currentMode });
    showNotification('Color theme saved!');
  } catch (err) {
    showNotification('Failed to save theme: ' + err.message, true);
  }
}

async function handleResetColors() {
  if (!confirm('Reset colors to default theme?')) return;
  try {
    await saveConfig({
      theme_primary: ThemeEngine.DEFAULTS.primary,
      theme_accent:  ThemeEngine.DEFAULTS.accent,
      theme_mode:    ThemeEngine.DEFAULTS.mode,
    });
    ThemeEngine.reset();
    const cfg = await loadConfigFromSupabase();
    loadThemeIntoForm(cfg);
    applyLivePreview();
    showNotification('Colors reset to default.');
  } catch (err) {
    showNotification('Failed to reset theme: ' + err.message, true);
  }
}

async function handleSaveBg() {
  try {
    await saveConfig({ bg_start: bgStart, bg_end: bgEnd });
    ThemeEngine.saveBg({ start: bgStart, end: bgEnd });
    showNotification('Background saved!');
  } catch (err) {
    showNotification('Failed to save background: ' + err.message, true);
  }
}

async function handleResetBg() {
  bgStart = BG_DEFAULTS.start;
  bgEnd   = BG_DEFAULTS.end;
  try {
    await saveConfig({ bg_start: bgStart, bg_end: bgEnd });
    ThemeEngine.resetBg();
  } catch (err) {
    showNotification('Failed to reset background: ' + err.message, true);
  }
  document.getElementById('bg-start').value        = bgStart;
  document.getElementById('bg-start-hex').textContent = bgStart;
  document.getElementById('bg-end').value          = bgEnd;
  document.getElementById('bg-end-hex').textContent   = bgEnd;
  applyBgPreview();
  syncBgPresetSelected();
  showNotification('Background reset to default.');
}

// ── Logo handlers ──────────────────────────────────────────────
async function handleLogoUpload(e) {
  var file = e.target.files[0];
  if (!file) return;
  var validation = validateImageFile(file, 0.5);
  if (!validation.valid) {
    showStatus('logo-status', validation.error, 'error');
    e.target.value = '';
    return;
  }
  try {
    var dataUrl = await readFileAsDataUrl(file);
    currentLogoDataUrl = dataUrl;
    document.getElementById('logo-placeholder').style.display = 'none';
    var preview = document.getElementById('logo-preview');
    preview.src = dataUrl;
    preview.style.display = 'block';
  } catch (err) {
    showStatus('logo-status', 'Failed to read image: ' + err.message, 'error');
  }
}

async function handleSaveLogo() {
  var position = document.getElementById('logo-position').value;
  var size     = document.getElementById('logo-size').value;
  try {
    await saveConfig({ logo_url: currentLogoDataUrl || null, logo_position: position, logo_size: size });
    saveLogo({ url: currentLogoDataUrl || '', position, size });
    showNotification('Logo settings saved!');
  } catch (err) {
    if (err.message && err.message.includes('too large')) {
      showNotification('Image too large for storage. Try a smaller file.', true);
    } else {
      showNotification('Failed to save logo: ' + err.message, true);
    }
  }
}

async function handleRemoveLogo() {
  if (!confirm('Remove the organization logo?')) return;
  try {
    await saveConfig({ logo_url: null, logo_position: 'header-left', logo_size: 'medium' });
    deleteLogo();
    currentLogoDataUrl = null;
    document.getElementById('logo-upload').value = '';
    document.getElementById('logo-preview').style.display = 'none';
    document.getElementById('logo-placeholder').style.display = 'block';
    showNotification('Logo removed successfully!');
  } catch (err) {
    showNotification('Failed to remove logo: ' + err.message, true);
  }
}

// ── Danger zone ────────────────────────────────────────────────
function handleClearTimetable() {
  if (!confirm('Are you sure you want to clear all timetable data? This cannot be undone.')) return;
  localStorage.removeItem('timetable.data');
  showNotification('Timetable data cleared');
  setTimeout(function () {
    window.location.href = 'portal.html';
  }, 1000);
}

// ── Utility ────────────────────────────────────────────────────
function showStatus(elementId, message, type) {
  var el = document.getElementById(elementId);
  el.textContent = message;
  el.className = 'status-message ' + type;
  setTimeout(function () { el.className = 'status-message'; }, 5000);
}

// ── Event listeners ────────────────────────────────────────────
function setupEventListeners() {
  document.getElementById('color-primary').addEventListener('input', function (e) {
    currentPrimary = e.target.value;
    document.getElementById('primary-hex').textContent = currentPrimary;
    applyLivePreview();
  });

  document.getElementById('color-accent').addEventListener('input', function (e) {
    customAccent = e.target.value;
    document.getElementById('accent-hex').textContent = customAccent;
    applyLivePreview();
  });

  document.getElementById('mode-btn-light').addEventListener('click', function () { setModeToggle('light'); applyLivePreview(); });
  document.getElementById('mode-btn-dark').addEventListener('click',  function () { setModeToggle('dark');  applyLivePreview(); });

  document.getElementById('accent-btn-auto').addEventListener('click',   function () { setAccentToggle('auto');   applyLivePreview(); });
  document.getElementById('accent-btn-custom').addEventListener('click', function () { setAccentToggle('custom'); applyLivePreview(); });

  document.querySelectorAll('.preset-color').forEach(function (preset) {
    preset.addEventListener('click', function () {
      document.querySelectorAll('.preset-color').forEach(function (p) { p.classList.remove('selected'); });
      preset.classList.add('selected');
      currentPrimary = preset.dataset.primary;
      document.getElementById('color-primary').value    = currentPrimary;
      document.getElementById('primary-hex').textContent = currentPrimary;
      applyLivePreview();
    });
  });

  document.getElementById('save-colors-btn').addEventListener('click', handleSaveColors);
  document.getElementById('reset-colors-btn').addEventListener('click', handleResetColors);

  document.getElementById('bg-start').addEventListener('input', function (e) {
    bgStart = e.target.value;
    document.getElementById('bg-start-hex').textContent = bgStart;
    syncBgPresetSelected();
    applyBgPreview();
  });
  document.getElementById('bg-end').addEventListener('input', function (e) {
    bgEnd = e.target.value;
    document.getElementById('bg-end-hex').textContent = bgEnd;
    syncBgPresetSelected();
    applyBgPreview();
  });
  document.querySelectorAll('.bg-preset').forEach(function (preset) {
    preset.style.background = 'linear-gradient(135deg, ' + preset.dataset.start + ' 0%, ' + preset.dataset.end + ' 100%)';
    preset.addEventListener('click', function () {
      bgStart = preset.dataset.start;
      bgEnd   = preset.dataset.end;
      document.getElementById('bg-start').value        = bgStart;
      document.getElementById('bg-start-hex').textContent = bgStart;
      document.getElementById('bg-end').value          = bgEnd;
      document.getElementById('bg-end-hex').textContent   = bgEnd;
      syncBgPresetSelected();
      applyBgPreview();
    });
  });
  document.getElementById('save-bg-btn').addEventListener('click', handleSaveBg);
  document.getElementById('reset-bg-btn').addEventListener('click', handleResetBg);

  document.getElementById('logo-upload').addEventListener('change', handleLogoUpload);
  document.getElementById('save-logo-btn').addEventListener('click', handleSaveLogo);
  document.getElementById('remove-logo-btn').addEventListener('click', handleRemoveLogo);

  document.getElementById('clear-timetable-btn').addEventListener('click', handleClearTimetable);
}

// ── Init ───────────────────────────────────────────────────────
window.addEventListener('load', async function () {
  await window.authReady;

  // Update page chrome
  var backLink = document.querySelector('.back-link');
  if (backLink) {
    backLink.href        = 'portal.html';
    backLink.textContent = '← Back to Portal';
  }

  // Hide timetable-specific danger zone (no longer relevant)
  var dangerPanel = document.getElementById('danger-zone-panel');
  if (dangerPanel) dangerPanel.hidden = true;

  // Show "continue to portal" footer
  var continueBar = document.getElementById('user-mode-continue');
  if (continueBar) continueBar.hidden = false;

  const cfg = await loadConfigFromSupabase();
  loadThemeIntoForm(cfg);
  loadBgIntoForm(cfg);
  if (cfg) loadLogoIntoForm(cfg);
  setupEventListeners();
  applyLivePreview();

  document.body.style.visibility = 'visible';
});
