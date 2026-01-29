// ============================================
// AWS Configuration
// ============================================

const AWS_CONFIG = {
  // Region
  region: 'ap-southeast-2',

  // Cognito User Pool
  cognito: {
    userPoolId: 'ap-southeast-2_delv1eC9x',
    clientId: 'trf3t5k7ho8i7m0gpkdtsda53',
    clientSecret: '1r0kn4c50rtfov89faigkmigtj8j8meps0bu560r8l6ce3v299lp'
  },

  // API Gateway
  api: {
    baseUrl: 'https://crchrpofj8.execute-api.ap-southeast-2.amazonaws.com/prod'
  },

  // S3 Storage
  s3: {
    bucket: 'timetable-planner-assets-564766583099',
    region: 'ap-southeast-2'
  },

  // DynamoDB (for reference - accessed via API)
  dynamodb: {
    tableName: 'TimetablePlanner'
  }
};

// API Endpoints
const API_ENDPOINTS = {
  // Timetable
  getTimetable: (schoolId) => `${AWS_CONFIG.api.baseUrl}/timetable/${schoolId}`,
  saveTimetable: (schoolId) => `${AWS_CONFIG.api.baseUrl}/timetable/${schoolId}`,

  // Theme
  getTheme: (schoolId) => `${AWS_CONFIG.api.baseUrl}/theme/${schoolId}`,
  saveTheme: (schoolId) => `${AWS_CONFIG.api.baseUrl}/theme/${schoolId}`,

  // Logo
  getLogo: (schoolId) => `${AWS_CONFIG.api.baseUrl}/logo/${schoolId}`,
  saveLogo: (schoolId) => `${AWS_CONFIG.api.baseUrl}/logo/${schoolId}`,
  deleteLogo: (schoolId) => `${AWS_CONFIG.api.baseUrl}/logo/${schoolId}`,

  // Users
  listUsers: (schoolId) => `${AWS_CONFIG.api.baseUrl}/users/${schoolId}`,
  createUser: (schoolId) => `${AWS_CONFIG.api.baseUrl}/users/${schoolId}`,
  deleteUser: (schoolId, email) => `${AWS_CONFIG.api.baseUrl}/users/${schoolId}/${encodeURIComponent(email)}`,

  // Upload
  getUploadUrl: () => `${AWS_CONFIG.api.baseUrl}/upload-url`
};

// Default colors (same as before)
const defaultColors = [
  '#4ade80', '#60d5f5', '#f59e0b', '#a78bfa', '#fb923c',
  '#f472b6', '#34d399', '#fbbf24', '#818cf8', '#fb7185'
];

// Days array
const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

console.log('aws-config.js loaded');
