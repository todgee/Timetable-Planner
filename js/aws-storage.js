// ============================================
// AWS S3 Storage Module
// ============================================

/**
 * Get a presigned URL for uploading a file to S3
 */
async function getPresignedUploadUrl(filename, contentType) {
  const schoolId = getCurrentSchoolId();
  const url = API_ENDPOINTS.getUploadUrl();

  const response = await apiRequest(url, {
    method: 'POST',
    body: JSON.stringify({
      schoolId: schoolId,
      filename: filename,
      contentType: contentType
    })
  });

  return response;
}

/**
 * Upload a file to S3 using a presigned URL
 * @param {File} file - The file to upload
 * @param {Function} onProgress - Optional progress callback (0-100)
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
async function uploadFileToS3(file, onProgress = null) {
  // Validate file
  if (!file) {
    throw new Error('No file provided');
  }

  // Check file size (max 5MB for logos)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('File size exceeds 5MB limit');
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload an image (JPEG, PNG, GIF, SVG, or WebP)');
  }

  try {
    // Get presigned URL from API
    const { uploadUrl, fileUrl, key } = await getPresignedUploadUrl(file.name, file.type);

    // Upload file directly to S3
    await uploadToPresignedUrl(uploadUrl, file, onProgress);

    // Return the public URL
    return fileUrl;

  } catch (error) {
    console.error('S3 upload failed:', error);
    throw new Error('Failed to upload file. Please try again.');
  }
}

/**
 * Upload file to S3 using presigned URL with progress tracking
 */
function uploadToPresignedUrl(presignedUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });
    }

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed. Please check your connection.'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was cancelled'));
    });

    // Send request
    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

/**
 * Upload a logo for the current school
 * Combines S3 upload with saving logo settings to DynamoDB
 */
async function uploadLogo(file, position = 'header-left', size = 'medium', onProgress = null) {
  // Upload to S3
  const logoUrl = await uploadFileToS3(file, onProgress);

  // Save logo settings to DynamoDB
  await saveLogo({
    url: logoUrl,
    position: position,
    size: size
  });

  return logoUrl;
}

/**
 * Delete the logo for the current school
 * Removes from both S3 and DynamoDB
 */
async function removeLogo() {
  await deleteLogo();
  return true;
}

/**
 * Read a file as a data URL (for preview)
 */
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Validate an image file
 * @returns {Object} - { valid: boolean, error: string|null }
 */
function validateImageFile(file, maxSizeMB = 5) {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  // Check type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Please select an image file (JPEG, PNG, GIF, SVG, or WebP)' };
  }

  // Check size
  const maxSize = maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }

  return { valid: true, error: null };
}

/**
 * Get human-readable file size
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

console.log('aws-storage.js loaded');
