// config.js — Phase 5 theme picker
'use strict';

// ── State ──────────────────────────────────────────────────────
var currentMode        = ThemeEngine.DEFAULTS.mode;
var currentPrimary     = ThemeEngine.DEFAULTS.primary;
var accentMode         = 'auto';   // 'auto' | 'custom'
var customAccent       = ThemeEngine.DEFAULTS.accent;
var currentLogoDataUrl = null;

// ── Auto-accent: golden-angle hue rotation (137.5°) ────────────
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

// ── Live full-page preview ─────────────────────────────────────
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

// ── Palette swatch strip ───────────────────────────────────────
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

// ── Preview buttons ────────────────────────────────────────────
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

// ── Toggle helpers ─────────────────────────────────────────────
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

// ── Load saved theme into form ─────────────────────────────────
function loadThemeIntoForm() {
  var theme      = ThemeEngine.get();
  currentMode    = theme.mode    || ThemeEngine.DEFAULTS.mode;
  currentPrimary = theme.primary || ThemeEngine.DEFAULTS.primary;
  customAccent   = theme.accent  || ThemeEngine.DEFAULTS.accent;

  document.getElementById('color-primary').value     = currentPrimary;
  document.getElementById('primary-hex').textContent  = currentPrimary;
  document.getElementById('color-accent').value      = customAccent;
  document.getElementById('accent-hex').textContent   = customAccent;

  setModeToggle(currentMode);
  setAccentToggle('auto');

  document.querySelectorAll('.preset-color').forEach(function (p) {
    p.classList.toggle('selected', p.dataset.primary === currentPrimary);
  });
}

// ── Save & Reset ───────────────────────────────────────────────
function handleSaveColors() {
  var accent = resolvedAccent();
  ThemeEngine.save({ primary: currentPrimary, accent: accent, mode: currentMode });
  showNotification('Color theme saved!');
}

function handleResetColors() {
  if (!confirm('Reset colors to default theme?')) return;
  ThemeEngine.reset();
  loadThemeIntoForm();
  applyLivePreview();
  showNotification('Colors reset to default.');
}

// ── Logo management ────────────────────────────────────────────
function loadLogoIntoForm() {
  var logoSettings = loadLogo();
  if (!logoSettings) return;
  document.getElementById('logo-position').value = logoSettings.position || 'header-left';
  document.getElementById('logo-size').value     = logoSettings.size     || 'medium';
  if (logoSettings.url) {
    var preview = document.getElementById('logo-preview');
    preview.src = logoSettings.url;
    preview.style.display = 'block';
    document.getElementById('logo-placeholder').style.display = 'none';
    currentLogoDataUrl = logoSettings.url;
  }
}

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

function handleSaveLogo() {
  var position = document.getElementById('logo-position').value;
  var size     = document.getElementById('logo-size').value;
  try {
    saveLogo({ url: currentLogoDataUrl || '', position: position, size: size });
    showNotification('Logo settings saved!');
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      showNotification('Image too large for browser storage. Try a smaller file.', true);
    } else {
      showNotification('Error saving logo settings', true);
    }
  }
}

function handleRemoveLogo() {
  if (!confirm('Remove the organization logo?')) return;
  deleteLogo();
  currentLogoDataUrl = null;
  document.getElementById('logo-upload').value = '';
  document.getElementById('logo-preview').style.display = 'none';
  document.getElementById('logo-placeholder').style.display = 'block';
  showNotification('Logo removed successfully!');
}

// ── Danger zone ────────────────────────────────────────────────
function handleClearTimetable() {
  if (!confirm('Are you sure you want to clear all timetable data? This cannot be undone.')) return;
  localStorage.removeItem('timetable.data');
  showNotification('Timetable data cleared');
  setTimeout(function () { window.location.href = 'index.html'; }, 1000);
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

  document.getElementById('mode-btn-light').addEventListener('click', function () {
    setModeToggle('light'); applyLivePreview();
  });
  document.getElementById('mode-btn-dark').addEventListener('click', function () {
    setModeToggle('dark'); applyLivePreview();
  });

  document.getElementById('accent-btn-auto').addEventListener('click', function () {
    setAccentToggle('auto'); applyLivePreview();
  });
  document.getElementById('accent-btn-custom').addEventListener('click', function () {
    setAccentToggle('custom'); applyLivePreview();
  });

  document.querySelectorAll('.preset-color').forEach(function (preset) {
    preset.addEventListener('click', function () {
      document.querySelectorAll('.preset-color').forEach(function (p) { p.classList.remove('selected'); });
      preset.classList.add('selected');
      currentPrimary = preset.dataset.primary;
      document.getElementById('color-primary').value     = currentPrimary;
      document.getElementById('primary-hex').textContent  = currentPrimary;
      applyLivePreview();
    });
  });

  document.getElementById('save-colors-btn').addEventListener('click', handleSaveColors);
  document.getElementById('reset-colors-btn').addEventListener('click', handleResetColors);

  document.getElementById('logo-upload').addEventListener('change', handleLogoUpload);
  document.getElementById('save-logo-btn').addEventListener('click', handleSaveLogo);
  document.getElementById('remove-logo-btn').addEventListener('click', handleRemoveLogo);

  document.getElementById('clear-timetable-btn').addEventListener('click', handleClearTimetable);
}

// ── Init ───────────────────────────────────────────────────────
window.addEventListener('load', function () {
  loadThemeIntoForm();
  loadLogoIntoForm();
  setupEventListeners();
  applyLivePreview();
});
