// ============================================
// AWS Cognito Authentication Module
// ============================================

// Token storage keys
const TOKEN_KEYS = {
  idToken: 'aws_id_token',
  accessToken: 'aws_access_token',
  refreshToken: 'aws_refresh_token',
  userEmail: 'aws_user_email',
  userRole: 'aws_user_role',
  schoolId: 'aws_school_id'
};

// ============================================
// Helper Functions
// ============================================

/**
 * Compute SECRET_HASH for Cognito API calls
 * Required when app client has a secret configured
 */
async function computeSecretHash(username) {
  const message = username + AWS_CONFIG.cognito.clientId;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(AWS_CONFIG.cognito.clientSecret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Decode JWT token payload
 */
function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch (e) {
    console.error('Failed to decode token:', e);
    return null;
  }
}

/**
 * Check if token is expired
 */
function isTokenExpired(token) {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;
  // Add 60 second buffer
  return Date.now() >= (payload.exp * 1000) - 60000;
}

// ============================================
// Authentication Functions
// ============================================

/**
 * Login with email and password
 * Uses USER_PASSWORD_AUTH flow
 */
async function cognitoLogin(email, password) {
  const secretHash = await computeSecretHash(email);

  const response = await fetch(
    `https://cognito-idp.${AWS_CONFIG.region}.amazonaws.com/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth'
      },
      body: JSON.stringify({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: AWS_CONFIG.cognito.clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
          SECRET_HASH: secretHash
        }
      })
    }
  );

  const data = await response.json();

  if (data.__type) {
    // Error response
    const errorType = data.__type.split('#')[1] || data.__type;
    const errorMessages = {
      'NotAuthorizedException': 'Incorrect email or password.',
      'UserNotFoundException': 'User not found. Please contact your administrator.',
      'UserNotConfirmedException': 'Account not verified. Please check your email.',
      'PasswordResetRequiredException': 'Password reset required. Please contact your administrator.',
      'InvalidParameterException': 'Invalid login details.',
      'TooManyRequestsException': 'Too many attempts. Please wait and try again.'
    };
    throw new Error(errorMessages[errorType] || data.message || 'Login failed.');
  }

  // Handle challenges (e.g., NEW_PASSWORD_REQUIRED)
  if (data.ChallengeName) {
    if (data.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
      throw new Error('Password change required. Please contact your administrator.');
    }
    throw new Error(`Authentication challenge: ${data.ChallengeName}`);
  }

  // Success - store tokens
  const result = data.AuthenticationResult;
  storeTokens(result, email);

  return {
    success: true,
    email: email,
    ...getUserFromTokens()
  };
}

/**
 * Store tokens in sessionStorage
 */
function storeTokens(authResult, email) {
  sessionStorage.setItem(TOKEN_KEYS.idToken, authResult.IdToken);
  sessionStorage.setItem(TOKEN_KEYS.accessToken, authResult.AccessToken);
  if (authResult.RefreshToken) {
    sessionStorage.setItem(TOKEN_KEYS.refreshToken, authResult.RefreshToken);
  }
  sessionStorage.setItem(TOKEN_KEYS.userEmail, email);

  // Extract user info from ID token
  const payload = decodeToken(authResult.IdToken);
  if (payload) {
    const role = payload['custom:role'] || 'viewer';
    const schoolId = payload['custom:schoolId'] || 'test-001';

    sessionStorage.setItem(TOKEN_KEYS.userRole, role);
    sessionStorage.setItem(TOKEN_KEYS.schoolId, schoolId);
  }
}

/**
 * Refresh the access token using refresh token
 */
async function refreshTokens() {
  const refreshToken = sessionStorage.getItem(TOKEN_KEYS.refreshToken);
  const email = sessionStorage.getItem(TOKEN_KEYS.userEmail);

  if (!refreshToken || !email) {
    throw new Error('No refresh token available');
  }

  const secretHash = await computeSecretHash(email);

  const response = await fetch(
    `https://cognito-idp.${AWS_CONFIG.region}.amazonaws.com/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth'
      },
      body: JSON.stringify({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: AWS_CONFIG.cognito.clientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
          SECRET_HASH: secretHash
        }
      })
    }
  );

  const data = await response.json();

  if (data.__type) {
    // Refresh failed - clear session and redirect to login
    clearSession();
    throw new Error('Session expired. Please log in again.');
  }

  // Update tokens (refresh token stays the same)
  const result = data.AuthenticationResult;
  sessionStorage.setItem(TOKEN_KEYS.idToken, result.IdToken);
  sessionStorage.setItem(TOKEN_KEYS.accessToken, result.AccessToken);

  // Update role/schoolId in case they changed
  const payload = decodeToken(result.IdToken);
  if (payload) {
    sessionStorage.setItem(TOKEN_KEYS.userRole, payload['custom:role'] || 'viewer');
    sessionStorage.setItem(TOKEN_KEYS.schoolId, payload['custom:schoolId'] || 'test-001');
  }

  return result;
}

/**
 * Get valid ID token (refreshes if needed)
 */
async function getValidIdToken() {
  let idToken = sessionStorage.getItem(TOKEN_KEYS.idToken);

  if (!idToken) {
    throw new Error('Not authenticated');
  }

  if (isTokenExpired(idToken)) {
    console.log('Token expired, refreshing...');
    await refreshTokens();
    idToken = sessionStorage.getItem(TOKEN_KEYS.idToken);
  }

  return idToken;
}

/**
 * Logout - clear all tokens
 */
function cognitoLogout() {
  clearSession();
  window.location.href = 'index.html';
}

/**
 * Clear all session data
 */
function clearSession() {
  Object.values(TOKEN_KEYS).forEach(key => {
    sessionStorage.removeItem(key);
  });
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
  const idToken = sessionStorage.getItem(TOKEN_KEYS.idToken);
  const refreshToken = sessionStorage.getItem(TOKEN_KEYS.refreshToken);

  // Has tokens and either ID token is valid or refresh token exists
  return idToken && (refreshToken || !isTokenExpired(idToken));
}

/**
 * Get current user info from stored tokens
 */
function getUserFromTokens() {
  return {
    email: sessionStorage.getItem(TOKEN_KEYS.userEmail),
    role: sessionStorage.getItem(TOKEN_KEYS.userRole) || 'viewer',
    schoolId: sessionStorage.getItem(TOKEN_KEYS.schoolId) || 'test-001'
  };
}

/**
 * Get current school ID
 */
function getCurrentSchoolId() {
  return sessionStorage.getItem(TOKEN_KEYS.schoolId) || 'test-001';
}

/**
 * Get current user role
 */
function getCurrentUserRole() {
  return sessionStorage.getItem(TOKEN_KEYS.userRole) || 'viewer';
}

/**
 * Get current user email
 */
function getCurrentUserEmail() {
  return sessionStorage.getItem(TOKEN_KEYS.userEmail);
}

/**
 * Check authentication and redirect if needed
 * @param {string} requiredRole - 'admin' or 'viewer' (viewer allows both)
 */
function checkAuthAndRedirect(requiredRole = 'viewer') {
  if (!isAuthenticated()) {
    window.location.href = 'index.html';
    return false;
  }

  const userRole = getCurrentUserRole();

  if (requiredRole === 'admin' && userRole !== 'admin') {
    alert('Access denied. Administrator privileges required.');
    window.location.href = 'view.html';
    return false;
  }

  return true;
}

// Legacy compatibility - handleLogout for onclick handlers
function handleLogout() {
  cognitoLogout();
}

console.log('aws-auth.js loaded');
