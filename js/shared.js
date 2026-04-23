// ============================================
// Shared Utilities (localStorage-backed)
// Used by admin.html, view.html, config.html, setup.html
// ============================================

const STORAGE_KEYS = {
  timetable: 'timetable.data',
  theme: 'timetable.theme',
  logo: 'timetable.logo'
};

const defaultColors = [
  '#4ade80', '#60d5f5', '#f59e0b', '#a78bfa', '#fb923c',
  '#f472b6', '#34d399', '#fbbf24', '#818cf8', '#fb7185'
];

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

const DEFAULT_THEME = {
  primary: '#2c5f4f',
  primaryLight: '#3d7861',
  accent: '#d4a574'
};

// ============================================
// Notification Utilities
// ============================================
function showNotification(message, isError = false) {
  const existing = document.querySelector('.notification-toast');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = 'notification-toast';
  notification.style.cssText = `
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    padding: 1rem 2rem;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    animation: slideUp 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    background: ${isError ? 'var(--error, #dc3545)' : 'var(--success, #28a745)'};
  `;
  notification.textContent = message;

  if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideUp {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(-50%) translateY(20px)';
    notification.style.transition = 'all 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ============================================
// Time Formatting Utilities
// ============================================
function formatTime12Hour(time24) {
  if (!time24 || typeof time24 !== 'string') {
    return 'Invalid Time';
  }

  const parts = time24.split(':');
  if (parts.length !== 2) return time24;

  const [hours, minutes] = parts.map(Number);
  if (isNaN(hours) || isNaN(minutes)) return time24;

  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function timeToMinutes(time24) {
  const [hours, minutes] = time24.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// ============================================
// Color Utilities
// ============================================
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function darkenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// ============================================
// Storage helpers
// ============================================
function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error(`Failed to parse ${key}:`, e);
    return null;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ============================================
// Timetable data layer
// ============================================
function loadTimetable() {
  return readJSON(STORAGE_KEYS.timetable);
}

function saveTimetable(timetableData) {
  const payload = {
    version: '1.0',
    setupComplete: timetableData.setupComplete !== false,
    peopleList: timetableData.peopleList || [],
    classList: timetableData.classList || [],
    classColors: timetableData.classColors || {},
    assignments: timetableData.assignments || {
      monday: {}, tuesday: {}, wednesday: {}, thursday: {}, friday: {}
    },
    timeSlots: timetableData.timeSlots || [],
    updatedAt: new Date().toISOString()
  };
  writeJSON(STORAGE_KEYS.timetable, payload);
  return payload;
}

function hasTimetable() {
  const data = loadTimetable();
  return !!(data && data.setupComplete &&
    ((data.peopleList && data.peopleList.length > 0) ||
     (data.classList && data.classList.length > 0)));
}

// ============================================
// Backup import/export
// ============================================
const SUPPORTED_BACKUP_VERSIONS = ['1.0'];

function parseTimetableBackup(jsonText) {
  let raw;
  try {
    raw = JSON.parse(jsonText);
  } catch (e) {
    throw new Error('File is not valid JSON.');
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error("File doesn't look like a timetable backup.");
  }

  if (!raw.version) {
    throw new Error('Missing "version" field — this may not be a timetable backup.');
  }

  if (!SUPPORTED_BACKUP_VERSIONS.includes(raw.version)) {
    throw new Error(
      `Backup version "${raw.version}" is not supported by this app ` +
      `(supported: ${SUPPORTED_BACKUP_VERSIONS.join(', ')}).`
    );
  }

  const requiredShape = {
    peopleList: Array.isArray,
    classList: Array.isArray,
    classColors: (v) => v && typeof v === 'object' && !Array.isArray(v),
    timeSlots: Array.isArray,
  };
  for (const [key, check] of Object.entries(requiredShape)) {
    if (!check(raw[key])) {
      throw new Error(`Backup is missing or has an invalid "${key}" field.`);
    }
  }

  const assignments = raw.assignments && typeof raw.assignments === 'object'
    ? raw.assignments : {};
  const normalizedAssignments = {};
  days.forEach((day) => {
    normalizedAssignments[day] = assignments[day] && typeof assignments[day] === 'object'
      ? assignments[day] : {};
  });

  return {
    version: raw.version,
    savedDate: raw.savedDate || null,
    peopleList: raw.peopleList.slice(),
    classList: raw.classList.slice(),
    classColors: { ...raw.classColors },
    assignments: normalizedAssignments,
    timeSlots: raw.timeSlots.map((s) => ({
      start: s && s.start,
      end: s && s.end,
      type: (s && s.type) || 'class',
    })),
  };
}

function buildTimetableBackup(state) {
  return {
    version: '1.0',
    savedDate: new Date().toISOString(),
    peopleList: state.peopleList || [],
    classList: state.classList || [],
    classColors: state.classColors || {},
    assignments: state.assignments || {},
    timeSlots: state.timeSlots || [],
  };
}

function downloadTimetableBackup(state) {
  const payload = buildTimetableBackup(state);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Timetable_Backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function initializeEmptyTimetable() {
  if (!loadTimetable()) {
    saveTimetable({
      setupComplete: false,
      peopleList: [],
      classList: [],
      classColors: {},
      assignments: {
        monday: {}, tuesday: {}, wednesday: {}, thursday: {}, friday: {}
      },
      timeSlots: []
    });
  }
}

// ============================================
// Theme data layer
// ============================================
function loadTheme() {
  return readJSON(STORAGE_KEYS.theme) || { ...DEFAULT_THEME };
}

function saveTheme(themeData) {
  const payload = {
    primary: themeData.primary || DEFAULT_THEME.primary,
    primaryLight: themeData.primaryLight || DEFAULT_THEME.primaryLight,
    accent: themeData.accent || DEFAULT_THEME.accent
  };
  writeJSON(STORAGE_KEYS.theme, payload);
  return payload;
}

function resetTheme() {
  return saveTheme(DEFAULT_THEME);
}

// ============================================
// Logo data layer (stores image as data URL)
// ============================================
function loadLogo() {
  return readJSON(STORAGE_KEYS.logo);
}

function saveLogo(logoData) {
  const payload = {
    url: logoData.url || '',
    position: logoData.position || 'header-left',
    size: logoData.size || 'medium'
  };
  writeJSON(STORAGE_KEYS.logo, payload);
  return payload;
}

function deleteLogo() {
  localStorage.removeItem(STORAGE_KEYS.logo);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function validateImageFile(file, maxSizeMB = 5) {
  if (!file) return { valid: false, error: 'No file selected' };

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Please select an image file (JPEG, PNG, GIF, SVG, or WebP)' };
  }

  const maxSize = maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }

  return { valid: true, error: null };
}

console.log('shared.js loaded');
