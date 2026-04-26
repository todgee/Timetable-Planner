// ============================================
// Setup Wizard JavaScript
// ============================================

let currentStep = 1;
const totalSteps = 5;

const setupData = {
    classes: [],     // { name, color }
    people: [],      // string[]
    timeSlots: []    // { start, end, type }  type: 'class' | 'recess' | 'lunch' | 'break'
};

const SLOT_TYPE_LABELS = {
    class: 'Class',
    recess: 'Recess',
    lunch: 'Lunch',
    break: 'Break'
};

const classColorPalette = [
    '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#E91E63',
    '#00BCD4', '#FF5722', '#795548', '#607D8B', '#3F51B5',
    '#8BC34A', '#FFC107', '#673AB7', '#009688', '#F44336'
];
let colorIndex = 0;

// ============================================
// Redirect if setup already complete
// ============================================
(function init() {
    if (hasTimetable()) {
        window.location.replace('admin.html');
    }
})();

// ============================================
// Step Navigation
// ============================================
function nextStep() {
    if (currentStep < totalSteps) {
        if (!validateStep(currentStep)) return;
        if (currentStep === totalSteps - 1) populateReview();
        setStep(currentStep + 1);
    }
}

function prevStep() {
    if (currentStep > 1) setStep(currentStep - 1);
}

function goToStep(step) {
    if (step >= 1 && step <= totalSteps) setStep(step);
}

function setStep(step) {
    currentStep = step;

    document.querySelectorAll('.progress-step').forEach((el, index) => {
        const stepNum = index + 1;
        el.classList.remove('active', 'completed');
        if (stepNum === currentStep) el.classList.add('active');
        else if (stepNum < currentStep) el.classList.add('completed');
    });

    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    document.querySelector(`.wizard-step[data-step="${step}"]`).classList.add('active');

    updateButtonStates();
}

function validateStep(step) {
    switch (step) {
        case 2:
            if (setupData.classes.length === 0) {
                alert('Please add at least one class before continuing.');
                return false;
            }
            return true;
        case 3:
            if (setupData.people.length === 0) {
                alert('Please add at least one person before continuing.');
                return false;
            }
            return true;
        case 4:
            if (setupData.timeSlots.length === 0) {
                alert('Please add at least one time slot before continuing.');
                return false;
            }
            return true;
        default:
            return true;
    }
}

function updateButtonStates() {
    const classesBtn = document.getElementById('classesNextBtn');
    const peopleBtn = document.getElementById('peopleNextBtn');
    const slotsBtn = document.getElementById('slotsNextBtn');

    if (classesBtn) classesBtn.disabled = setupData.classes.length === 0;
    if (peopleBtn) peopleBtn.disabled = setupData.people.length === 0;
    if (slotsBtn) slotsBtn.disabled = setupData.timeSlots.length === 0;
}

// ============================================
// Classes Management
// ============================================
function addClass() {
    const nameInput = document.getElementById('classNameInput');
    const colorInput = document.getElementById('classColorInput');
    const name = nameInput.value.trim();

    if (!name) {
        nameInput.focus();
        return;
    }

    if (setupData.classes.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        alert('This class already exists.');
        return;
    }

    setupData.classes.push({ name, color: colorInput.value });

    nameInput.value = '';
    colorIndex = (colorIndex + 1) % classColorPalette.length;
    colorInput.value = classColorPalette[colorIndex];
    nameInput.focus();

    renderClassesList();
    updateButtonStates();
}

function removeClass(index) {
    setupData.classes.splice(index, 1);
    renderClassesList();
    updateButtonStates();
}

function renderClassesList() {
    const container = document.getElementById('classesList');

    if (setupData.classes.length === 0) {
        container.innerHTML = '<div class="empty-hint">No classes added yet. Add your first class above.</div>';
        return;
    }

    container.innerHTML = setupData.classes.map((cls, index) => `
        <div class="item-tag">
            <span class="color-dot" style="background: ${cls.color}"></span>
            <span>${cls.name}</span>
            <button class="remove-item" onclick="removeClass(${index})">&times;</button>
        </div>
    `).join('');
}

function handleClassKeypress(event) {
    if (event.key === 'Enter') addClass();
}

// ============================================
// People Management
// ============================================
function addPerson() {
    const nameInput = document.getElementById('personNameInput');
    const name = nameInput.value.trim();

    if (!name) {
        nameInput.focus();
        return;
    }

    if (setupData.people.some(p => p.toLowerCase() === name.toLowerCase())) {
        alert('This person already exists.');
        return;
    }

    setupData.people.push(name);
    nameInput.value = '';
    nameInput.focus();

    renderPeopleList();
    updateButtonStates();
}

function removePerson(index) {
    setupData.people.splice(index, 1);
    renderPeopleList();
    updateButtonStates();
}

function renderPeopleList() {
    const container = document.getElementById('peopleList');

    if (setupData.people.length === 0) {
        container.innerHTML = '<div class="empty-hint">No people added yet. Add your first person above.</div>';
        return;
    }

    container.innerHTML = setupData.people.map((person, index) => `
        <div class="item-tag">
            <span>${person}</span>
            <button class="remove-item" onclick="removePerson(${index})">&times;</button>
        </div>
    `).join('');
}

function handlePersonKeypress(event) {
    if (event.key === 'Enter') addPerson();
}

// ============================================
// Time Slots Management
// ============================================
function applyTemplate(template, event) {
    document.querySelectorAll('.template-card').forEach(el => el.classList.remove('selected'));
    if (event) event.target.closest('.template-card').classList.add('selected');

    setupData.timeSlots = [];

    switch (template) {
        case 'school':
            setupData.timeSlots = [
                { start: '08:00', end: '08:45', type: 'class' },
                { start: '09:00', end: '09:40', type: 'class' },
                { start: '09:40', end: '10:20', type: 'class' },
                { start: '10:20', end: '11:00', type: 'class' },
                { start: '11:00', end: '11:15', type: 'recess' },
                { start: '11:15', end: '11:30', type: 'recess' },
                { start: '11:30', end: '12:10', type: 'class' },
                { start: '12:10', end: '12:50', type: 'class' },
                { start: '12:50', end: '13:00', type: 'class' },
                { start: '13:00', end: '13:15', type: 'lunch' },
                { start: '13:15', end: '13:30', type: 'lunch' },
                { start: '13:30', end: '14:10', type: 'class' },
                { start: '14:10', end: '14:50', type: 'class' },
                { start: '14:50', end: '15:00', type: 'class' },
                { start: '15:00', end: '15:30', type: 'class' }
            ];
            break;
        case 'halfday':
            setupData.timeSlots = [
                { start: '09:00', end: '10:00', type: 'class' },
                { start: '10:00', end: '11:00', type: 'class' },
                { start: '11:00', end: '12:00', type: 'class' }
            ];
            break;
        case 'custom':
            setupData.timeSlots = [{ start: '09:00', end: '10:00', type: 'class' }];
            break;
    }

    renderTimeSlots();
    updateButtonStates();
}

function addTimeSlot() {
    let startTime = '09:00';
    let endTime = '10:00';

    if (setupData.timeSlots.length > 0) {
        const lastSlot = setupData.timeSlots[setupData.timeSlots.length - 1];
        startTime = lastSlot.end;
        const [hours, mins] = startTime.split(':').map(Number);
        const endHours = (hours + 1) % 24;
        endTime = `${endHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    setupData.timeSlots.push({ start: startTime, end: endTime, type: 'class' });
    renderTimeSlots();
    updateButtonStates();
}

function removeTimeSlot(index) {
    setupData.timeSlots.splice(index, 1);
    renderTimeSlots();
    updateButtonStates();
}

function updateTimeSlot(index, field, value) {
    setupData.timeSlots[index][field] = value;
}

function renderTimeSlots() {
    const container = document.getElementById('timeSlotsContainer');

    if (setupData.timeSlots.length === 0) {
        container.innerHTML = '<div class="empty-hint">Select a template or add custom time slots below.</div>';
        return;
    }

    container.innerHTML = setupData.timeSlots.map((slot, index) => {
        const type = slot.type || 'class';
        return `
        <div class="time-slot-row">
            <span>Period ${index + 1}:</span>
            <input type="time" value="${slot.start}" onchange="updateTimeSlot(${index}, 'start', this.value)">
            <span>to</span>
            <input type="time" value="${slot.end}" onchange="updateTimeSlot(${index}, 'end', this.value)">
            <select onchange="updateTimeSlot(${index}, 'type', this.value)" class="slot-type-select">
                <option value="class" ${type === 'class' ? 'selected' : ''}>Class</option>
                <option value="recess" ${type === 'recess' ? 'selected' : ''}>Recess</option>
                <option value="lunch" ${type === 'lunch' ? 'selected' : ''}>Lunch</option>
                <option value="break" ${type === 'break' ? 'selected' : ''}>Break</option>
            </select>
            <button class="remove-slot" onclick="removeTimeSlot(${index})">&times;</button>
        </div>
    `;
    }).join('');
}

// ============================================
// Review Step
// ============================================
function populateReview() {
    document.getElementById('reviewClassCount').textContent = setupData.classes.length;
    document.getElementById('reviewClasses').innerHTML = setupData.classes.map(cls => `
        <span class="review-item" style="border-left: 3px solid ${cls.color}; padding-left: 0.6rem;">
            ${cls.name}
        </span>
    `).join('');

    document.getElementById('reviewPeopleCount').textContent = setupData.people.length;
    document.getElementById('reviewPeople').innerHTML = setupData.people.map(person => `
        <span class="review-item">${person}</span>
    `).join('');

    document.getElementById('reviewSlotsCount').textContent = setupData.timeSlots.length;
    let periodIndex = 0;
    document.getElementById('reviewSlots').innerHTML = setupData.timeSlots.map(slot => {
        const type = slot.type || 'class';
        const label = SLOT_TYPE_LABELS[type] || 'Class';
        let prefix;
        if (type === 'class') {
            periodIndex++;
            prefix = `Period ${periodIndex}`;
        } else {
            prefix = label;
        }
        const durationMin = Math.max(0, timeToMinutes(slot.end) - timeToMinutes(slot.start));
        return `
        <div class="review-slot slot-type-${type}">
            <span class="review-slot-label">${prefix}</span>
            <span class="review-slot-time">${formatTime12Hour(slot.start)} – ${formatTime12Hour(slot.end)}</span>
            <span class="review-slot-duration">${durationMin} min</span>
        </div>
    `;
    }).join('');
}

// ============================================
// Finish Setup
// ============================================
function finishSetup() {
    const loadingEl = document.getElementById('setupLoading');
    loadingEl.classList.add('active');

    try {
        const classColorsMap = {};
        setupData.classes.forEach(cls => {
            classColorsMap[cls.name] = cls.color;
        });

        saveTimetable({
            setupComplete: true,
            peopleList: setupData.people,
            classList: setupData.classes.map(c => c.name),
            classColors: classColorsMap,
            assignments: {
                monday: {}, tuesday: {}, wednesday: {}, thursday: {}, friday: {}
            },
            timeSlots: setupData.timeSlots
        });

        loadingEl.querySelector('p').textContent = 'Setup complete! Redirecting...';
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 800);

    } catch (error) {
        loadingEl.classList.remove('active');
        console.error('Setup error:', error);
        alert('Failed to save timetable: ' + error.message);
    }
}

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const colorInput = document.getElementById('classColorInput');
    if (colorInput) colorInput.value = classColorPalette[0];
    updateButtonStates();
});

console.log('setup.js loaded');
