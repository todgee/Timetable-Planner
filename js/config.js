// ============================================
// Config Page JavaScript
// ============================================

let currentUser = null;
let currentUserRole = null;
let currentLogoFile = null;

// Color input references
const colorInputs = {
  primary: null,
  primaryLight: null,
  accent: null,
};

const hexDisplays = {
  primary: null,
  primaryLight: null,
  accent: null,
};

// ============================================
// Authentication Check (AWS Cognito)
// ============================================
window.addEventListener("load", () => {
  // Check if user is authenticated with AWS Cognito
  if (!isAuthenticated()) {
    alert("Please log in first.");
    window.location.href = "index.html";
    return;
  }

  // Get user info from AWS Cognito
  currentUserRole = getCurrentUserRole();
  const storedEmail = sessionStorage.getItem("userEmail");

  if (currentUserRole !== "admin") {
    alert("Access denied. Only administrators can access configuration settings.");
    window.location.href = currentUserRole === "viewer" ? "view.html" : "admin.html";
    return;
  }

  console.log("Admin access granted to:", storedEmail);

  // Set current user object for compatibility
  currentUser = { email: storedEmail };

  // Initialize the page
  initializePage();
});

function initializePage() {
  // Initialize color input references
  colorInputs.primary = document.getElementById("color-primary");
  colorInputs.primaryLight = document.getElementById("color-primary-light");
  colorInputs.accent = document.getElementById("color-accent");

  hexDisplays.primary = document.getElementById("primary-hex");
  hexDisplays.primaryLight = document.getElementById("primary-light-hex");
  hexDisplays.accent = document.getElementById("accent-hex");

  // Setup event listeners
  setupEventListeners();

  // Load data
  loadAccounts();
  loadTheme();
  loadLogo();

  // Initial theme preview
  updateThemePreview();
}

// ============================================
// Account Management
// ============================================
function loadAccounts() {
  loadAllUsers()
    .then((snapshot) => {
      const users = snapshot.val();
      renderAccountList(users);
    })
    .catch((error) => {
      console.error("Error loading accounts:", error);
      showNotification("Error loading accounts", true);
    });
}

function renderAccountList(users) {
  const container = document.getElementById("accountListContainer");

  if (!users) {
    container.innerHTML =
      '<div class="account-item"><div class="account-info">No accounts found</div></div>';
    return;
  }

  const fragment = document.createDocumentFragment();

  Object.keys(users).forEach((uid) => {
    const user = users[uid];

    const itemDiv = document.createElement("div");
    itemDiv.className = "account-item";
    itemDiv.dataset.uid = uid;

    const infoDiv = document.createElement("div");
    infoDiv.className = "account-info";

    const emailSpan = document.createElement("span");
    emailSpan.className = "account-email";
    emailSpan.textContent = user.email || "Unknown email";

    const roleSpan = document.createElement("span");
    roleSpan.className = `account-role ${user.role === "admin" ? "admin" : ""}`;
    roleSpan.textContent =
      user.role === "admin" ? "Administrator" : "ESO Staff (Viewer)";

    infoDiv.appendChild(emailSpan);
    infoDiv.appendChild(roleSpan);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Remove";
    deleteBtn.title = "Remove account";
    deleteBtn.onclick = () => handleRemoveAccount(uid, user.email);

    itemDiv.appendChild(infoDiv);
    itemDiv.appendChild(deleteBtn);
    fragment.appendChild(itemDiv);
  });

  container.innerHTML = "";
  container.appendChild(fragment);
}

function handleRemoveAccount(uid, email) {
  if (
    !confirm(
      `Remove ${email}?\n\nThis will permanently delete the user account.`
    )
  ) {
    return;
  }

  showLoading(true);
  removeUserFromDatabase(uid)
    .then(() => {
      showLoading(false);
      showNotification(`Account ${email} removed successfully.`);
      loadAccounts();
    })
    .catch((error) => {
      showLoading(false);
      console.error("Error removing account:", error);
      showNotification("Error removing account. Please try again.", true);
    });
}

function handleCreateAccount() {
  const email = document.getElementById("new-email").value.trim();
  const password = document.getElementById("new-password").value;
  const role = document.getElementById("new-role").value;

  if (!email || !password) {
    showStatus("account-status", "Please fill in all fields.", "error");
    return;
  }

  if (password.length < 6) {
    showStatus("account-status", "Password must be at least 6 characters.", "error");
    return;
  }

  showLoading(true);

  createUserAccount(email, password, role, currentUser.email)
    .then(() => {
      showLoading(false);
      showNotification("Account created successfully!");
      document.getElementById("new-email").value = "";
      document.getElementById("new-password").value = "";
      loadAccounts();
      document.querySelector('.tab-btn[data-tab="existing-accounts"]').click();
    })
    .catch((error) => {
      showLoading(false);
      let errorMessage = "Error creating account";
      // Handle AWS Cognito error messages
      if (error.message) {
        if (error.message.includes("already exists") || error.message.includes("UsernameExistsException")) {
          errorMessage = "Email already in use";
        } else if (error.message.includes("invalid") || error.message.includes("InvalidParameterException")) {
          errorMessage = "Invalid email address";
        } else if (error.message.includes("password") || error.message.includes("InvalidPasswordException")) {
          errorMessage = "Password does not meet requirements";
        } else {
          errorMessage = error.message;
        }
      }
      showStatus("account-status", errorMessage, "error");
    });
}

// ============================================
// Theme Management
// ============================================
function loadTheme() {
  loadThemeColors()
    .then((snapshot) => {
      const theme = snapshot.val();

      if (theme) {
        colorInputs.primary.value = theme.primary || "#2c5f4f";
        colorInputs.primaryLight.value = theme.primaryLight || "#3d7861";
        colorInputs.accent.value = theme.accent || "#d4a574";

        hexDisplays.primary.textContent = theme.primary || "#2c5f4f";
        hexDisplays.primaryLight.textContent = theme.primaryLight || "#3d7861";
        hexDisplays.accent.textContent = theme.accent || "#d4a574";

        updateThemePreview();
      }
    })
    .catch((error) => {
      console.error("Error loading theme:", error);
    });
}

function updateThemePreview() {
  if (!colorInputs.primary) return;

  const primary = colorInputs.primary.value;
  const primaryLight = colorInputs.primaryLight.value;
  const accent = colorInputs.accent.value;

  document.getElementById("theme-preview-bar").style.background =
    `linear-gradient(90deg, ${primary} 0%, ${primaryLight} 50%, ${accent} 100%)`;

  document.getElementById("preview-btn-primary").style.background = primary;
  document.getElementById("preview-btn-light").style.background = primaryLight;
  document.getElementById("preview-btn-accent").style.background = accent;
}

function handleSaveColors() {
  const colors = {
    primary: colorInputs.primary.value,
    primaryLight: colorInputs.primaryLight.value,
    accent: colorInputs.accent.value,
  };

  showLoading(true);
  saveThemeColors(colors, currentUser.email)
    .then(() => {
      showLoading(false);
      showNotification("Color theme saved! Refresh pages to see changes.");
    })
    .catch((error) => {
      showLoading(false);
      console.error("Error saving colors:", error);
      showNotification("Error saving color theme", true);
    });
}

function handleResetColors() {
  if (!confirm("Reset colors to default theme?")) return;

  colorInputs.primary.value = "#2c5f4f";
  colorInputs.primaryLight.value = "#3d7861";
  colorInputs.accent.value = "#d4a574";

  hexDisplays.primary.textContent = "#2c5f4f";
  hexDisplays.primaryLight.textContent = "#3d7861";
  hexDisplays.accent.textContent = "#d4a574";

  document
    .querySelectorAll(".preset-color")
    .forEach((p) => p.classList.remove("selected"));
  document
    .querySelector('.preset-color[data-color="#2c5f4f"]')
    .classList.add("selected");

  updateThemePreview();
  showNotification("Colors reset to default.");
}

// ============================================
// Logo Management
// ============================================
function loadLogo() {
  loadLogoSettings()
    .then((snapshot) => {
      const logoSettings = snapshot.val();

      if (logoSettings) {
        document.getElementById("logo-position").value =
          logoSettings.position || "header-left";
        document.getElementById("logo-size").value =
          logoSettings.size || "medium";

        if (logoSettings.url) {
          const preview = document.getElementById("logo-preview");
          preview.src = logoSettings.url;
          preview.style.display = "block";
          document.getElementById("logo-placeholder").style.display = "none";
        }
      }
    })
    .catch((error) => {
      console.error("Error loading logo settings:", error);
    });
}

function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 500 * 1024) {
    showStatus("logo-status", "File size exceeds 500KB limit.", "error");
    e.target.value = "";
    return;
  }

  if (!file.type.match("image.*")) {
    showStatus("logo-status", "Please upload an image file.", "error");
    e.target.value = "";
    return;
  }

  currentLogoFile = file;

  const reader = new FileReader();
  reader.onload = (event) => {
    document.getElementById("logo-placeholder").style.display = "none";
    const preview = document.getElementById("logo-preview");
    preview.src = event.target.result;
    preview.style.display = "block";
  };
  reader.readAsDataURL(file);
}

function handleSaveLogo() {
  const position = document.getElementById("logo-position").value;
  const size = document.getElementById("logo-size").value;

  showLoading(true);

  if (currentLogoFile) {
    uploadLogoToStorage(currentLogoFile)
      .then((downloadURL) => {
        return saveLogoSettings(downloadURL, position, size, currentUser.email);
      })
      .then(() => {
        showLoading(false);
        showNotification("Logo uploaded and settings saved!");
        currentLogoFile = null;
      })
      .catch((error) => {
        showLoading(false);
        console.error("Error uploading logo:", error);
        showNotification("Error uploading logo", true);
      });
  } else {
    updateLogoPosition(position, size, currentUser.email)
      .then(() => {
        showLoading(false);
        showNotification("Logo settings saved!");
      })
      .catch((error) => {
        showLoading(false);
        console.error("Error saving logo settings:", error);
        showNotification("Error saving settings", true);
      });
  }
}

function handleRemoveLogo() {
  if (!confirm("Remove the organization logo?")) return;

  showLoading(true);
  removeLogo()
    .then(() => {
      showLoading(false);
      document.getElementById("logo-upload").value = "";
      document.getElementById("logo-preview").style.display = "none";
      document.getElementById("logo-placeholder").style.display = "block";
      currentLogoFile = null;
      showNotification("Logo removed successfully!");
    })
    .catch((error) => {
      showLoading(false);
      console.error("Error removing logo:", error);
      showNotification("Error removing logo", true);
    });
}

// ============================================
// Event Listeners Setup
// ============================================
function setupEventListeners() {
  // Create Account Button
  document.getElementById("create-account-btn").addEventListener("click", handleCreateAccount);

  // Color inputs
  Object.keys(colorInputs).forEach((key) => {
    colorInputs[key].addEventListener("input", (e) => {
      hexDisplays[key].textContent = e.target.value;
      updateThemePreview();
    });
  });

  // Preset colors
  document.querySelectorAll(".preset-color").forEach((preset) => {
    preset.addEventListener("click", () => {
      const color = preset.dataset.color;
      document
        .querySelectorAll(".preset-color")
        .forEach((p) => p.classList.remove("selected"));
      preset.classList.add("selected");

      colorInputs.primary.value = color;
      hexDisplays.primary.textContent = color;

      const lighterColor = lightenColor(color, 20);
      colorInputs.primaryLight.value = lighterColor;
      hexDisplays.primaryLight.textContent = lighterColor;

      updateThemePreview();
    });
  });

  // Save/Reset colors
  document.getElementById("save-colors-btn").addEventListener("click", handleSaveColors);
  document.getElementById("reset-colors-btn").addEventListener("click", handleResetColors);

  // Logo
  document.getElementById("logo-upload").addEventListener("change", handleLogoUpload);
  document.getElementById("save-logo-btn").addEventListener("click", handleSaveLogo);
  document.getElementById("remove-logo-btn").addEventListener("click", handleRemoveLogo);

  // Tab Navigation
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;
      btn
        .closest(".tab-nav")
        .querySelectorAll(".tab-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      btn
        .closest(".panel")
        .querySelectorAll(".tab-content")
        .forEach((c) => c.classList.remove("active"));
      document.getElementById(tabId).classList.add("active");
    });
  });
}

// ============================================
// Utility Functions
// ============================================
function showStatus(elementId, message, type) {
  const statusEl = document.getElementById(elementId);
  statusEl.textContent = message;
  statusEl.className = "status-message " + type;
  setTimeout(() => {
    statusEl.className = "status-message";
  }, 5000);
}

function showLoading(show) {
  const overlay = document.getElementById("loadingOverlay");
  if (show) {
    overlay.classList.add("active");
  } else {
    overlay.classList.remove("active");
  }
}

console.log("config.js loaded (AWS version)");
