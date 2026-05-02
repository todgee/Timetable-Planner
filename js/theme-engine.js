/**
 * theme-engine.js — Design-token palette generation and theme application
 *
 * Replaces theme-loader.js. Auto-applies the saved theme on every page
 * load with no flash, and exposes ThemeEngine for the config/theme picker.
 *
 * Public API  (window.ThemeEngine)
 * ─────────────────────────────────
 *   ThemeEngine.apply(config)            Apply a theme without saving
 *   ThemeEngine.save(config)             Persist to localStorage
 *   ThemeEngine.get()                    Read saved config (with defaults)
 *   ThemeEngine.reset()                  Restore factory defaults
 *   ThemeEngine.buildPalette(hex, mode)  Compute all tokens for one color
 *   ThemeEngine.DEFAULTS                 Default config object
 */
(function (global) {
  'use strict';

  /* ── Storage ─────────────────────────────────────────────── */

  var STORAGE_KEY = 'timetable.theme';

  var DEFAULTS = {
    primary: '#2c5f4f',
    accent:  '#d4a574',
    mode:    'dark'     // 'light' | 'dark'
  };

  /* ── Color math ──────────────────────────────────────────── */

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  /** hex → { h 0-360, s 0-100, l 0-100 } */
  function hexToHsl(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255;
    var g = parseInt(hex.slice(3, 5), 16) / 255;
    var b = parseInt(hex.slice(5, 7), 16) / 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var delta = max - min;
    var h = 0, s = 0;
    var l = (max + min) / 2;
    if (delta !== 0) {
      s = delta / (1 - Math.abs(2 * l - 1));
      if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / delta + 2) / 6;
      else h = ((r - g) / delta + 4) / 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  /** hsl (0-360, 0-100, 0-100) → "#rrggbb" */
  function hslToHex(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    var r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return '#' + [r, g, b]
      .map(function (x) { return Math.round(x * 255).toString(16).padStart(2, '0'); })
      .join('');
  }

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  /** hex + alpha → "rgba(r, g, b, a)" */
  function alpha(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
  }

  /* ── Palette generation ──────────────────────────────────── */

  /**
   * From one hex + mode, compute all brand or accent CSS token values.
   * Returns a plain { '--token-name': value } object ready for setProperty.
   *
   * Light mode:  400 is a soft hover tint;  fills are very light.
   * Dark mode:   400 is a bright readable tint; fills are more opaque.
   */
  function buildPalette(hex, mode, prefix) {
    var isDark = mode === 'dark';
    var hsl = hexToHsl(hex);
    var h = hsl.h, s = hsl.s, l = hsl.l;

    /* The "light" variant needs to be readable as text on dark surfaces,
       so we push lightness much higher in dark mode. */
    var l400 = isDark ? clamp(l + 38, 0, 88) : clamp(l + 10, 0, 90);
    var l600 = isDark ? clamp(l - 10, 5, 95) : clamp(l -  8, 5, 95);

    /* Fills use alpha so they blend correctly over any surface. */
    var fillA     = isDark ? 0.25 : 0.08;
    var fillMidA  = isDark ? 0.35 : 0.18;
    var glowA     = isDark ? 0.40 : 0.30;

    var tokens = {};
    tokens['--' + prefix + '-500']      = hex;
    tokens['--' + prefix + '-400']      = hslToHex(h, clamp(s, 0, 80), l400);
    tokens['--' + prefix + '-600']      = hslToHex(h, clamp(s, 0, 100), l600);
    tokens['--' + prefix + '-fill']     = alpha(hex, fillA);
    tokens['--' + prefix + '-fill-mid'] = alpha(hex, fillMidA);
    tokens['--' + prefix + '-glow']     = alpha(hex, glowA);
    return tokens;
  }

  /* ── Apply ───────────────────────────────────────────────── */

  function apply(config) {
    var primary = (config && config.primary) || DEFAULTS.primary;
    var accent  = (config && config.accent)  || DEFAULTS.accent;
    var mode    = (config && config.mode)    || DEFAULTS.mode;
    var root    = document.documentElement;

    /* 1. Set data-theme so [data-theme="dark"] CSS block activates */
    root.setAttribute('data-theme', mode);

    /* 2. Write brand tokens (inline style overrides tokens.css :root) */
    var brand = buildPalette(primary, mode, 'brand');
    for (var bk in brand) root.style.setProperty(bk, brand[bk]);

    /* 3. Write accent tokens */
    var acc = buildPalette(accent, mode, 'accent');
    /* accent-fill-mid isn't a separate token — drop it */
    delete acc['--accent-fill-mid'];
    for (var ak in acc) root.style.setProperty(ak, acc[ak]);

    /* 4. Keep backwards-compatible aliases in sync */
    root.style.setProperty('--primary',       primary);
    root.style.setProperty('--primary-light', brand['--brand-400']);
    root.style.setProperty('--primary-dark',  brand['--brand-600']);
    root.style.setProperty('--accent',        accent);

    /* 5. Apply logo and background if saved */
    applyLogo();
    applyBg();
  }

  /* ── Storage ─────────────────────────────────────────────── */

  function get() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? Object.assign({}, DEFAULTS, JSON.parse(raw)) : Object.assign({}, DEFAULTS);
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  function save(config) {
    try {
      var payload = {
        primary: config.primary || DEFAULTS.primary,
        accent:  config.accent  || DEFAULTS.accent,
        mode:    config.mode    || DEFAULTS.mode
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return payload;
    } catch (e) {
      return config;
    }
  }

  function reset() {
    return save(DEFAULTS);
  }

  /* ── Logo (carried over from theme-loader.js) ────────────── */

  function applyLogo() {
    try {
      var raw = localStorage.getItem('timetable.logo');
      if (!raw) return;
      var logoSettings = JSON.parse(raw);
      if (!logoSettings || !logoSettings.url) return;

      var header = document.querySelector('header');
      if (!header) return;

      var container = document.getElementById('app-logo-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'app-logo-container';
        container.style.cssText = [
          'margin-bottom:1rem',
          'display:flex',
          'justify-content:' + justifyLogo(logoSettings.position)
        ].join(';');
        header.insertBefore(container, header.firstChild);
      }

      var img = container.querySelector('img') || document.createElement('img');
      img.id  = 'app-logo';
      img.alt = 'Organization Logo';
      var sizeMap = { small: '80px', medium: '100px', large: '120px' };
      img.style.maxHeight  = sizeMap[logoSettings.size] || '100px';
      img.style.maxWidth   = '300px';
      img.style.objectFit  = 'contain';
      img.src = logoSettings.url;
      if (!img.parentNode) container.appendChild(img);
    } catch (e) {}
  }

  function justifyLogo(position) {
    if (position === 'header-center') return 'center';
    if (position === 'header-right')  return 'flex-end';
    return 'flex-start';
  }

  /* ── Background gradient ─────────────────────────────────── */

  var BG_STORAGE_KEY     = 'timetable.bg';
  var BG_STORAGE_KEY_OLD = 'timetable.config-bg'; // backwards compat

  function applyBg() {
    if (!document.body) return;
    try {
      var raw = localStorage.getItem(BG_STORAGE_KEY)
             || localStorage.getItem(BG_STORAGE_KEY_OLD);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (!saved || !saved.start || !saved.end) return;
      document.body.style.background =
        'linear-gradient(135deg, ' + saved.start + ' 0%, ' + saved.end + ' 100%)';
    } catch (e) {}
  }

  function saveBg(config) {
    try {
      localStorage.setItem(BG_STORAGE_KEY, JSON.stringify({
        start: config.start,
        end:   config.end
      }));
    } catch (e) {}
  }

  function getBg() {
    try {
      var raw = localStorage.getItem(BG_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function resetBg() {
    localStorage.removeItem(BG_STORAGE_KEY);
    if (document.body) document.body.style.background = '';
  }

  /* ── Auto-init ───────────────────────────────────────────── */

  /* Apply color tokens immediately (before first paint) — no DOM needed.
     Logo and bg injection need the DOM — defer to DOMContentLoaded.
     window.load is a second safety net that runs after all page scripts. */
  apply(get());

  function applyDom() {
    applyLogo();
    applyBg();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyDom);
  } else {
    applyDom();
  }

  window.addEventListener('load', applyBg);

  /* ── Public API ──────────────────────────────────────────── */

  global.ThemeEngine = {
    apply:        apply,
    save:         save,
    get:          get,
    reset:        reset,
    buildPalette: buildPalette,
    hexToHsl:     hexToHsl,
    hslToHex:     hslToHex,
    saveBg:       saveBg,
    getBg:        getBg,
    resetBg:      resetBg,
    DEFAULTS:     Object.assign({}, DEFAULTS)
  };

}(window));
