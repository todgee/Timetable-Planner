// ============================================
// View Page JavaScript (Read Only)
// ============================================

const timetableId = new URLSearchParams(window.location.search).get('id');

// Data variables
let peopleList = [];
let classList = [];
let classColors = {};
let assignments = {};
let timeSlots = [];
let currentDay = "monday";

// Filter state
let activeFilter = [];
let tempFilter = [];

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
// Load Timetable Data from Supabase
// ============================================
async function loadTimetableData() {
  if (!timetableId) {
    window.location.replace('portal.html');
    return;
  }

  const session = await window.authReady;

  const { data: tt } = await supabase
    .from('timetables')
    .select('id, name')
    .eq('id', timetableId)
    .eq('owner_id', session.user.id)
    .maybeSingle();

  if (!tt) {
    window.location.replace('portal.html');
    return;
  }

  // Wire header elements
  const pageTitleEl = document.getElementById('page-title');
  if (pageTitleEl) pageTitleEl.textContent = tt.name || '';

  const backLink = document.getElementById('back-to-admin');
  if (backLink) backLink.href = `admin.html?id=${timetableId}`;

  const meta        = session.user.user_metadata || {};
  const displayName = meta.full_name || meta.first_name || session.user.email;
  const initial     = (meta.first_name || session.user.email || '?')[0].toUpperCase();
  const nameEl   = document.getElementById('user-name');
  const avatarEl = document.getElementById('user-avatar');
  if (nameEl)   nameEl.textContent   = displayName;
  if (avatarEl) avatarEl.textContent = initial;

  try {
    const { data: td } = await supabase
      .from('timetable_data').select('*').eq('timetable_id', timetableId).maybeSingle();

    document.body.style.visibility = 'visible';

    if (td) {
      peopleList = td.people    || [];
      classList  = td.classes   || [];
      classColors = td.class_colors || {};
      assignments = {
        monday:    td.assignments?.monday    || {},
        tuesday:   td.assignments?.tuesday   || {},
        wednesday: td.assignments?.wednesday || {},
        thursday:  td.assignments?.thursday  || {},
        friday:    td.assignments?.friday    || {},
      };
      timeSlots = (td.time_slots || []).map((s) => ({
        start: s.start,
        end:   s.end,
        type:  s.type || 'class',
      }));
      renderTimetable();
    } else {
      document.getElementById('timetableContainer').innerHTML = `
        <div class="empty-state" style="padding: 4rem 2rem;">
          <div class="empty-state-icon">📋</div>
          <p>No timetable data available yet.</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading timetable:', error);
    showNotification('Error loading timetable. Please try again.', true);
    document.body.style.visibility = 'visible';
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

  const visiblePeople = getFilteredPeople();

  html += '<tr class="timetable-header-row">';
  html += "<th>Time</th>";
  visiblePeople.forEach((name) => {
    html += `<th title="${escapeHtml(name)}">${escapeHtml(name)}</th>`;
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

  const personCount = visiblePeople.length || 1;

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

    visiblePeople.forEach((person) => {
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
}

// ============================================
// Staff Filter
// ============================================

function getFilteredPeople() {
  if (activeFilter.length === 0) return peopleList;
  return peopleList.filter((p) => activeFilter.includes(p));
}

function toggleFilterDropdown() {
  const dropdown = document.getElementById("filterDropdown");
  if (dropdown.style.display === "block") {
    closeFilterDropdown();
  } else {
    tempFilter = [...activeFilter];
    renderFilterDropdownList();
    dropdown.style.display = "block";
  }
}

function closeFilterDropdown() {
  const dropdown = document.getElementById("filterDropdown");
  if (dropdown) dropdown.style.display = "none";
}

function renderFilterDropdownList() {
  const container = document.getElementById("filterPeopleList");
  if (!container) return;
  if (peopleList.length === 0) {
    container.innerHTML = '<p class="filter-empty">No staff added yet</p>';
    return;
  }
  container.innerHTML = peopleList
    .map((person) => {
      const checked = tempFilter.includes(person) ? "checked" : "";
      const safe = escapeHtml(person);
      const safeJs = person.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      return `<label class="filter-person-item">
        <input type="checkbox" value="${safe}" ${checked}
          onchange="toggleTempFilter('${safeJs}', this.checked)">
        <span>${safe}</span>
      </label>`;
    })
    .join("");
}

function toggleTempFilter(person, checked) {
  if (checked) {
    if (!tempFilter.includes(person)) tempFilter.push(person);
  } else {
    tempFilter = tempFilter.filter((p) => p !== person);
  }
}

function filterSelectAll() {
  tempFilter = [...peopleList];
  renderFilterDropdownList();
}

function filterClearAll() {
  tempFilter = [];
  renderFilterDropdownList();
}

function applyFilter() {
  if (tempFilter.length === 0 || tempFilter.length === peopleList.length) {
    activeFilter = [];
  } else {
    activeFilter = [...tempFilter];
  }
  updateFilterBadge();
  closeFilterDropdown();
  renderTimetable();
}

function updateFilterBadge() {
  const badge = document.getElementById("filterBadge");
  if (!badge) return;
  if (activeFilter.length > 0) {
    badge.textContent = activeFilter.length;
    badge.style.display = "inline-flex";
  } else {
    badge.style.display = "none";
  }
}

// ============================================
// Initialize on Page Load
// ============================================
window.addEventListener("DOMContentLoaded", function () {
  loadTimetableData();

  document.addEventListener("click", function (e) {
    const wrapper = document.getElementById("filterStaffWrapper");
    if (wrapper && !wrapper.contains(e.target)) {
      closeFilterDropdown();
    }
  });
});

console.log("view.js loaded");
