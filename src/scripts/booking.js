// ================================================================
// SPACESHARE — BOOKING PAGE LOGIC (booking.js)
// Full Backend Integration with Token Persistence
// API: https://spaceshare-backend-cor9.onrender.com
// ================================================================

// ================================================================
// 1. CONFIGURATION
// ================================================================

// Auto-detects environment (localhost vs production)
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://spaceshare-backend-cor9.onrender.com';

const STORAGE_KEYS = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    USER: 'user'
};

// ================================================================
// 2. STATE & CONSTANTS
// ================================================================

// Note: In a real app, RATE and BAD_DAYS/SLOTS should be fetched from the backend
const RATE = 15000; // Standard rate per hour (Fallback)
const BAD_DAYS = [8, 17]; // Hardcoded blocked days for demo (Will be replaced by API)
const SLOTS = [
    "08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00",
    "12:00-13:00", "13:00-14:00", "14:00-15:00", "15:00-16:00",
    "16:00-17:00", "17:00-18:00", "18:00-19:00", "19:00-20:00",
];
const BAD_SLOTS = ["08:00-09:00", "15:00-16:00"]; // Hardcoded blocked slots for demo

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const today = new Date();
today.setHours(0, 0, 0, 0);

let viewYear = today.getFullYear();
let viewMonth = today.getMonth();
let pickedDate = null;
let rangeStart = null;
let rangeEnd = null;
let isSubmitting = false;

// ================================================================
// 3. DOM REFERENCES
// ================================================================

const DOM = {
    // Calendar
    calMonthEl: document.getElementById("calendarMonth"),
    calGridEl: document.getElementById("calendarGrid"),
    prevBtn: document.getElementById("prevMonth"),
    nextBtn: document.getElementById("nextMonth"),
    slotsEl: document.getElementById("timeSlots"),

    // Booking Controls
    typeSelect: document.getElementById("bookingType"),
    typeIcon: document.getElementById("bookingTypeIcon"),
    typeNoteText: document.getElementById("bookingTypeNoteText"),
    payNoteText: document.getElementById("paymentNoteText"),
    reqBtn: document.getElementById("requestBookingBtn"),
    reqBtnLabel: document.getElementById("requestBtnLabel"),
    requestNote: document.getElementById("requestNote"),
    backBtn: document.querySelector(".back_btn"),

    // Summary
    sumDate: document.getElementById("summaryDate"),
    sumTime: document.getElementById("summaryTime"),
    sumDuration: document.getElementById("summaryDuration"),
    sumTotal: document.getElementById("summaryTotal"),
};

// ================================================================
// 4. API HELPERS (Core Token Logic)
// ================================================================

function getAccessToken() {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

function isAuthenticated() {
    const token = getAccessToken();
    return !!token && token.length > 20;
}

function logout() {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    window.location.href = 'login.html';
}

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    let token = getAccessToken();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || `API Error: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error(`❌ API Request Failed (${endpoint}):`, error);
        throw error;
    }
}

// ================================================================
// 5. CALENDAR DRAWING LOGIC
// ================================================================

function drawCalendar() {
    DOM.calMonthEl.textContent = `${months[viewMonth]} ${viewYear}`;

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();

    DOM.calGridEl.innerHTML = "";
    for (let i = 0; i < firstDay; i++) {
        DOM.calGridEl.appendChild(document.createElement("span"));
    }

    for (let d = 1; d <= totalDays; d++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cal_day";
        btn.textContent = d;

        const past = new Date(viewYear, viewMonth, d) < today;
        const booked = BAD_DAYS.includes(d);
        btn.disabled = past || booked;

        if (pickedDate && pickedDate.y === viewYear && pickedDate.m === viewMonth && pickedDate.d === d) {
            btn.classList.add("is_selected");
        }

        if (!btn.disabled) {
            btn.onclick = () => {
                pickedDate = { y: viewYear, m: viewMonth, d };
                drawCalendar();
                updateSummary();
            };
        }

        DOM.calGridEl.appendChild(btn);
    }

    DOM.prevBtn.disabled = viewYear === today.getFullYear() && viewMonth === today.getMonth();
}

DOM.prevBtn.onclick = () => {
    viewMonth--;
    if (viewMonth < 0) {
        viewMonth = 11;
        viewYear--;
    }
    drawCalendar();
};

DOM.nextBtn.onclick = () => {
    viewMonth++;
    if (viewMonth > 11) {
        viewMonth = 0;
        viewYear++;
    }
    drawCalendar();
};

// ================================================================
// 6. TIME SLOTS LOGIC
// ================================================================

function drawSlots() {
    DOM.slotsEl.innerHTML = "";

    SLOTS.forEach((slot, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "slot";
        btn.textContent = slot;
        btn.disabled = BAD_SLOTS.includes(slot);

        const inRange = rangeStart !== null && i >= rangeStart && i <= (rangeEnd ?? rangeStart);
        if (inRange) btn.classList.add("is_selected");

        if (!btn.disabled) {
            btn.onclick = () => pickSlot(i);
        }

        DOM.slotsEl.appendChild(btn);
    });
}

function pickSlot(i) {
    if (rangeStart === null) {
        rangeStart = i;
        rangeEnd = null;
    } else if (rangeEnd === null) {
        if (i > rangeStart && !rangeHasBadSlot(rangeStart, i)) {
            rangeEnd = i;
        } else {
            rangeStart = i;
            rangeEnd = null;
        }
    } else {
        rangeStart = i;
        rangeEnd = null;
    }

    drawSlots();
    updateSummary();
}

function rangeHasBadSlot(start, end) {
    for (let i = start; i <= end; i++) {
        if (BAD_SLOTS.includes(SLOTS[i])) return true;
    }
    return false;
}

// ================================================================
// 7. SUMMARY & UI UPDATE LOGIC
// ================================================================

function updateSummary() {
    if (pickedDate) {
        const dObj = new Date(pickedDate.y, pickedDate.m, pickedDate.d);
        DOM.sumDate.textContent = `${weekdays[dObj.getDay()]}, ${ordinal(pickedDate.d)} ${months[pickedDate.m]} ${pickedDate.y}`;
    } else {
        DOM.sumDate.textContent = "Select a date";
    }

    if (rangeStart !== null) {
        const start = SLOTS[rangeStart].split("-")[0];
        const end = SLOTS[rangeEnd ?? rangeStart].split("-")[1];
        DOM.sumTime.textContent = `${start}-${end}`;

        const hours = (rangeEnd ?? rangeStart) - rangeStart + 1;
        DOM.sumDuration.textContent = hours === 1 ? "1 Hour" : `${hours} Hours`;
        DOM.sumTotal.textContent = `₦${(hours * RATE).toLocaleString("en-NG")}`;
    } else {
        DOM.sumTime.textContent = "Select a time";
        DOM.sumDuration.textContent = "-";
        DOM.sumTotal.textContent = "0";
    }

    DOM.reqBtn.disabled = !(pickedDate && rangeStart !== null);
}

function ordinal(d) {
    if (d % 10 === 1 && d !== 11) return d + "st";
    if (d % 10 === 2 && d !== 12) return d + "nd";
    if (d % 10 === 3 && d !== 13) return d + "rd";
    return d + "th";
}

// ================================================================
// 8. BOOKING TYPE TOGGLE LOGIC
// ================================================================

function applyType() {
    const instant = DOM.typeSelect.value === "instant";

    DOM.typeIcon.className = instant ? "ph-fill ph-lightning" : "ph-fill ph-clock";

    DOM.typeNoteText.textContent = instant
        ? "You can book and access the space immediately after payment."
        : "Your booking requires host approval before confirmation.";
    DOM.payNoteText.textContent = instant
        ? "Complete payment to instantly confirm your booking."
        : "The host typically responds within 24 hours.";
    DOM.reqBtnLabel.textContent = instant ? "Proceed to Payment" : "Request Booking";

    DOM.reqBtn.classList.toggle("is_outline", !instant);
    DOM.requestNote.style.display = instant ? "none" : "block";
}

DOM.typeSelect.onchange = applyType;

// ================================================================
// 9. BACK BUTTON LOGIC
// ================================================================

DOM.backBtn.onclick = () => window.history.back();

// ================================================================
// 10. SUBMIT BOOKING (BACKEND INTEGRATION)
// ================================================================

DOM.reqBtn.onclick = async () => {
    if (DOM.reqBtn.disabled) return;
    if (isSubmitting) return;

    // Validation: Ensure Date and Time are selected
    if (!pickedDate || rangeStart === null) {
        alert("Please select a date and a valid time range.");
        return;
    }

    // Construct the Date/Time strings in ISO format (Required by backend)
    // Example: 2026-08-10T14:00:00Z
    const startHour = SLOTS[rangeStart].split("-")[0];
    const endHour = SLOTS[rangeEnd ?? rangeStart].split("-")[1];
    const hours = (rangeEnd ?? rangeStart) - rangeStart + 1;

    const dateObj = new Date(pickedDate.y, pickedDate.m, pickedDate.d);
    const startTime = new Date(dateObj);
    startTime.setHours(parseInt(startHour.split(":")[0]), parseInt(startHour.split(":")[1]), 0);

    const endTime = new Date(dateObj);
    endTime.setHours(parseInt(endHour.split(":")[0]), parseInt(endHour.split(":")[1]), 0);

    const totalAmount = hours * RATE;

    // Extract Workspace ID from URL (assuming it's passed as ?id=123)
    const urlParams = new URLSearchParams(window.location.search);
    const workspaceId = urlParams.get('id') || "32e38db9-50f7-4ffa-97c5-b9d2acc56a80"; // Fallback to example ID

    // Set loading state
    isSubmitting = true;
    DOM.reqBtn.disabled = true;
    DOM.reqBtnLabel.textContent = "Processing...";

    try {
        console.log(`📤 Creating booking for workspace: ${workspaceId}`);
        
        const response = await apiRequest('/api/bookings', {
            method: 'POST',
            body: {
                workspaceId: workspaceId,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                totalAmount: totalAmount
            }
        });

        console.log('✅ Booking created successfully:', response);

        // Extract the booking ID from the response
        // The Postman doc shows: "data": { "booking": { "id": "..." } }
        const bookingId = response.data?.booking?.id || response.data?.id || response.id;

        if (!bookingId) {
            throw new Error("Booking ID not returned from server.");
        }

        // Determine Booking Mode (Instant or Request)
        const isInstant = DOM.typeSelect.value === "instant";

        // ------------------------------------------------------------
        // REDIRECT BASED ON BOOKING TYPE
        // ------------------------------------------------------------
        if (isInstant) {
            // Instant Booking -> Redirect to Checkout/Payment
            console.log(`🛒 Redirecting to checkout for booking: ${bookingId}`);
            window.location.href = `checkout.html?bookingId=${bookingId}`;
        } else {
            // Request Booking -> Redirect to Confirmation (Pending)
            console.log(`⏳ Redirecting to confirmation for booking: ${bookingId}`);
            window.location.href = `booking-confirmation.html?bookingId=${bookingId}&status=pending`;
        }

    } catch (error) {
        console.error('❌ Booking error:', error);
        
        // Handle specific error messages from backend
        let errorMessage = "Failed to create booking. Please try again.";
        if (error.message.includes("409") || error.message.includes("time slot is no longer available")) {
            errorMessage = "Selected time slot is no longer available. Please choose another time.";
        } else if (error.message.includes("403")) {
            errorMessage = "You are not authorized to make this booking. Please log in again.";
        } else if (error.message.includes("400")) {
            errorMessage = "Invalid booking details. Please check your selections.";
        }
        
        alert(errorMessage);
        DOM.reqBtnLabel.textContent = "Try Again";
        DOM.reqBtn.disabled = false;
        isSubmitting = false;
    }
};

// ================================================================
// 11. INITIALIZATION
// ================================================================

function init() {
    console.log('🚀 SpaceShare — Booking Page initializing...');
    console.log(`📍 API Base URL: ${API_BASE_URL}`);

    // Check Authentication
    if (!isAuthenticated()) {
        console.warn('🔒 Not authenticated, redirecting to login...');
        // Optional: Redirect to login if user tries to access this page directly
        // window.location.href = 'login.html';
        // return;
    }

    drawCalendar();
    drawSlots();
    applyType();
    updateSummary();

    console.log('✅ Booking Page ready!');
}

document.addEventListener('DOMContentLoaded', init);