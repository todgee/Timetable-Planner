// ============================================
// Shared Utilities
// Used by admin.html, view.html, and config.html
// ============================================

// Note: AWS configuration is in aws-config.js
// Note: Authentication is in aws-auth.js
// Note: API calls are in aws-api.js
// Note: S3 storage is in aws-storage.js

// ============================================
// Constants
// ============================================

/**
 * Days of the week for timetable
 */
const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

/**
 * Default colors for class assignments
 */
const defaultColors = [
  '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#E91E63',
  '#00BCD4', '#FF5722', '#795548', '#607D8B', '#3F51B5',
  '#8BC34A', '#FFC107', '#673AB7', '#009688', '#F44336'
];

// ============================================
// Notification Utilities
// ============================================

/**
 * Show a notification message to the user
 * @param {string} message - The message to display
 * @param {boolean} isError - Whether this is an error message
 */
function showNotification(message, isError = false) {
  // Remove existing notification if any
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

  // Add animation keyframes if not exists
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

  // Remove after 3 seconds
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

/**
 * Convert 24-hour time to 12-hour format
 */
function formatTime12Hour(time24) {
  if (!time24 || typeof time24 !== 'string') {
    console.error('Invalid time passed to formatTime12Hour:', time24);
    return 'Invalid Time';
  }

  const parts = time24.split(':');
  if (parts.length !== 2) {
    console.error('Invalid time format:', time24);
    return time24;
  }

  const [hours, minutes] = parts.map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    console.error('Non-numeric time values:', time24);
    return time24;
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Convert 24-hour time string to minutes
 */
function timeToMinutes(time24) {
  const parts = time24.split(':');
  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  return hours * 60 + minutes;
}

/**
 * Convert minutes to 24-hour time string
 */
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// ============================================
// Color Utilities
// ============================================

/**
 * Lighten a hex color by a percentage
 */
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

/**
 * Darken a hex color by a percentage
 */
function darkenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// ============================================
// Backward Compatibility Wrappers
// These wrap the new AWS functions for existing code
// ============================================

/**
 * Check authentication (wraps checkAuthAndRedirect)
 * @deprecated Use checkAuthAndRedirect from aws-auth.js
 */
function checkAuth(requiredRole) {
  return checkAuthAndRedirect(requiredRole);
}

/**
 * Get current user info
 * @deprecated Use getUserFromTokens from aws-auth.js
 */
function getCurrentUser() {
  return getUserFromTokens();
}

// ============================================
// Legacy Firebase Function Wrappers
// These maintain backward compatibility with existing code
// ============================================

/**
 * Load timetable from Firebase (now uses AWS)
 * @deprecated Use loadTimetable from aws-api.js
 */
async function loadFromFirebase() {
  const data = await loadTimetable();
  // Wrap in Firebase-like response
  return {
    val: () => data,
    exists: () => data !== null
  };
}

/**
 * Save timetable to Firebase (now uses AWS)
 * @deprecated Use saveTimetable from aws-api.js
 */
async function saveToFirebase(timetableData) {
  return saveTimetable(timetableData);
}

/**
 * Load theme colors (now uses AWS)
 * @deprecated Use loadTheme from aws-api.js
 */
async function loadThemeColors() {
  const data = await loadTheme();
  return {
    val: () => data,
    exists: () => data !== null
  };
}

/**
 * Save theme colors (now uses AWS)
 * @deprecated Use saveTheme from aws-api.js
 */
async function saveThemeColors(colors, updatedBy) {
  return saveTheme(colors);
}

/**
 * Reset theme to default (now uses AWS)
 */
async function resetThemeToDefault(updatedBy) {
  return saveTheme({
    primary: '#2c5f4f',
    primaryLight: '#3d7861',
    accent: '#d4a574'
  });
}

/**
 * Load logo settings (now uses AWS)
 * @deprecated Use loadLogo from aws-api.js
 */
async function loadLogoSettings() {
  const data = await loadLogo();
  return {
    val: () => data,
    exists: () => data !== null
  };
}

/**
 * Upload logo to storage (now uses AWS S3)
 * @deprecated Use uploadFileToS3 from aws-storage.js
 */
async function uploadLogoToStorage(file) {
  return uploadFileToS3(file);
}

/**
 * Save logo settings (now uses AWS)
 * @deprecated Use saveLogo from aws-api.js
 */
async function saveLogoSettings(logoUrl, position, size, uploadedBy) {
  return saveLogo({
    url: logoUrl,
    position: position,
    size: size
  });
}

/**
 * Update logo position (now uses AWS)
 */
async function updateLogoPosition(position, size, updatedBy) {
  const current = await loadLogo();
  return saveLogo({
    url: current?.url || '',
    position: position,
    size: size
  });
}

/**
 * Load all users (now uses AWS)
 * @deprecated Use listUsers from aws-api.js
 */
async function loadAllUsers() {
  const users = await listUsers();
  // Convert array to Firebase-like object format
  const usersObj = {};
  users.forEach((user, index) => {
    usersObj[user.email || index] = user;
  });
  return {
    val: () => usersObj,
    exists: () => users.length > 0
  };
}

/**
 * Create user account (now uses AWS Cognito)
 * @deprecated Use createUser from aws-api.js
 */
async function createUserAccount(email, password, role, createdBy) {
  return createUser(email, password, role);
}

/**
 * Remove user from database (now uses AWS)
 * @deprecated Use deleteUser from aws-api.js
 */
async function removeUserFromDatabase(uid) {
  // In AWS, we use email instead of UID
  // The uid parameter might be an email in the new system
  return deleteUser(uid);
}

// ============================================
// Initialize empty timetable if needed
// ============================================

/**
 * Initialize empty timetable structure
 */
async function initializeEmptyTimetable() {
  try {
    const existing = await loadTimetable();
    if (!existing || !existing.peopleList) {
      await saveTimetable({
        peopleList: [],
        classList: [],
        classColors: {},
        assignments: {
          monday: {},
          tuesday: {},
          wednesday: {},
          thursday: {},
          friday: {}
        },
        timeSlots: []
      });
    }
  } catch (error) {
    // If 404, create new timetable
    if (error.message.includes('not found')) {
      await saveTimetable({
        peopleList: [],
        classList: [],
        classColors: {},
        assignments: {
          monday: {},
          tuesday: {},
          wednesday: {},
          thursday: {},
          friday: {}
        },
        timeSlots: []
      });
    }
  }
}

// Legacy alias
const initializeEmptyFirebase = initializeEmptyTimetable;

console.log('shared.js loaded (AWS version)');
