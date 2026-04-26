// ============================================
// Admin Page JavaScript
// ============================================

// Data variables
let peopleList = [];
let classList = [];

// Staff filter state
let activeFilter = []; // currently applied (empty = show all)
let tempFilter = [];   // working copy while dropdown is open

// Class filter state
let activeClassFilter = []; // currently applied (empty = show all)
let tempClassFilter = [];   // working copy while dropdown is open
let classColors = {};
let assignments = {
  monday: {},
  tuesday: {},
  wednesday: {},
  thursday: {},
  friday: {},
};
let timeSlots = [];
let currentDay = "monday";
let currentCounterTab = "day";
let colorIndex = 0;
let currentEditCell = null;

const daysArray = days;

const SLOT_TYPE_LABELS = {
  class: "Class",
  recess: "Recess",
  lunch: "Lunch",
  break: "Break",
};

function slotType(slot) {
  return (slot && slot.type) || "class";
}

function isBreakSlot(slot) {
  return slotType(slot) !== "class";
}

// ============================================
// Bootstrap: load from localStorage, or send user to setup
// ============================================
(function init() {
  const data = loadTimetable();
  if (!data || !data.setupComplete) {
    window.location.replace("setup.html");
    return;
  }
  loadFromStorage();
})();

// ============================================
// People Management
// ============================================
function addPeople() {
  const input = document.getElementById("peopleInput");
  const text = input.value.trim();

  if (!text) {
    alert("Please enter at least one name");
    return;
  }

  const lines = text.split("\n");
  const names = [];
  lines.forEach((line) => {
    const parts = line
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name);
    names.push(...parts);
  });

  if (names.length === 0) {
    alert("Please enter at least one name");
    return;
  }

  let added = 0;
  let skipped = 0;

  names.forEach((name) => {
    if (!peopleList.includes(name)) {
      peopleList.push(name);
      added++;
    } else {
      skipped++;
    }
  });

  input.value = "";
  updatePeopleList();
  autoSave();

  if (added > 0) {
    alert(
      `Added ${added} ${added === 1 ? "person" : "people"}${skipped > 0 ? `, skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}` : ""}`
    );
  } else {
    alert("All names were already in the list");
  }
}

function removePerson(name) {
  if (
    confirm(
      `Remove ${name} from the list? All their assignments will be deleted.`
    )
  ) {
    peopleList = peopleList.filter((p) => p !== name);
    activeFilter = activeFilter.filter((p) => p !== name);
    updateFilterBadge();

    daysArray.forEach((day) => {
      if (assignments[day]) {
        Object.keys(assignments[day]).forEach((key) => {
          if (key.endsWith(`-${name}`)) {
            delete assignments[day][key];
          }
        });
      }
    });

    updatePeopleList();
    renderCurrentTimetable();
    updateCounters();
    autoSave();
  }
}

function updatePeopleList() {
  const listContainer = document.getElementById("peopleList");

  document.getElementById("peopleCount").textContent = peopleList.length;
  const modalCounter = document.getElementById("peopleCountInModal");
  if (modalCounter) modalCounter.textContent = peopleList.length;

  if (peopleList.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">👤</div>
        <p>No people added yet</p>
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();

  peopleList.forEach((person) => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "list-item";

    const nameSpan = document.createElement("span");
    nameSpan.className = "item-name";
    nameSpan.textContent = person;

    const removeBtn = document.createElement("button");
    removeBtn.className = "delete-btn";
    removeBtn.textContent = "Remove";
    removeBtn.onclick = function () {
      removePerson(person);
    };

    itemDiv.appendChild(nameSpan);
    itemDiv.appendChild(removeBtn);
    fragment.appendChild(itemDiv);
  });

  listContainer.innerHTML = "";
  listContainer.appendChild(fragment);
}

// ============================================
// Classes Management
// ============================================
function addClasses() {
  const input = document.getElementById("classesInput");
  const text = input.value.trim();

  if (!text) {
    alert("Please enter at least one class name");
    return;
  }

  const lines = text.split("\n");
  const names = [];
  lines.forEach((line) => {
    const parts = line
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name);
    names.push(...parts);
  });

  if (names.length === 0) {
    alert("Please enter at least one class name");
    return;
  }

  let added = 0;
  let skipped = 0;

  names.forEach((name) => {
    if (!classList.includes(name)) {
      classList.push(name);
      classColors[name] = defaultColors[colorIndex % defaultColors.length];
      colorIndex++;
      added++;
    } else {
      skipped++;
    }
  });

  input.value = "";
  updateClassList();
  updateModalSelects();
  autoSave();

  if (added > 0) {
    alert(
      `Added ${added} ${added === 1 ? "class" : "classes"}${skipped > 0 ? `, skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}` : ""}`
    );
  } else {
    alert("All classes were already in the list");
  }
}

function removeClass(name) {
  if (
    confirm(
      `Remove ${name} from the list? All assignments using this class will be deleted.`
    )
  ) {
    classList = classList.filter((cls) => cls !== name);
    delete classColors[name];
    activeClassFilter = activeClassFilter.filter((c) => c !== name);
    updateClassFilterBadge();

    daysArray.forEach((day) => {
      if (assignments[day]) {
        Object.keys(assignments[day]).forEach((key) => {
          if (assignments[day][key].class === name) {
            delete assignments[day][key];
          }
        });
      }
    });

    updateClassList();
    updateModalSelects();
    renderCurrentTimetable();
    updateCounters();
    autoSave();
  }
}

function updateClassColor(name, color) {
  classColors[name] = color;
  renderCurrentTimetable();
  autoSave();
}

function updateClassList() {
  const listContainer = document.getElementById("classList");

  document.getElementById("classesCount").textContent = classList.length;
  const modalCounter = document.getElementById("classesCountInModal");
  if (modalCounter) modalCounter.textContent = classList.length;

  if (classList.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📖</div>
        <p>No classes added yet</p>
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();

  classList.forEach((cls) => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "list-item";

    const classItemDiv = document.createElement("div");
    classItemDiv.className = "class-item";

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = classColors[cls];
    colorInput.title = "Choose color";
    colorInput.onchange = function () {
      updateClassColor(cls, this.value);
    };

    const nameSpan = document.createElement("span");
    nameSpan.className = "item-name";
    nameSpan.textContent = cls;

    classItemDiv.appendChild(colorInput);
    classItemDiv.appendChild(nameSpan);

    const removeBtn = document.createElement("button");
    removeBtn.className = "delete-btn";
    removeBtn.textContent = "Remove";
    removeBtn.onclick = function () {
      removeClass(cls);
    };

    itemDiv.appendChild(classItemDiv);
    itemDiv.appendChild(removeBtn);
    fragment.appendChild(itemDiv);
  });

  listContainer.innerHTML = "";
  listContainer.appendChild(fragment);
}

// ============================================
// Modal Management
// ============================================
function openPeopleManager() {
  document.getElementById("peopleManagerModal").classList.add("active");
}

function closePeopleManager() {
  document.getElementById("peopleManagerModal").classList.remove("active");
}

function openClassesManager() {
  document.getElementById("classesManagerModal").classList.add("active");
}

function closeClassesManager() {
  document.getElementById("classesManagerModal").classList.remove("active");
}

function updateModalSelects() {
  const classSelect = document.getElementById("modalClass");

  classSelect.innerHTML =
    '<option value="">Select a class...</option>' +
    classList.map((cls) => `<option value="${cls}">${cls}</option>`).join("");
}

// ============================================
// Time Slots Management
// ============================================
function openEditTimeSlots() {
  const listContainer = document.getElementById("timeSlotList");

  const fragment = document.createDocumentFragment();

  timeSlots.forEach((slot, index) => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "time-slot-item";

    const startInput = document.createElement("input");
    startInput.type = "time";
    startInput.value = slot.start;
    startInput.onchange = function () {
      updateTimeSlot(index, "start", this.value);
    };

    const endInput = document.createElement("input");
    endInput.type = "time";
    endInput.value = slot.end;
    endInput.onchange = function () {
      updateTimeSlot(index, "end", this.value);
    };

    const typeSelect = document.createElement("select");
    typeSelect.className = "slot-type-select";
    ["class", "recess", "lunch", "break"].forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = SLOT_TYPE_LABELS[t];
      if (slotType(slot) === t) opt.selected = true;
      typeSelect.appendChild(opt);
    });
    typeSelect.onchange = function () {
      updateTimeSlot(index, "type", this.value);
    };

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-secondary btn-small delete-btn";
    removeBtn.textContent = "Remove";
    removeBtn.onclick = function () {
      removeTimeSlot(index);
    };

    itemDiv.appendChild(startInput);
    itemDiv.appendChild(endInput);
    itemDiv.appendChild(typeSelect);
    itemDiv.appendChild(removeBtn);
    fragment.appendChild(itemDiv);
  });

  listContainer.innerHTML = "";
  listContainer.appendChild(fragment);

  document.getElementById("editTimeSlotsModal").classList.add("active");
}

function updateTimeSlot(index, field, value) {
  timeSlots[index][field] = value;
}

function addNewTimeSlot() {
  const lastSlot = timeSlots[timeSlots.length - 1];
  const newStart = lastSlot ? lastSlot.end : "08:00";
  const newEnd = minutesToTime(timeToMinutes(newStart) + 60);

  timeSlots.push({ start: newStart, end: newEnd, type: "class" });
  openEditTimeSlots();
}

function removeTimeSlot(index) {
  if (
    confirm(
      "Remove this time slot? Any assignments during this time will be deleted."
    )
  ) {
    const removedSlot = timeSlots[index];
    timeSlots.splice(index, 1);

    daysArray.forEach((day) => {
      if (assignments[day]) {
        Object.keys(assignments[day]).forEach((key) => {
          if (key.startsWith(removedSlot.start + "-")) {
            delete assignments[day][key];
          }
        });
      }
    });

    openEditTimeSlots();
  }
}

function closeEditTimeSlotsModal() {
  document.getElementById("editTimeSlotsModal").classList.remove("active");
}

function saveTimeSlots() {
  timeSlots.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

  closeEditTimeSlotsModal();
  renderTimetable();
  updateCounters();
  autoSave();
}

// ============================================
// Timetable Rendering
// ============================================
function renderCurrentTimetable() {
  if (timeSlots.length > 0) {
    renderTimetable();
  }
}

function renderTimetable() {
  const container = document.getElementById("timetableContainer");

  let html = '<div style="display: inline-block; min-width: 100%;">';
  html += `<div class="day-title ${currentDay}">${currentDay.charAt(0).toUpperCase() + currentDay.slice(1)}</div>`;
  html += '<table class="timetable"><tbody>';

  const visiblePeople = getFilteredPeople();

  html += '<tr class="timetable-header-row">';
  html += "<th>Time</th>";
  visiblePeople.forEach((name) => {
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
      const dimmed = hasContent && activeClassFilter.length > 0 && !activeClassFilter.includes(cellData.class);

      const safePerson = person.replace(/'/g, "\\'");
      const clickHandler = `onclick="editCell('${slot.start}', '${safePerson}')"`;

      html += `<td class="roster-cell ${hasContent ? "has-content" : ""} ${dimmed ? "class-filtered-out" : ""}" ${style} ${clickHandler}>`;

      if (hasContent) {
        html += `<button class="remove-btn-cell" onclick="event.stopPropagation(); removeCell('${slot.start}', '${safePerson}')">×</button>`;
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
// Class Filter
// ============================================

function getFilteredClasses() {
  if (activeClassFilter.length === 0) return classList;
  return classList.filter((c) => activeClassFilter.includes(c));
}

function toggleClassFilterDropdown() {
  const dropdown = document.getElementById("classFilterDropdown");
  if (dropdown.style.display === "block") {
    closeClassFilterDropdown();
  } else {
    tempClassFilter = [...activeClassFilter];
    renderClassFilterList();
    dropdown.style.display = "block";
  }
}

function closeClassFilterDropdown() {
  const dropdown = document.getElementById("classFilterDropdown");
  if (dropdown) dropdown.style.display = "none";
}

function renderClassFilterList() {
  const container = document.getElementById("classFilterList");
  if (!container) return;
  if (classList.length === 0) {
    container.innerHTML = '<p class="filter-empty">No classes added yet</p>';
    return;
  }
  container.innerHTML = classList
    .map((cls) => {
      const checked = tempClassFilter.includes(cls) ? "checked" : "";
      const safe = escapeHtml(cls);
      const safeJs = cls.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      const color = classColors[cls] || "transparent";
      return `<label class="filter-person-item">
        <input type="checkbox" value="${safe}" ${checked}
          onchange="toggleTempClassFilter('${safeJs}', this.checked)">
        <span style="display:inline-flex;align-items:center;gap:0.45rem;">
          <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></span>
          ${safe}
        </span>
      </label>`;
    })
    .join("");
}

function toggleTempClassFilter(cls, checked) {
  if (checked) {
    if (!tempClassFilter.includes(cls)) tempClassFilter.push(cls);
  } else {
    tempClassFilter = tempClassFilter.filter((c) => c !== cls);
  }
}

function classFilterSelectAll() {
  tempClassFilter = [...classList];
  renderClassFilterList();
}

function classFilterClearAll() {
  tempClassFilter = [];
  renderClassFilterList();
}

function applyClassFilter() {
  if (tempClassFilter.length === 0 || tempClassFilter.length === classList.length) {
    activeClassFilter = [];
  } else {
    activeClassFilter = [...tempClassFilter];
  }
  updateClassFilterBadge();
  closeClassFilterDropdown();
  renderTimetable();
  updateCounters();
}

function updateClassFilterBadge() {
  const badge = document.getElementById("classFilterBadge");
  if (!badge) return;
  if (activeClassFilter.length > 0) {
    badge.textContent = activeClassFilter.length;
    badge.style.display = "inline-flex";
  } else {
    badge.style.display = "none";
  }
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

function switchDay(day) {
  currentDay = day;

  document.querySelectorAll(".day-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.querySelector(`[data-day="${day}"]`).classList.add("active");

  renderTimetable();
  updateCounters();
}

// ============================================
// Cell Editing
// ============================================
function editCell(time, person) {
  currentEditCell = { time, person };
  const cellKey = `${time}-${person}`;
  const currentData = assignments[currentDay][cellKey];

  const slot = timeSlots.find((s) => s.start === time);
  const periodMinutes = slot
    ? Math.max(1, timeToMinutes(slot.end) - timeToMinutes(slot.start))
    : 60;

  populateDurationOptions(periodMinutes);

  document.getElementById("modalInfo").textContent =
    `${currentDay.charAt(0).toUpperCase() + currentDay.slice(1)} - ${formatTime12Hour(time)} - ${person} (period: ${periodMinutes} min)`;

  const durationSelect = document.getElementById("modalDuration");

  if (currentData) {
    document.getElementById("modalClass").value = currentData.class;
    const capped = Math.min(currentData.duration, periodMinutes);
    durationSelect.value = String(capped);
    document.getElementById("modalNotes").value = currentData.notes || "";
  } else {
    document.getElementById("modalClass").value = "";
    durationSelect.value = String(periodMinutes);
    document.getElementById("modalNotes").value = "";
  }

  document.getElementById("assignmentModal").classList.add("active");
}

function populateDurationOptions(periodMinutes) {
  const candidates = [5, 10, 15, 20, 30, 45, 60, 90, 120];
  const allowed = candidates.filter((m) => m <= periodMinutes);
  if (!allowed.includes(periodMinutes)) allowed.push(periodMinutes);
  allowed.sort((a, b) => a - b);

  const select = document.getElementById("modalDuration");
  select.innerHTML = allowed
    .map((m) => {
      const label =
        m === periodMinutes
          ? `${m} minutes (full period)`
          : m >= 60 && m % 60 === 0
            ? `${m} minutes (${m / 60} hour${m === 60 ? "" : "s"})`
            : `${m} minutes`;
      return `<option value="${m}">${label}</option>`;
    })
    .join("");
}

function closeModal() {
  document.getElementById("assignmentModal").classList.remove("active");
  currentEditCell = null;
}

function confirmAssignment() {
  if (!currentEditCell) return;

  const className = document.getElementById("modalClass").value;
  let duration = parseInt(document.getElementById("modalDuration").value);
  const notes = document.getElementById("modalNotes").value.trim();

  if (!className) {
    alert("Please select a class");
    return;
  }

  const slot = timeSlots.find((s) => s.start === currentEditCell.time);
  if (slot) {
    const periodMinutes = Math.max(1, timeToMinutes(slot.end) - timeToMinutes(slot.start));
    if (!isFinite(duration) || duration <= 0 || duration > periodMinutes) {
      duration = periodMinutes;
    }
  }

  const cellKey = `${currentEditCell.time}-${currentEditCell.person}`;

  assignments[currentDay][cellKey] = {
    class: className,
    duration: duration,
    notes: notes,
  };

  closeModal();
  renderTimetable();
  updateCounters();
  autoSave();
}

function removeCell(time, person) {
  const cellKey = `${time}-${person}`;
  delete assignments[currentDay][cellKey];
  renderTimetable();
  updateCounters();
  autoSave();
}

// ============================================
// Counters
// ============================================
function switchCounterTab(tab) {
  currentCounterTab = tab;

  document
    .querySelectorAll(".counter-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".counter-content")
    .forEach((c) => c.classList.remove("active"));

  if (tab === "day") {
    document.querySelectorAll(".counter-tab")[0].classList.add("active");
    document.getElementById("dayCounters").classList.add("active");
  } else {
    document.querySelectorAll(".counter-tab")[1].classList.add("active");
    document.getElementById("weekCounters").classList.add("active");
  }
}

function updateCounters() {
  document.getElementById("currentDayLabel").textContent =
    currentDay.charAt(0).toUpperCase() + currentDay.slice(1);

  const visibleClasses = getFilteredClasses();

  // Day counters
  const dayCounts = {};
  classList.forEach((cls) => (dayCounts[cls] = 0));

  if (assignments[currentDay]) {
    Object.values(assignments[currentDay]).forEach((assignment) => {
      dayCounts[assignment.class]++;
    });
  }

  const dayGrid = document.getElementById("dayCounterGrid");
  dayGrid.innerHTML = visibleClasses
    .map(
      (cls) => `
      <div class="counter-item">
        <div class="counter-class">
          <div class="counter-color" style="background: ${classColors[cls]}"></div>
          <span>${cls}</span>
        </div>
        <div class="counter-value">${dayCounts[cls]}</div>
      </div>
    `
    )
    .join("");

  // Week counters
  const weekCounts = {};
  classList.forEach((cls) => (weekCounts[cls] = 0));

  daysArray.forEach((day) => {
    if (assignments[day]) {
      Object.values(assignments[day]).forEach((assignment) => {
        if (assignment && assignment.class) {
          weekCounts[assignment.class]++;
        }
      });
    }
  });

  const weekGrid = document.getElementById("weekCounterGrid");
  if (weekGrid) {
    weekGrid.innerHTML = visibleClasses
      .map(
        (cls) => `
        <div class="counter-item">
          <div class="counter-class">
            <div class="counter-color" style="background: ${classColors[cls]}"></div>
            <span>${cls}</span>
          </div>
          <div class="counter-value">${weekCounts[cls]}</div>
        </div>
      `
      )
      .join("");
  }
}

// ============================================
// Save & Load Project
// ============================================
function saveProject() {
  const projectData = {
    version: "1.0",
    savedDate: new Date().toISOString(),
    peopleList: peopleList,
    classList: classList,
    classColors: classColors,
    assignments: assignments,
    timeSlots: timeSlots,
  };

  const jsonString = JSON.stringify(projectData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Timetable_Project_${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showAutoSaveIndicator("Project saved!");
}

function loadProject(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const projectData = JSON.parse(e.target.result);

      if (!projectData.version) {
        alert("Invalid project file");
        return;
      }

      if (
        !confirm(
          "Loading this project will replace your current work. Continue?"
        )
      ) {
        return;
      }

      peopleList = projectData.peopleList || [];
      classList = projectData.classList || [];
      classColors = projectData.classColors || {};
      assignments = projectData.assignments || {};
      timeSlots = (projectData.timeSlots || []).map((s) => ({
        start: s.start,
        end: s.end,
        type: s.type || "class",
      }));
      colorIndex = classList.length;

      updatePeopleList();
      updateClassList();
      updateModalSelects();

      if (timeSlots.length > 0) {
        document.getElementById("daySelector").style.display = "flex";
        document.getElementById("timetableWrapper").style.display = "block";
        document.getElementById("editTimeSlotsBtn").style.display =
          "inline-block";
        document.getElementById("countersSection").style.display = "block";
        renderTimetable();
        updateCounters();
      }

      alert("Project loaded successfully!");
      autoSave();
    } catch (error) {
      alert("Error loading project file: " + error.message);
    }
  };
  reader.readAsText(file);

  event.target.value = "";
}

function autoSave() {
  try {
    saveTimetable({
      setupComplete: true,
      peopleList: peopleList,
      classList: classList,
      classColors: classColors,
      assignments: assignments,
      timeSlots: timeSlots,
    });
    showAutoSaveIndicator();
  } catch (error) {
    console.error("Auto-save failed:", error);
    showNotification("Auto-save failed. Please export a backup.", true);
  }
}

function resetAndSetup() {
  if (!confirm("Reset and go back to setup? All timetable data will be deleted.")) return;
  localStorage.removeItem(STORAGE_KEYS.timetable);
  window.location.href = "setup.html";
}

function loadFromStorage() {
  const data = loadTimetable();
  if (!data) return;

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
  colorIndex = classList.length;

  updatePeopleList();
  updateClassList();
  updateModalSelects();

  if (timeSlots.length > 0) {
    document.getElementById("editTimeSlotsBtn").style.display = "inline-block";
    renderTimetable();
    updateCounters();
  }
}

function showAutoSaveIndicator(message = "✓ Auto-saved") {
  const indicator = document.getElementById("autoSaveIndicator");
  indicator.textContent = message;
  indicator.style.display = "block";

  setTimeout(() => {
    indicator.style.display = "none";
  }, 2000);
}

// ============================================
// Export Functions
// ============================================
function exportSchedule() {
  let hasAssignments = false;
  daysArray.forEach((day) => {
    if (assignments[day] && Object.keys(assignments[day]).length > 0) {
      hasAssignments = true;
    }
  });

  if (!hasAssignments) {
    alert("No assignments to export");
    return;
  }

  document.getElementById("exportModal").classList.add("active");
}

function closeExportModal() {
  document.getElementById("exportModal").classList.remove("active");
}

function exportToExcel() {
  const workbook = XLSX.utils.book_new();
  const timestamp = new Date().toISOString().split("T")[0];

  daysArray.forEach((day) => {
    const dayName = day.charAt(0).toUpperCase() + day.slice(1);
    const sheetData = [];

    const headerRow = ["Time"];
    peopleList.forEach((person) => headerRow.push(person));
    sheetData.push(headerRow);

    timeSlots.forEach((slot) => {
      const row = [
        `${formatTime12Hour(slot.start)} - ${formatTime12Hour(slot.end)}`,
      ];

      const type = slotType(slot);
      if (type !== "class") {
        const label = SLOT_TYPE_LABELS[type] || "Break";
        for (let i = 0; i < peopleList.length; i++) {
          row.push(i === 0 ? label : "");
        }
        sheetData.push(row);
        return;
      }

      peopleList.forEach((person) => {
        const cellKey = `${slot.start}-${person}`;
        const data = assignments[day]?.[cellKey];

        if (data) {
          let cellText = `${data.class}`;
          if (data.duration !== 60) cellText += ` (${data.duration}min)`;
          if (data.notes) cellText += `\n${data.notes}`;
          row.push(cellText);
        } else {
          row.push("");
        }
      });

      sheetData.push(row);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    const colWidths = [{ wch: 20 }];
    peopleList.forEach(() => colWidths.push({ wch: 25 }));
    worksheet["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, dayName);
  });

  // Summary sheet
  const summaryData = [["Class Summary", "Count"]];
  const weekCounts = {};
  classList.forEach((cls) => (weekCounts[cls] = 0));
  daysArray.forEach((day) => {
    if (assignments[day]) {
      Object.values(assignments[day]).forEach((assignment) => {
        weekCounts[assignment.class]++;
      });
    }
  });

  classList.forEach((cls) => {
    summaryData.push([cls, weekCounts[cls]]);
  });
  summaryData.push(["", ""]);
  summaryData.push(["Total People", peopleList.length]);
  summaryData.push(["Total Classes", classList.length]);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 40 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  XLSX.writeFile(workbook, `Timetable_${timestamp}.xlsx`);
  showAutoSaveIndicator("Excel file downloaded!");
}

async function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("l", "mm", "a4");
  const timestamp = new Date().toISOString().split("T")[0];
  let pageNum = 0;

  for (const day of days) {
    if (pageNum > 0) pdf.addPage();

    const dayName = day.charAt(0).toUpperCase() + day.slice(1);

    pdf.setFontSize(20);
    pdf.setTextColor(44, 95, 79);
    pdf.text(dayName, 148, 20, { align: "center" });

    const tableData = [];
    timeSlots.forEach((slot) => {
      const timeLabel = `${formatTime12Hour(slot.start)}-${formatTime12Hour(slot.end)}`;
      const type = slotType(slot);

      if (type !== "class") {
        const label = SLOT_TYPE_LABELS[type] || "Break";
        tableData.push([
          timeLabel,
          { content: label, colSpan: peopleList.length, styles: { halign: "center", fontStyle: "italic", fillColor: [240, 230, 215] } },
        ]);
        return;
      }

      const row = [timeLabel];
      peopleList.forEach((person) => {
        const cellKey = `${slot.start}-${person}`;
        const data = assignments[day]?.[cellKey];

        if (data) {
          let cellText = data.class;
          if (data.duration !== 60) cellText += `\n(${data.duration}min)`;
          if (data.notes) cellText += `\n${data.notes}`;
          row.push(cellText);
        } else {
          row.push("");
        }
      });

      tableData.push(row);
    });

    pdf.autoTable({
      head: [["Time", ...peopleList]],
      body: tableData,
      startY: 30,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [44, 95, 79], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: "bold" },
      },
      margin: { left: 10, right: 10 },
    });

    pdf.setFontSize(8);
    pdf.setTextColor(107, 107, 107);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 10, 200);
    pdf.text(`Page ${pageNum + 1} of 5`, 280, 200);

    pageNum++;
  }

  pdf.save(`Timetable_${timestamp}.pdf`);
  showAutoSaveIndicator("PDF downloaded!");
}

async function exportToPNG() {
  const originalDay = currentDay;
  let downloadCount = 0;

  for (const day of days) {
    currentDay = day;
    renderTimetable();

    await new Promise((resolve) => setTimeout(resolve, 100));

    const element = document.getElementById("timetableContainer");
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const dayName = day.charAt(0).toUpperCase() + day.slice(1);
    const timestamp = new Date().toISOString().split("T")[0];

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Timetable_${dayName}_${timestamp}.png`;
      a.click();
      URL.revokeObjectURL(url);

      downloadCount++;
      if (downloadCount === days.length) {
        showAutoSaveIndicator("All images downloaded!");
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  currentDay = originalDay;
  renderTimetable();
}

async function exportAll() {
  showAutoSaveIndicator("Exporting all formats...");

  exportToExcel();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await exportToPDF();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await exportToPNG();

  showAutoSaveIndicator("All formats exported!");
}

// ============================================
// Event Listeners
// ============================================
document.addEventListener("DOMContentLoaded", function () {
  // Modal click-outside-to-close
  document.getElementById("assignmentModal").addEventListener("click", function (e) {
    if (e.target === this) closeModal();
  });

  document.getElementById("editTimeSlotsModal").addEventListener("click", function (e) {
    if (e.target === this) closeEditTimeSlotsModal();
  });

  document.getElementById("exportModal").addEventListener("click", function (e) {
    if (e.target === this) closeExportModal();
  });

  document.getElementById("peopleManagerModal").addEventListener("click", function (e) {
    if (e.target === this) closePeopleManager();
  });

  document.getElementById("classesManagerModal").addEventListener("click", function (e) {
    if (e.target === this) closeClassesManager();
  });

  // Close dropdowns on outside click (without applying changes)
  document.addEventListener("click", function (e) {
    const staffWrapper = document.getElementById("filterStaffWrapper");
    if (staffWrapper && !staffWrapper.contains(e.target)) {
      closeFilterDropdown();
    }
    const classWrapper = document.getElementById("classFilterWrapper");
    if (classWrapper && !classWrapper.contains(e.target)) {
      closeClassFilterDropdown();
    }
  });

  // Ctrl+Enter to submit textareas
  document.getElementById("peopleInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.ctrlKey) addPeople();
  });

  document.getElementById("classesInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.ctrlKey) addClasses();
  });

  // PWA features
  registerServiceWorker();
  handlePWAInstall();
});

// ============================================
// PWA Features
// ============================================
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((registration) => {
        console.log("Service Worker registered successfully:", registration.scope);

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              showUpdateNotification();
            }
          });
        });
      })
      .catch((error) => {
        console.log("Service Worker registration failed:", error);
      });
  }
}

let deferredPrompt;

function handlePWAInstall() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
  });

  window.addEventListener("appinstalled", () => {
    console.log("PWA installed successfully");
    deferredPrompt = null;
    hideInstallButton();
  });
}

function showInstallButton() {
  if (document.getElementById("pwaInstallBtn")) return;

  const installBtn = document.createElement("button");
  installBtn.id = "pwaInstallBtn";
  installBtn.className = "btn btn-primary btn-icon";
  installBtn.innerHTML = "Install App";
  installBtn.onclick = installPWA;
  installBtn.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    z-index: 999;
    box-shadow: 0 8px 24px rgba(44, 95, 79, 0.3);
    animation: slideInUp 0.5s ease;
  `;

  document.body.appendChild(installBtn);
}

function hideInstallButton() {
  const btn = document.getElementById("pwaInstallBtn");
  if (btn) {
    btn.style.animation = "slideInUp 0.3s ease reverse";
    setTimeout(() => btn.remove(), 300);
  }
}

async function installPWA() {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to install prompt: ${outcome}`);

  deferredPrompt = null;
  hideInstallButton();
}

function showUpdateNotification() {
  const updateBanner = document.createElement("div");
  updateBanner.style.cssText = `
    position: fixed;
    top: 2rem;
    right: 2rem;
    background: var(--success);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1001;
    display: flex;
    align-items: center;
    gap: 1rem;
  `;
  updateBanner.innerHTML = `
    <span>New version available!</span>
    <button onclick="window.location.reload()" style="
      background: white;
      color: var(--success);
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
    ">Update Now</button>
    <button onclick="this.parentElement.remove()" style="
      background: transparent;
      color: white;
      border: none;
      padding: 0.5rem;
      cursor: pointer;
      font-size: 1.2rem;
    ">×</button>
  `;

  document.body.appendChild(updateBanner);

  setTimeout(() => {
    if (updateBanner.parentElement) {
      updateBanner.remove();
    }
  }, 10000);
}

console.log("admin.js loaded");
