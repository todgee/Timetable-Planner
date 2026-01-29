// ============================================
// Admin Page JavaScript
// ============================================

// Data variables
let peopleList = [];
let classList = [];
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
let currentUser = null;
let currentUserRole = null;

// Use days from shared.js
const daysArray = days;

// ============================================
// Authentication Check (AWS Cognito)
// ============================================
(async function initAuth() {
  // Check if user is authenticated with AWS Cognito
  if (!isAuthenticated()) {
    window.location.href = "index.html";
    return;
  }

  // Get user info from Cognito tokens
  currentUserRole = getCurrentUserRole();
  const userEmail = sessionStorage.getItem("userEmail");

  // Show user info
  const userInfo = document.getElementById("userInfo");
  const userRoleEl = document.getElementById("userRole");
  if (userInfo) userInfo.style.display = "flex";
  if (userRoleEl) userRoleEl.textContent = `${currentUserRole === "admin" ? "Leadership (Admin)" : "Viewer"}`;

  // Set current user object for compatibility
  currentUser = { email: userEmail };

  // Load timetable from AWS
  await autoLoadFromAWS();
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
  autoSaveToFirebase();

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
    autoSaveToFirebase();
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
  autoSaveToFirebase();

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
    autoSaveToFirebase();
  }
}

function updateClassColor(name, color) {
  classColors[name] = color;
  renderCurrentTimetable();
  autoSaveToFirebase();
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

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-secondary btn-small delete-btn";
    removeBtn.textContent = "Remove";
    removeBtn.onclick = function () {
      removeTimeSlot(index);
    };

    itemDiv.appendChild(startInput);
    itemDiv.appendChild(endInput);
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

  timeSlots.push({ start: newStart, end: newEnd });
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
  autoSaveToFirebase();
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
  html += '<div class="timetable">';

  html += '<div class="timetable-header-row">';
  html += "<div>Time</div>";
  peopleList.forEach((name) => {
    html += `<div>${name}</div>`;
  });
  html += "</div>";

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

      const clickHandler =
        currentUserRole === "admin"
          ? `onclick="editCell('${slot.start}', '${person.replace(/'/g, "\\'")}')"`
          : "";

      html += `<div class="roster-cell ${hasContent ? "has-content" : ""}" ${style} ${clickHandler}>`;

      if (hasContent) {
        if (currentUserRole === "admin") {
          html += `<button class="remove-btn-cell" onclick="event.stopPropagation(); removeCell('${slot.start}', '${person.replace(/'/g, "\\'")}')">×</button>`;
        }
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

  document.getElementById("modalInfo").textContent =
    `${currentDay.charAt(0).toUpperCase() + currentDay.slice(1)} - ${formatTime12Hour(time)} - ${person}`;

  if (currentData) {
    document.getElementById("modalClass").value = currentData.class;
    document.getElementById("modalDuration").value = currentData.duration;
    document.getElementById("modalNotes").value = currentData.notes || "";
  } else {
    document.getElementById("modalClass").value = "";
    document.getElementById("modalDuration").value = 60;
    document.getElementById("modalNotes").value = "";
  }

  document.getElementById("assignmentModal").classList.add("active");
}

function closeModal() {
  document.getElementById("assignmentModal").classList.remove("active");
  currentEditCell = null;
}

function confirmAssignment() {
  if (!currentEditCell) return;

  const className = document.getElementById("modalClass").value;
  const duration = parseInt(document.getElementById("modalDuration").value);
  const notes = document.getElementById("modalNotes").value.trim();

  if (!className) {
    alert("Please select a class");
    return;
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
  autoSaveToFirebase();
}

function removeCell(time, person) {
  const cellKey = `${time}-${person}`;
  delete assignments[currentDay][cellKey];
  renderTimetable();
  updateCounters();
  autoSaveToFirebase();
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
    weekGrid.innerHTML = classList
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
      timeSlots = projectData.timeSlots || [];
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
      autoSaveToFirebase();
    } catch (error) {
      alert("Error loading project file: " + error.message);
    }
  };
  reader.readAsText(file);

  event.target.value = "";
}

function autoSaveToFirebase() {
  const projectData = {
    version: "1.0",
    savedDate: new Date().toISOString(),
    peopleList: peopleList,
    classList: classList,
    classColors: classColors,
    assignments: assignments,
    timeSlots: timeSlots,
  };

  try {
    localStorage.setItem("timetableProject", JSON.stringify(projectData));
    showAutoSaveIndicator();

    if (currentUserRole === "admin") {
      saveToAWS();
    }
  } catch (error) {
    console.error("Auto-save failed:", error);
  }
}

function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem("timetableProject");
    if (!saved) return;

    const projectData = JSON.parse(saved);

    peopleList = projectData.peopleList || [];
    classList = projectData.classList || [];
    classColors = projectData.classColors || {};
    assignments = projectData.assignments || {};
    timeSlots = projectData.timeSlots || [];
    colorIndex = classList.length;

    updatePeopleList();
    updateClassList();
    updateModalSelects();

    if (timeSlots.length > 0) {
      document.getElementById("daySelector").style.display = "flex";
      document.getElementById("timetableWrapper").style.display = "block";
      document.getElementById("editTimeSlotsBtn").style.display = "inline-block";
      document.getElementById("countersSection").style.display = "block";
      renderTimetable();
      updateCounters();
    }
  } catch (error) {
    console.error("Error loading from localStorage:", error);
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
      const row = [
        `${formatTime12Hour(slot.start)}-${formatTime12Hour(slot.end)}`,
      ];

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
// AWS Integration
// ============================================
async function saveToAWS() {
  if (currentUserRole !== "admin") {
    console.log("Only admins can save changes");
    return;
  }

  const timetableData = {
    version: "1.0",
    lastUpdated: new Date().toISOString(),
    updatedBy: currentUser.email,
    peopleList: peopleList,
    classList: classList,
    classColors: classColors,
    assignments: assignments,
    timeSlots: timeSlots,
  };

  try {
    await saveTimetable(timetableData);
    showNotification("Saved to server");
  } catch (error) {
    console.error("AWS save error:", error);
    showNotification("Save failed. Please try again.", true);
  }
}

async function loadFromDatabase() {
  if (
    !confirm(
      "Load timetable from database? This will replace your current work."
    )
  ) {
    return;
  }

  showNotification("Loading from database...", false);

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
      colorIndex = classList.length;

      updatePeopleList();
      updateClassList();
      updateModalSelects();

      if (currentUserRole === "admin") {
        document.getElementById("editTimeSlotsBtn").style.display =
          "inline-block";
      }

      renderTimetable();
      updateCounters();

      showNotification("Loaded from database");
    } else {
      showNotification("No data in database", true);
    }
  } catch (error) {
    console.error("AWS load error:", error);
    showNotification("Load failed. Please try again.", true);
  }
}

async function autoLoadFromAWS() {
  console.log("Auto-loading timetable from AWS...");

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
      colorIndex = classList.length;

      updatePeopleList();
      updateClassList();
      updateModalSelects();

      if (currentUserRole === "admin") {
        document.getElementById("editTimeSlotsBtn").style.display =
          "inline-block";
      }

      renderTimetable();
      updateCounters();

      console.log("Timetable loaded from AWS successfully");
    } else {
      console.log("No timetable data in database yet");
      document.getElementById("timetableContainer").innerHTML = `
        <div class="empty-state" style="padding: 4rem 2rem;">
          <div class="empty-state-icon">📋</div>
          <p>No timetable data yet. Add people and classes to get started!</p>
        </div>
      `;
    }
  } catch (error) {
    console.error("AWS auto-load error:", error);
    // Fall back to localStorage if AWS fails
    loadFromLocalStorage();
  }
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

console.log("admin.js loaded (AWS version)");
