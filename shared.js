// Shared Firebase Configuration and Utilities
// Used by both admin.html and view.html

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBfwploSOHtEYfLZAgoyQdguU0AOFQTLik",
    authDomain: "timetable-planner-b709d.firebaseapp.com",
    databaseURL: "https://timetable-planner-b709d-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "timetable-planner-b709d",
    storageBucket: "timetable-planner-b709d.firebasestorage.app",
    messagingSenderId: "442836512942",
    appId: "1:442836512942:web:c84e9338b05863f83a3d3f"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Check authentication on page load
function checkAuth(requiredRole) {
    const userRole = sessionStorage.getItem('userRole');
    const userEmail = sessionStorage.getItem('userEmail');

    if (!userRole || !userEmail) {
        // Not logged in, redirect to login
        window.location.href = 'login.html';
        return false;
    }

    // Check if user has correct role for this page
    if (requiredRole && userRole !== requiredRole) {
        // Wrong role, redirect to correct page
        if (userRole === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'view.html';
        }
        return false;
    }

    // Verify Firebase auth
    auth.onAuthStateChanged((user) => {
        if (!user) {
            // Firebase session expired
            sessionStorage.clear();
            window.location.href = 'login.html';
        }
    });

    return true;
}

// Logout function
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        auth.signOut().then(() => {
            sessionStorage.clear();
            window.location.href = 'login.html';
        });
    }
}

// Time formatting utilities
function formatTime12Hour(time24) {
    // Safety check for undefined or invalid time
    if (!time24 || typeof time24 !== 'string') {
        console.error('Invalid time passed to formatTime12Hour:', time24);
        return 'Invalid Time';
    }
    
    const parts = time24.split(":");
    if (parts.length !== 2) {
        console.error('Invalid time format:', time24);
        return time24; // Return as-is if invalid
    }
    
    const [hours, minutes] = parts.map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
        console.error('Non-numeric time values:', time24);
        return time24;
    }
    
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function timeToMinutes(time24) {
    const parts = time24.split(":");
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    return hours * 60 + minutes;
}

function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

// Firebase utilities
function saveToFirebase(timetableData) {
    return database.ref('timetable/current').set(timetableData);
}

function loadFromFirebase() {
    return database.ref('timetable/current').once('value');
}

function initializeEmptyFirebase(userEmail) {
    return database.ref('timetable/current').once('value').then((snapshot) => {
        if (!snapshot.exists()) {
            const emptyStructure = {
                version: '1.0',
                lastUpdated: new Date().toISOString(),
                updatedBy: userEmail || 'system',
                peopleList: [],
                classList: [],
                classColors: {},
                assignments: {
                    monday: {},
                    tuesday: {},
                    wednesday: {},
                    thursday: {},
                    friday: {}
                },
                timeSlots: []
            };
            
            return database.ref('timetable/current').set(emptyStructure);
        }
    });
}

// Show notification
function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: ${isError ? '#fee' : '#e0f2fe'};
        color: ${isError ? '#c00' : '#0c5460'};
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border: 2px solid ${isError ? '#fcc' : '#bee5eb'};
        z-index: 9999;
        animation: slideInUp 0.3s ease;
        font-family: 'Work Sans', sans-serif;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Get user info
function getCurrentUser() {
    return {
        email: sessionStorage.getItem('userEmail'),
        role: sessionStorage.getItem('userRole'),
        userId: sessionStorage.getItem('userId')
    };
}

// Days array
const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];

// Default colors for classes
const defaultColors = [
    "#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#10b981",
    "#06b6d4", "#6366f1", "#a855f7", "#f43f5e", "#14b8a6",
    "#84cc16", "#eab308", "#f59e0b", "#ef4444", "#22c55e",
    "#f472b6", "#fb7185", "#fbbf24", "#34d399", "#60a5fa"
];

console.log('✅ shared.js loaded');
