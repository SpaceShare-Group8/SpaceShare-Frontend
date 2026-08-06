/* ================================================================
   SPACESHARE — BOOKING CONFIRMATION LOGIC (booking-confirmation.js)
   Full Backend Integration with Token Persistence
   API: https://spaceshare-backend-cor9.onrender.com
   ================================================================ */

(function() {
    'use strict';

    // ================================================================
    // 1. CONFIGURATION
    // ================================================================

    const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000'
        : 'https://spaceshare-backend-cor9.onrender.com';

    const STORAGE_KEYS = {
        ACCESS_TOKEN: 'access_token',
        REFRESH_TOKEN: 'refresh_token',
        USER: 'user'
    };

    // ================================================================
    // 2. DOM REFERENCES
    // ================================================================

    const DOM = {
        // Workspace Details
        workspaceTitle: document.getElementById('workspaceTitle'),
        workspaceLocation: document.getElementById('workspaceLocation'),

        // Booking Details
        bookingDate: document.getElementById('bookingDate'),
        bookingTime: document.getElementById('bookingTime'),
        bookingDuration: document.getElementById('bookingDuration'),
        workspaceType: document.getElementById('workspaceType'),
        totalPaid: document.getElementById('totalPaid'),

        // Booking Code
        codeDigits: document.querySelectorAll('.code-digit'),

        // Buttons
        viewBookingsBtn: document.getElementById('viewBookingsBtn'),
        getDirectionsBtn: document.getElementById('getDirectionsBtn'),
    };

    // ================================================================
    // 3. STATE
    // ================================================================

    let state = {
        bookingId: null,
        bookingData: null,
        workspaceData: null,
    };

    // ================================================================
    // 4. API HELPERS (Core Token Logic)
    // ================================================================

    function getAccessToken() {
        return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    }

    function getRefreshToken() {
        return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
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
            let response = await fetch(url, config);

            if (response.status === 401) {
                console.warn('🔄 Token expired. Attempting refresh...');
                const refreshed = await refreshToken();

                if (refreshed) {
                    headers['Authorization'] = `Bearer ${getAccessToken()}`;
                    const retryConfig = { ...config, headers };
                    response = await fetch(url, retryConfig);
                } else {
                    logout();
                    throw new Error('Session expired. Please log in again.');
                }
            }

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

    async function refreshToken() {
        const refreshToken = getRefreshToken();
        if (!refreshToken) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            const data = await response.json();

            if (response.ok && data.accessToken) {
                localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
                if (data.refreshToken) {
                    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }

    // ================================================================
    // 5. API ENDPOINT FUNCTIONS
    // ================================================================

    /**
     * GET /api/bookings/:id - Fetch booking details
     */
    async function fetchBookingDetails(bookingId) {
        try {
            const data = await apiRequest(`/api/bookings/${bookingId}`, { method: 'GET' });
            return data.data?.booking || data.booking || data;
        } catch (error) {
            console.error('Failed to fetch booking details:', error);
            return null;
        }
    }

    /**
     * GET /api/workspaces/:id - Fetch workspace details
     */
    async function fetchWorkspaceDetails(workspaceId) {
        try {
            const data = await apiRequest(`/api/workspaces/${workspaceId}`, { method: 'GET' });
            return data.data || data;
        } catch (error) {
            console.error('Failed to fetch workspace details:', error);
            return null;
        }
    }

    // ================================================================
    // 6. CORE LOGIC: LOAD CONFIRMATION DATA
    // ================================================================

    async function loadConfirmationData() {
        if (!isAuthenticated()) {
            console.warn('🔒 Not authenticated, redirecting to login...');
            logout();
            return;
        }

        // 1. Extract bookingId from URL
        const urlParams = new URLSearchParams(window.location.search);
        const bookingId = urlParams.get('bookingId');

        if (!bookingId) {
            alert('No booking ID found. Please start your booking again.');
            window.location.href = 'booking.html';
            return;
        }

        state.bookingId = bookingId;
        console.log(`📦 Loading confirmation for booking: ${bookingId}`);

        // 2. Fetch booking details
        const booking = await fetchBookingDetails(bookingId);
        if (!booking) {
            alert('Could not load booking details. Please try again.');
            window.location.href = 'booking.html';
            return;
        }
        state.bookingData = booking;

        // 3. Fetch workspace details
        const workspaceId = booking.workspaceId || booking.workspace_id;
        if (!workspaceId) {
            alert('Workspace ID missing from booking.');
            window.location.href = 'booking.html';
            return;
        }
        const workspace = await fetchWorkspaceDetails(workspaceId);
        if (!workspace) {
            alert('Could not load workspace details. Please try again.');
            window.location.href = 'booking.html';
            return;
        }
        state.workspaceData = workspace;

        // 4. Render the UI
        renderConfirmation(booking, workspace);
    }

    // ================================================================
    // 7. RENDER FUNCTIONS
    // ================================================================

    function renderConfirmation(booking, workspace) {
        // --- Workspace Details ---
        if (DOM.workspaceTitle) {
            DOM.workspaceTitle.textContent = workspace.title || 'Untitled Workspace';
        }
        if (DOM.workspaceLocation) {
            const locationText = workspace.address || workspace.city || 'Location not specified';
            DOM.workspaceLocation.innerHTML = `<i class="ph-bold ph-map-pin"></i> ${locationText}`;
        }

        // --- Booking Summary ---
        const startTime = new Date(booking.startTime || booking.start_time);
        const endTime = new Date(booking.endTime || booking.end_time);
        const durationMs = endTime - startTime;
        const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));

        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = startTime.toLocaleDateString('en-US', options);
        const timeStr = `${startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} – ${endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

        if (DOM.bookingDate) DOM.bookingDate.textContent = dateStr;
        if (DOM.bookingTime) DOM.bookingTime.textContent = timeStr;
        if (DOM.bookingDuration) DOM.bookingDuration.textContent = `${durationHours} Hour${durationHours !== 1 ? 's' : ''}`;
        if (DOM.workspaceType) DOM.workspaceType.textContent = workspace.workspace_type || workspace.title || 'Workspace';

        // --- Total Paid ---
        const totalAmount = booking.totalAmount || booking.total_amount || 16931;
        if (DOM.totalPaid) {
            DOM.totalPaid.textContent = `₦${Number(totalAmount).toLocaleString('en-NG')}`;
        }

        // --- Booking Code (6-Digit) ---
        // If the backend returns a check-in code, use it. Otherwise, generate a random one.
        let checkinCode = booking.checkinCode || booking.checkin_code;
        
        if (!checkinCode) {
            // Generate a random 6-digit code for demo purposes
            checkinCode = Math.floor(100000 + Math.random() * 900000).toString();
            console.warn('⚠️ No check-in code from backend. Generated random code:', checkinCode);
        }

        // Ensure it's a string and exactly 6 digits
        const codeStr = String(checkinCode).padStart(6, '0').slice(0, 6);

        if (DOM.codeDigits && DOM.codeDigits.length === 6) {
            DOM.codeDigits.forEach((digitEl, index) => {
                digitEl.textContent = codeStr[index] || '0';
            });
        }
    }

    // ================================================================
    // 8. EVENT HANDLERS
    // ================================================================

    function handleViewBookings() {
        window.location.href = 'my-bookings.html';
    }

    function handleGetDirections() {
        if (state.workspaceData) {
            const location = state.workspaceData.address || state.workspaceData.city || 'Lagos, Nigeria';
            // Open Google Maps with the location
            const encodedLocation = encodeURIComponent(location);
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodedLocation}`, '_blank');
        } else {
            alert('Location information is not available.');
        }
    }

    // ================================================================
    // 9. INITIALIZATION
    // ================================================================

    function init() {
        console.log('🚀 SpaceShare — Booking Confirmation Page initializing...');
        console.log(`📍 API Base URL: ${API_BASE_URL}`);

        // 1. Authentication Check
        if (!isAuthenticated()) {
            console.warn('🔒 Not authenticated, redirecting to login...');
            logout();
            return;
        }

        // 2. Attach Event Listeners
        if (DOM.viewBookingsBtn) {
            DOM.viewBookingsBtn.addEventListener('click', handleViewBookings);
        }
        if (DOM.getDirectionsBtn) {
            DOM.getDirectionsBtn.addEventListener('click', handleGetDirections);
        }

        // 3. Load Confirmation Data
        loadConfirmationData();

        console.log('✅ Booking Confirmation Page ready!');
    }

    // ================================================================
    // 10. START
    // ================================================================

    document.addEventListener('DOMContentLoaded', init);

})();