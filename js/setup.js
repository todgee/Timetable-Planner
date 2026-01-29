// ============================================
// Setup Wizard JavaScript
// ============================================

// Wizard State
let currentStep = 1;
const totalSteps = 6;

// Setup Data
const setupData = {
    schoolId: '',
    accounts: [],     // { email: string, name: string, role: string }
    classes: [],      // { name: string, color: string }
    people: [],       // string[]
    timeSlots: []     // { start: string, end: string }
};

// Default colors for classes
const classColors = [
    '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#E91E63',
    '#00BCD4', '#FF5722', '#795548', '#607D8B', '#3F51B5',
    '#8BC34A', '#FFC107', '#673AB7', '#009688', '#F44336'
];
let colorIndex = 0;

// ============================================
// Authentication Check
// ============================================
(function initAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    // Check if setup already complete
    checkExistingTimetable();
})();

async function checkExistingTimetable() {
    try {
        const data = await loadTimetable();

        // If timetable has data, redirect to appropriate page
        if (data && data.setupComplete && (data.peopleList?.length > 0 || data.classList?.length > 0)) {
            const role = getCurrentUserRole();
            window.location.href = role === 'admin' ? 'admin.html' : 'view.html';
            return;
        }
    } catch (error) {
        // 404 or other error means no timetable exists, continue with setup
        console.log('No existing timetable found, continuing with setup');
    }
}

// ============================================
// Step Navigation
// ============================================
function nextStep() {
    if (currentStep < totalSteps) {
        // Validate current step before proceeding
        if (!validateStep(currentStep)) {
            return;
        }

        // If going to review step, populate review data
        if (currentStep === 5) {
            populateReview();
        }

        setStep(currentStep + 1);
    }
}

function prevStep() {
    if (currentStep > 1) {
        setStep(currentStep - 1);
    }
}

function goToStep(step) {
    if (step >= 1 && step <= totalSteps) {
        setStep(step);
    }
}

function setStep(step) {
    currentStep = step;

    // Update progress indicators
    document.querySelectorAll('.progress-step').forEach((el, index) => {
        const stepNum = index + 1;
        el.classList.remove('active', 'completed');

        if (stepNum === currentStep) {
            el.classList.add('active');
        } else if (stepNum < currentStep) {
            el.classList.add('completed');
        }
    });

    // Show current step content
    document.querySelectorAll('.wizard-step').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelector(`.wizard-step[data-step="${step}"]`).classList.add('active');

    // Update button states
    updateButtonStates();
}

function validateStep(step) {
    switch (step) {
        case 2: // School
            const schoolId = document.getElementById('schoolIdInput').value.trim();
            if (!schoolId) {
                alert('Please enter a School ID before continuing.');
                document.getElementById('schoolIdInput').focus();
                return false;
            }
            // Validate format (lowercase, numbers, hyphens only)
            if (!/^[a-z0-9-]+$/.test(schoolId)) {
                alert('School ID can only contain lowercase letters, numbers, and hyphens.');
                document.getElementById('schoolIdInput').focus();
                return false;
            }
            setupData.schoolId = schoolId;
            return true;
        case 3: // Classes
            if (setupData.classes.length === 0) {
                alert('Please add at least one class before continuing.');
                return false;
            }
            return true;
        case 4: // People
            if (setupData.people.length === 0) {
                alert('Please add at least one person before continuing.');
                return false;
            }
            return true;
        case 5: // Time Slots
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
    const schoolBtn = document.getElementById('schoolNextBtn');
    const classesBtn = document.getElementById('classesNextBtn');
    const peopleBtn = document.getElementById('peopleNextBtn');
    const slotsBtn = document.getElementById('slotsNextBtn');

    if (schoolBtn) {
        const schoolId = document.getElementById('schoolIdInput')?.value.trim();
        schoolBtn.disabled = !schoolId;
    }
    if (classesBtn) {
        classesBtn.disabled = setupData.classes.length === 0;
    }
    if (peopleBtn) {
        peopleBtn.disabled = setupData.people.length === 0;
    }
    if (slotsBtn) {
        slotsBtn.disabled = setupData.timeSlots.length === 0;
    }
}

// ============================================
// Account Management
// ============================================
async function createAccount() {
    const email = document.getElementById('accountEmail').value.trim();
    const password = document.getElementById('accountPassword').value;
    const name = document.getElementById('accountName').value.trim();
    const role = document.getElementById('accountRole').value;
    const statusEl = document.getElementById('accountStatus');

    // Validation
    if (!email || !password || !name) {
        showAccountStatus('Please fill in all fields.', 'error');
        return;
    }

    if (!email.includes('@')) {
        showAccountStatus('Please enter a valid email address.', 'error');
        return;
    }

    if (password.length < 8) {
        showAccountStatus('Password must be at least 8 characters.', 'error');
        return;
    }

    // Check for duplicate
    if (setupData.accounts.some(a => a.email.toLowerCase() === email.toLowerCase())) {
        showAccountStatus('An account with this email already exists.', 'error');
        return;
    }

    // Show loading
    const addBtn = document.querySelector('.add-account-btn');
    const originalText = addBtn.textContent;
    addBtn.textContent = 'Creating...';
    addBtn.disabled = true;

    try {
        // Call AWS API to create Cognito user
        // For now, all accounts are created as admin (as per user request)
        const schoolId = document.getElementById('schoolIdInput').value.trim() || 'default';

        await createUser(email, password, 'admin'); // Always admin for now

        // Add to local list
        setupData.accounts.push({
            email: email,
            name: name,
            role: 'admin' // Always admin for now
        });

        // Clear form
        document.getElementById('accountEmail').value = '';
        document.getElementById('accountPassword').value = '';
        document.getElementById('accountName').value = '';

        // Update UI
        renderAccountsList();
        showAccountStatus(`Account created for ${email}`, 'success');

    } catch (error) {
        console.error('Account creation error:', error);
        let errorMsg = 'Failed to create account.';
        if (error.message.includes('exists')) {
            errorMsg = 'An account with this email already exists in the system.';
        } else if (error.message.includes('password')) {
            errorMsg = 'Password does not meet requirements (min 8 chars, uppercase, lowercase, number).';
        } else if (error.message) {
            errorMsg = error.message;
        }
        showAccountStatus(errorMsg, 'error');
    } finally {
        addBtn.textContent = originalText;
        addBtn.disabled = false;
    }
}

function showAccountStatus(message, type) {
    const statusEl = document.getElementById('accountStatus');
    statusEl.textContent = message;
    statusEl.className = 'account-status ' + type;

    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusEl.className = 'account-status';
    }, 5000);
}

function removeAccount(index) {
    // Note: This only removes from local list, doesn't delete from Cognito
    // In production, you might want to mark for deletion or actually delete
    setupData.accounts.splice(index, 1);
    renderAccountsList();
}

function renderAccountsList() {
    const container = document.getElementById('accountsList');

    if (setupData.accounts.length === 0) {
        container.innerHTML = '<div class="empty-hint">No additional accounts created yet.</div>';
        return;
    }

    container.innerHTML = setupData.accounts.map((account, index) => `
        <div class="account-card">
            <div class="account-info">
                <span class="account-email">${account.email}</span>
                <span class="account-role">${account.name} - Admin</span>
            </div>
            <button class="remove-account" onclick="removeAccount(${index})" title="Remove from list">&times;</button>
        </div>
    `).join('');
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

    // Check for duplicate
    if (setupData.classes.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        alert('This class already exists.');
        return;
    }

    setupData.classes.push({
        name: name,
        color: colorInput.value
    });

    // Clear input and set next color
    nameInput.value = '';
    colorIndex = (colorIndex + 1) % classColors.length;
    colorInput.value = classColors[colorIndex];
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
    if (event.key === 'Enter') {
        addClass();
    }
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

    // Check for duplicate
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
    if (event.key === 'Enter') {
        addPerson();
    }
}

// ============================================
// Time Slots Management
// ============================================
function applyTemplate(template) {
    // Clear selection
    document.querySelectorAll('.template-card').forEach(el => el.classList.remove('selected'));
    event.target.closest('.template-card').classList.add('selected');

    setupData.timeSlots = [];

    switch (template) {
        case 'school':
            setupData.timeSlots = [
                { start: '08:00', end: '09:00' },
                { start: '09:00', end: '10:00' },
                { start: '10:00', end: '11:00' },
                { start: '11:00', end: '12:00' },
                { start: '12:00', end: '13:00' },
                { start: '13:00', end: '14:00' },
                { start: '14:00', end: '15:00' }
            ];
            break;
        case 'halfday':
            setupData.timeSlots = [
                { start: '09:00', end: '10:00' },
                { start: '10:00', end: '11:00' },
                { start: '11:00', end: '12:00' }
            ];
            break;
        case 'custom':
            // Start with one empty slot
            setupData.timeSlots = [
                { start: '09:00', end: '10:00' }
            ];
            break;
    }

    renderTimeSlots();
    updateButtonStates();
}

function addTimeSlot() {
    // Calculate next slot time based on last slot
    let startTime = '09:00';
    let endTime = '10:00';

    if (setupData.timeSlots.length > 0) {
        const lastSlot = setupData.timeSlots[setupData.timeSlots.length - 1];
        startTime = lastSlot.end;

        // Add 1 hour for end time
        const [hours, mins] = startTime.split(':').map(Number);
        const endHours = (hours + 1) % 24;
        endTime = `${endHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    setupData.timeSlots.push({ start: startTime, end: endTime });
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

    container.innerHTML = setupData.timeSlots.map((slot, index) => `
        <div class="time-slot-row">
            <span>Period ${index + 1}:</span>
            <input type="time" value="${slot.start}" onchange="updateTimeSlot(${index}, 'start', this.value)">
            <span>to</span>
            <input type="time" value="${slot.end}" onchange="updateTimeSlot(${index}, 'end', this.value)">
            <button class="remove-slot" onclick="removeTimeSlot(${index})">&times;</button>
        </div>
    `).join('');
}

// ============================================
// Review Step
// ============================================
function populateReview() {
    // School ID
    document.getElementById('reviewSchool').innerHTML = `
        <span class="review-item" style="font-weight: 500;">${setupData.schoolId}</span>
    `;

    // Classes
    document.getElementById('reviewClassCount').textContent = setupData.classes.length;
    document.getElementById('reviewClasses').innerHTML = setupData.classes.map(cls => `
        <span class="review-item" style="border-left: 3px solid ${cls.color}; padding-left: 0.6rem;">
            ${cls.name}
        </span>
    `).join('');

    // People
    document.getElementById('reviewPeopleCount').textContent = setupData.people.length;
    document.getElementById('reviewPeople').innerHTML = setupData.people.map(person => `
        <span class="review-item">${person}</span>
    `).join('');

    // Time Slots
    document.getElementById('reviewSlotsCount').textContent = setupData.timeSlots.length;
    document.getElementById('reviewSlots').innerHTML = setupData.timeSlots.map((slot, index) => `
        <span class="review-item">
            Period ${index + 1}: ${formatTime12Hour(slot.start)} - ${formatTime12Hour(slot.end)}
        </span>
    `).join('');

    // Accounts
    document.getElementById('reviewAccountCount').textContent = setupData.accounts.length;
    if (setupData.accounts.length > 0) {
        document.getElementById('reviewAccounts').innerHTML = setupData.accounts.map(acc => `
            <span class="review-item">${acc.email}</span>
        `).join('');
    } else {
        document.getElementById('reviewAccounts').innerHTML = '<span class="review-item" style="color: #999;">None (only you)</span>';
    }
}

// ============================================
// Finish Setup
// ============================================
async function finishSetup() {
    const loadingEl = document.getElementById('setupLoading');
    loadingEl.classList.add('active');

    try {
        // Build the timetable data structure
        const classColorsMap = {};
        setupData.classes.forEach(cls => {
            classColorsMap[cls.name] = cls.color;
        });

        const timetableData = {
            version: '1.0',
            setupComplete: true,
            schoolId: setupData.schoolId,
            createdAt: new Date().toISOString(),
            peopleList: setupData.people,
            classList: setupData.classes.map(c => c.name),
            classColors: classColorsMap,
            assignments: {
                monday: {},
                tuesday: {},
                wednesday: {},
                thursday: {},
                friday: {}
            },
            timeSlots: setupData.timeSlots
        };

        // Save to AWS using the custom schoolId
        // Note: You may need to update the API to accept custom schoolId
        await saveTimetable(timetableData);

        // Show success
        loadingEl.querySelector('p').textContent = 'Setup complete! Redirecting...';

        // Redirect to admin page (all users are admin for now)
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 1500);

    } catch (error) {
        loadingEl.classList.remove('active');
        console.error('Setup error:', error);
        alert('Failed to save timetable. Please try again.\n\n' + error.message);
    }
}

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Set initial color for class input
    const colorInput = document.getElementById('classColorInput');
    if (colorInput) {
        colorInput.value = classColors[0];
    }

    // Add input listener for school ID
    const schoolIdInput = document.getElementById('schoolIdInput');
    if (schoolIdInput) {
        schoolIdInput.addEventListener('input', updateButtonStates);
    }

    // Initialize button states
    updateButtonStates();
});

console.log('setup.js loaded');
