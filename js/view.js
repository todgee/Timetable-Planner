// ============================================
// View Page JavaScript (ESO Staff - Read Only)
// ============================================

// Data variables
let peopleList = [];
let classList = [];
let classColors = {};
let assignments = {};
let timeSlots = [];
let currentDay = "monday";
let currentCounterTab = "day";

const SLOT_TYPE_LABELS = {
  class: "Class",
  recess: "Recess",
  lunch: "Lunch",
  break: "Break",
};

function slotType(slot) {
  return (slot && slot.type) || "class";
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ============================================
// Load Timetable Data from localStorage
// ============================================
function loadTimetableData() {
  try {
    const data = loadTimetable();

    if (data) {
      peopleList = data.peopleList || [];
      classList = data.classList || [];
      classColors = data.classColors || {};
      assignments = {
        monday: data.assignments?.monday || {},
        tuesday: data.assignments?.tuesday || {},
        wednesday: data.assignments?.wednesday || {},
        thursday: data.assignments?.thursday || {},
        friday: data.assignments?.friday || {},
      };
      timeSlots = (data.timeSlots || []).map((s) => ({
        start: s.start,
        end: s.end,
        type: s.type || "class",
      }));

      renderTimetable();
      updateCounters();
    } else {
      document.getElementById("timetableContainer").innerHTML = `
        <div class="empty-state" style="padding: 4rem 2rem;">
          <div class="empty-state-icon">📋</div>
          <p>No timetable data available yet.</p>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading timetable:", error);
    showNotification("Error loading timetable. Please try again.", true);
  }
}

// ============================================
// Timetable Rendering
// ============================================
function renderTimetable() {
  const container = document.getElementById("timetableContainer");

  let html = '<div style="display: inline-block; min-width: 100%;">';
  html += `<div class="day-title ${currentDay}">${currentDay.charAt(0).toUpperCase() + currentDay.slice(1)}</div>`;
  html += '<table class="timetable"><tbody>';

  html += '<tr class="timetable-header-row">';
  html += "<th>Time</th>";
  peopleList.forEach((name) => {
    html += `<th>${escapeHtml(name)}</th>`;
  });
  html += "</tr>";

  const validTimeSlots = timeSlots.filter(
    (slot) =>
      slot &&
      slot.start &&
      slot.end &&
      typeof slot.start === "string" &&
      typeof slot.end === "string"
  );

  const personCount = peopleList.length || 1;

  validTimeSlots.forEach((slot) => {
    const type = slotType(slot);

    if (type !== "class") {
      const label = SLOT_TYPE_LABELS[type] || "Break";
      html += `<tr class="timetable-row break-row break-row--${type}">`;
      html += `<td class="time-cell"><div class="time-range">${formatTime12Hour(slot.start)}<br>${formatTime12Hour(slot.end)}</div></td>`;
      html += `<td class="break-cell" colspan="${personCount}">${label}</td>`;
      html += "</tr>";
      return;
    }

    html += '<tr class="timetable-row">';
    html += `<td class="time-cell"><div class="time-range">${formatTime12Hour(slot.start)}<br>${formatTime12Hour(slot.end)}</div></td>`;

    peopleList.forEach((person) => {
      const cellKey = `${slot.start}-${person}`;
      const cellData = assignments[currentDay]?.[cellKey];
      const hasContent = cellData !== undefined;

      const bgColor = hasContent ? classColors[cellData.class] : "";
      const style = hasContent ? `style="background: ${bgColor};"` : "";

      html += `<td class="roster-cell ${hasContent ? "has-content" : ""}" ${style}>`;

      if (hasContent) {
        html += `<div class="cell-content">`;
        html += `<div class="assignment-class">${escapeHtml(cellData.class)}</div>`;
        html += `<div class="assignment-duration">${cellData.duration} min</div>`;
        if (cellData.notes) {
          html += `<div class="assignment-notes">${escapeHtml(cellData.notes)}</div>`;
        }
        html += `</div>`;
      }

      html += "</td>";
    });

    html += "</tr>";
  });

  html += "</tbody></table>";
  html += "</div>";
  container.innerHTML = html;
}

// ============================================
// Day Switching
// ============================================
function switchDay(day) {
  currentDay = day;

  document.querySelectorAll(".day-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.querySelector(`[data-day="${day}"]`).classList.add("active");

  renderTimetable();
  updateCounters();
  updateDayLabel();
}

function updateDayLabel() {
  document.getElementById("currentDayLabel").textContent =
    currentDay.charAt(0).toUpperCase() + currentDay.slice(1);
}

// ============================================
// Counters
// ============================================
function updateCounters() {
  // Day counters
  const dayCounts = {};
  classList.forEach((cls) => (dayCounts[cls] = 0));

  if (assignments[currentDay]) {
    Object.values(assignments[currentDay]).forEach((assignment) => {
      dayCounts[assignment.class]++;
    });
  }

  const dayGrid = document.getElementById("dayCounterGrid");
  dayGrid.innerHTML = classList
    .map(
      (cls) => `
      <div class="counter-item">
        <div class="counter-label">${cls}</div>
        <div class="counter-value">${dayCounts[cls]}</div>
      </div>
    `
    )
    .join("");

  // Week counters
  const weekCounts = {};
  classList.forEach((cls) => (weekCounts[cls] = 0));

  days.forEach((day) => {
    if (assignments[day]) {
      Object.values(assignments[day]).forEach((assignment) => {
        weekCounts[assignment.class]++;
      });
    }
  });

  const weekGrid = document.getElementById("weekCounterGrid");
  weekGrid.innerHTML = classList
    .map(
      (cls) => `
      <div class="counter-item">
        <div class="counter-label">${cls}</div>
        <div class="counter-value">${weekCounts[cls]}</div>
      </div>
    `
    )
    .join("");
}

function switchCounterTab(tab) {
  currentCounterTab = tab;

  document.querySelectorAll(".counter-tab").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.querySelectorAll(".counter-content").forEach((content) => {
    content.classList.remove("active");
  });

  if (tab === "day") {
    document.querySelector(".counter-tab").classList.add("active");
    document.getElementById("dayCounters").classList.add("active");
  } else {
    document.querySelectorAll(".counter-tab")[1].classList.add("active");
    document.getElementById("weekCounters").classList.add("active");
  }
}

// ============================================
// View Controls (zoom / scroll / fullscreen)
// ============================================
const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;
const SCROLL_STEP = 240;
let currentZoom = 100;

function applyZoom() {
  const zoomEl = document.getElementById("timetableZoom");
  const zoomValue = document.getElementById("zoomValue");
  const zoomOutBtn = document.getElementById("zoomOutBtn");
  const zoomInBtn = document.getElementById("zoomInBtn");
  if (!zoomEl) return;

  // The CSS `zoom` property reflows layout so wrapper scrollbars stay correct.
  zoomEl.style.zoom = currentZoom / 100;

  if (zoomValue) zoomValue.textContent = `${currentZoom}%`;
  if (zoomOutBtn) zoomOutBtn.disabled = currentZoom <= ZOOM_MIN;
  if (zoomInBtn) zoomInBtn.disabled = currentZoom >= ZOOM_MAX;
}

function setZoom(value) {
  currentZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(value)));
  applyZoom();
}

function zoomIn() {
  setZoom(currentZoom + ZOOM_STEP);
}

function zoomOut() {
  setZoom(currentZoom - ZOOM_STEP);
}

function scrollTimetable(direction) {
  const wrapper = document.getElementById("timetableWrapper");
  if (!wrapper) return;
  wrapper.scrollBy({ left: direction * SCROLL_STEP, behavior: "smooth" });
}

function isFullscreenActive() {
  return document.fullscreenElement || document.webkitFullscreenElement;
}

function toggleFullscreen() {
  const section = document.querySelector(".timetable-section");
  if (!section) return;

  const requestFs =
    section.requestFullscreen ||
    section.webkitRequestFullscreen ||
    section.msRequestFullscreen;
  const exitFs =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.msExitFullscreen;

  if (isFullscreenActive()) {
    if (exitFs) exitFs.call(document);
  } else if (requestFs) {
    const result = requestFs.call(section);
    if (result && typeof result.catch === "function") {
      result.catch(() => toggleFullscreenFallback(section));
    }
  } else {
    toggleFullscreenFallback(section);
  }
}

function toggleFullscreenFallback(section) {
  const isOn = section.classList.toggle("timetable-fullscreen");
  document.body.classList.toggle("timetable-fullscreen-active", isOn);
}

function handleFullscreenChange() {
  const section = document.querySelector(".timetable-section");
  if (!section) return;
  const active = !!isFullscreenActive();
  section.classList.toggle("timetable-fullscreen", active);
  document.body.classList.toggle("timetable-fullscreen-active", active);
}

function initViewControls() {
  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomOutBtn = document.getElementById("zoomOutBtn");
  const zoomValue = document.getElementById("zoomValue");
  const scrollLeftBtn = document.getElementById("scrollLeftBtn");
  const scrollRightBtn = document.getElementById("scrollRightBtn");
  const fullscreenBtn = document.getElementById("fullscreenBtn");

  if (zoomInBtn) zoomInBtn.addEventListener("click", zoomIn);
  if (zoomOutBtn) zoomOutBtn.addEventListener("click", zoomOut);
  if (zoomValue) zoomValue.addEventListener("click", () => setZoom(100));
  if (scrollLeftBtn) scrollLeftBtn.addEventListener("click", () => scrollTimetable(-1));
  if (scrollRightBtn) scrollRightBtn.addEventListener("click", () => scrollTimetable(1));
  if (fullscreenBtn) fullscreenBtn.addEventListener("click", toggleFullscreen);

  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

  applyZoom();
}

// ============================================
// Initialize on Page Load
// ============================================
window.addEventListener("DOMContentLoaded", function () {
  loadTimetableData();
  updateDayLabel();
  initViewControls();
});

console.log("view.js loaded");
