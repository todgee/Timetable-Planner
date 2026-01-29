// ============================================
// AWS API Service Module
// ============================================

/**
 * Make an authenticated API request
 * Automatically includes JWT token and handles errors
 */
async function apiRequest(url, options = {}) {
  try {
    // Get valid token (refreshes if needed)
    const idToken = await getValidIdToken();

    // Setup headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
      ...options.headers
    };

    // Make request
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle specific error codes
      if (response.status === 401) {
        // Token invalid - clear session and redirect
        clearSession();
        window.location.href = 'index.html';
        throw new Error('Session expired. Please log in again.');
      }

      if (response.status === 403) {
        throw new Error('You don\'t have permission to perform this action.');
      }

      if (response.status === 404) {
        throw new Error('The requested resource was not found.');
      }

      throw new Error(errorData.message || `Request failed (${response.status})`);
    }

    // Parse JSON response
    const data = await response.json().catch(() => ({}));
    return data;

  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// ============================================
// Timetable API
// ============================================

/**
 * Load timetable data for the current school
 */
async function loadTimetable() {
  const schoolId = getCurrentSchoolId();
  const url = API_ENDPOINTS.getTimetable(schoolId);

  const response = await apiRequest(url, { method: 'GET' });
  return response;
}

/**
 * Save timetable data for the current school
 */
async function saveTimetable(timetableData) {
  const schoolId = getCurrentSchoolId();
  const url = API_ENDPOINTS.saveTimetable(schoolId);

  const response = await apiRequest(url, {
    method: 'PUT',
    body: JSON.stringify({
      peopleList: timetableData.peopleList || [],
      classList: timetableData.classList || [],
      classColors: timetableData.classColors || {},
      assignments: timetableData.assignments || {},
      timeSlots: timetableData.timeSlots || [],
      updatedBy: getCurrentUserEmail(),
      updatedAt: new Date().toISOString()
    })
  });

  return response;
}

// ============================================
// Theme API
// ============================================

/**
 * Load theme settings for the current school
 */
async function loadTheme() {
  const schoolId = getCurrentSchoolId();
  const url = API_ENDPOINTS.getTheme(schoolId);

  try {
    const response = await apiRequest(url, { method: 'GET' });
    return response;
  } catch (error) {
    // Return defaults if no theme found
    if (error.message.includes('not found')) {
      return {
        primary: '#2c5f4f',
        primaryLight: '#3d7861',
        accent: '#d4a574'
      };
    }
    throw error;
  }
}

/**
 * Save theme settings for the current school
 */
async function saveTheme(themeData) {
  const schoolId = getCurrentSchoolId();
  const url = API_ENDPOINTS.saveTheme(schoolId);

  const response = await apiRequest(url, {
    method: 'PUT',
    body: JSON.stringify({
      primary: themeData.primary,
      primaryLight: themeData.primaryLight,
      accent: themeData.accent,
      updatedBy: getCurrentUserEmail(),
      updatedAt: new Date().toISOString()
    })
  });

  return response;
}

// ============================================
// Logo API
// ============================================

/**
 * Load logo settings for the current school
 */
async function loadLogo() {
  const schoolId = getCurrentSchoolId();
  const url = API_ENDPOINTS.getLogo(schoolId);

  try {
    const response = await apiRequest(url, { method: 'GET' });
    return response;
  } catch (error) {
    // Return null if no logo found
    if (error.message.includes('not found')) {
      return null;
    }
    throw error;
  }
}

/**
 * Save logo settings for the current school
 */
async function saveLogo(logoData) {
  const schoolId = getCurrentSchoolId();
  const url = API_ENDPOINTS.saveLogo(schoolId);

  const response = await apiRequest(url, {
    method: 'PUT',
    body: JSON.stringify({
      url: logoData.url,
      position: logoData.position || 'header-left',
      size: logoData.size || 'medium',
      uploadedBy: getCurrentUserEmail(),
      uploadedAt: new Date().toISOString()
    })
  });

  return response;
}

/**
 * Delete logo for the current school
 */
async function deleteLogo() {
  const schoolId = getCurrentSchoolId();
  const url = API_ENDPOINTS.deleteLogo(schoolId);

  const response = await apiRequest(url, { method: 'DELETE' });
  return response;
}

// ============================================
// Users API
// ============================================

/**
 * List all users for the current school
 */
async function listUsers() {
  const schoolId = getCurrentSchoolId();
  const url = API_ENDPOINTS.listUsers(schoolId);

  const response = await apiRequest(url, { method: 'GET' });
  return response.users || [];
}

/**
 * Create a new user for the current school
 */
async function createUser(email, password, role) {
  const schoolId = getCurrentSchoolId();
  const url = API_ENDPOINTS.createUser(schoolId);

  const response = await apiRequest(url, {
    method: 'POST',
    body: JSON.stringify({
      email: email,
      password: password,
      role: role,
      createdBy: getCurrentUserEmail()
    })
  });

  return response;
}

/**
 * Delete a user from the current school
 */
async function deleteUser(email) {
  const schoolId = getCurrentSchoolId();
  const url = API_ENDPOINTS.deleteUser(schoolId, email);

  const response = await apiRequest(url, { method: 'DELETE' });
  return response;
}

// ============================================
// Utility Functions
// ============================================

// Note: showNotification is defined in shared.js

/**
 * Format error message for display
 */
function formatErrorMessage(error) {
  const message = error.message || 'An error occurred';

  // Map technical errors to user-friendly messages
  const errorMap = {
    'Failed to fetch': 'Network error. Please check your connection.',
    'Session expired': 'Your session expired. Please log in again.',
    'NetworkError': 'Network error. Please check your connection.'
  };

  for (const [key, value] of Object.entries(errorMap)) {
    if (message.includes(key)) {
      return value;
    }
  }

  return message;
}

console.log('aws-api.js loaded');
