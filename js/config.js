// ============================================
// Config Page JavaScript
// ============================================

let currentLogoDataUrl = null;

const colorInputs = { primary: null, primaryLight: null, accent: null };
const hexDisplays = { primary: null, primaryLight: null, accent: null };

// ============================================
// Init
// ============================================
window.addEventListener("load", () => {
  colorInputs.primary = document.getElementById("color-primary");
  colorInputs.primaryLight = document.getElementById("color-primary-light");
  colorInputs.accent = document.getElementById("color-accent");

  hexDisplays.primary = document.getElementById("primary-hex");
  hexDisplays.primaryLight = document.getElementById("primary-light-hex");
  hexDisplays.accent = document.getElementById("accent-hex");

  setupEventListeners();
  loadThemeIntoForm();
  loadLogoIntoForm();
  updateThemePreview();
});

// ============================================
// Theme Management
// ============================================
function loadThemeIntoForm() {
  const theme = loadTheme();
  colorInputs.primary.value = theme.primary;
  colorInputs.primaryLight.value = theme.primaryLight;
  colorInputs.accent.value = theme.accent;

  hexDisplays.primary.textContent = theme.primary;
  hexDisplays.primaryLight.textContent = theme.primaryLight;
  hexDisplays.accent.textContent = theme.accent;
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
  saveTheme({
    primary: colorInputs.primary.value,
    primaryLight: colorInputs.primaryLight.value,
    accent: colorInputs.accent.value
  });
  showNotification("Color theme saved! Refresh pages to see changes.");
}

function handleResetColors() {
  if (!confirm("Reset colors to default theme?")) return;

  resetTheme();
  loadThemeIntoForm();

  document.querySelectorAll(".preset-color").forEach((p) => p.classList.remove("selected"));
  const defaultPreset = document.querySelector('.preset-color[data-color="#2c5f4f"]');
  if (defaultPreset) defaultPreset.classList.add("selected");

  updateThemePreview();
  showNotification("Colors reset to default.");
}

// ============================================
// Logo Management
// ============================================
function loadLogoIntoForm() {
  const logoSettings = loadLogo();
  if (!logoSettings) return;

  document.getElementById("logo-position").value = logoSettings.position || "header-left";
  document.getElementById("logo-size").value = logoSettings.size || "medium";

  if (logoSettings.url) {
    const preview = document.getElementById("logo-preview");
    preview.src = logoSettings.url;
    preview.style.display = "block";
    document.getElementById("logo-placeholder").style.display = "none";
    currentLogoDataUrl = logoSettings.url;
  }
}

async function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const validation = validateImageFile(file, 0.5);
  if (!validation.valid) {
    showStatus("logo-status", validation.error, "error");
    e.target.value = "";
    return;
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    currentLogoDataUrl = dataUrl;

    document.getElementById("logo-placeholder").style.display = "none";
    const preview = document.getElementById("logo-preview");
    preview.src = dataUrl;
    preview.style.display = "block";
  } catch (err) {
    showStatus("logo-status", "Failed to read image: " + err.message, "error");
  }
}

function handleSaveLogo() {
  const position = document.getElementById("logo-position").value;
  const size = document.getElementById("logo-size").value;

  try {
    saveLogo({ url: currentLogoDataUrl || "", position, size });
    showNotification("Logo settings saved!");
  } catch (err) {
    console.error("Error saving logo:", err);
    if (err.name === "QuotaExceededError") {
      showNotification("Image too large for browser storage. Try a smaller file.", true);
    } else {
      showNotification("Error saving logo settings", true);
    }
  }
}

function handleRemoveLogo() {
  if (!confirm("Remove the organization logo?")) return;

  deleteLogo();
  currentLogoDataUrl = null;
  document.getElementById("logo-upload").value = "";
  document.getElementById("logo-preview").style.display = "none";
  document.getElementById("logo-placeholder").style.display = "block";
  showNotification("Logo removed successfully!");
}

// ============================================
// Danger Zone
// ============================================
function handleClearTimetable() {
  if (!confirm("Are you sure you want to clear all timetable data? This cannot be undone.")) return;

  localStorage.removeItem("timetable.data");
  showNotification("Timetable data cleared");
  setTimeout(() => { window.location.href = "index.html"; }, 1000);
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
  Object.keys(colorInputs).forEach((key) => {
    colorInputs[key].addEventListener("input", (e) => {
      hexDisplays[key].textContent = e.target.value;
      updateThemePreview();
    });
  });

  document.querySelectorAll(".preset-color").forEach((preset) => {
    preset.addEventListener("click", () => {
      const color = preset.dataset.color;
      document.querySelectorAll(".preset-color").forEach((p) => p.classList.remove("selected"));
      preset.classList.add("selected");

      colorInputs.primary.value = color;
      hexDisplays.primary.textContent = color;

      const lighterColor = lightenColor(color, 20);
      colorInputs.primaryLight.value = lighterColor;
      hexDisplays.primaryLight.textContent = lighterColor;

      updateThemePreview();
    });
  });

  document.getElementById("save-colors-btn").addEventListener("click", handleSaveColors);
  document.getElementById("reset-colors-btn").addEventListener("click", handleResetColors);

  document.getElementById("logo-upload").addEventListener("change", handleLogoUpload);
  document.getElementById("save-logo-btn").addEventListener("click", handleSaveLogo);
  document.getElementById("remove-logo-btn").addEventListener("click", handleRemoveLogo);

  document.getElementById("clear-timetable-btn").addEventListener("click", handleClearTimetable);
}

// ============================================
// Utility
// ============================================
function showStatus(elementId, message, type) {
  const statusEl = document.getElementById(elementId);
  statusEl.textContent = message;
  statusEl.className = "status-message " + type;
  setTimeout(() => { statusEl.className = "status-message"; }, 5000);
}

console.log("config.js loaded");
