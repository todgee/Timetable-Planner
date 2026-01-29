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

// ============================================
// Authentication Check (AWS Cognito)
// ============================================
(function initAuth() {
  // Check if user is authenticated with AWS Cognito
  if (!isAuthenticated()) {
    window.location.href = "index.html";
    return;
  }

  // Viewer role check
  const userRole = getCurrentUserRole();
  if (userRole !== "viewer" && userRole !== "admin") {
    window.location.href = "index.html";
    return;
  }
})();

// ============================================
// Load Timetable Data from AWS
// ============================================
async function loadTimetableData() {
  try {
    const data = await loadTimetable();

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
      timeSlots = data.timeSlots || [];

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
  html += '<div class="timetable">';

  html += '<div class="timetable-header-row">';
  html += "<div>Time</div>";
  peopleList.forEach((name) => {
    html += `<div>${name}</div>`;
  });
  html += "</div>";

  // Filter valid time slots
  const validTimeSlots = timeSlots.filter(
    (slot) =>
      slot &&
      slot.start &&
      slot.end &&
      typeof slot.start === "string" &&
      typeof slot.end === "string"
  );

  validTimeSlots.forEach((slot) => {
    html += '<div class="timetable-row">';
    html += `<div class="time-cell"><div class="time-range">${formatTime12Hour(slot.start)}<br>${formatTime12Hour(slot.end)}</div></div>`;

    peopleList.forEach((person) => {
      const cellKey = `${slot.start}-${person}`;
      const cellData = assignments[currentDay]?.[cellKey];
      const hasContent = cellData !== undefined;

      const bgColor = hasContent ? classColors[cellData.class] : "";
      const style = hasContent ? `style="background: ${bgColor};"` : "";

      // No click handler for ESO - read only
      html += `<div class="roster-cell ${hasContent ? "has-content" : ""}" ${style}>`;

      if (hasContent) {
        html += `<div class="cell-content">`;
        html += `<div class="assignment-class">${cellData.class}</div>`;
        html += `<div class="assignment-duration">${cellData.duration} min</div>`;
        if (cellData.notes) {
          html += `<div class="assignment-notes">${cellData.notes}</div>`;
        }
        html += `</div>`;
      }

      html += "</div>";
    });

    html += "</div>";
  });

  html += "</div>";
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
// Initialize on Page Load
// ============================================
window.addEventListener("DOMContentLoaded", function () {
  loadTimetableData();
  updateDayLabel();
});

console.log("view.js loaded (AWS version)");
