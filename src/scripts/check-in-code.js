/* ================================================================
   SPACESHARE — CHECK-IN CODE VIEW JS
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
        // Header
        backBtn: document.querySelector('.back-btn'),

        // Timer
        countdownDisplay: document.getElementById('countdownDisplay'),

        // Toggle Buttons
        qrToggle: document.getElementById('qrToggle'),
        codeToggle: document.getElementById('codeToggle'),
        qrSection: document.getElementById('qrSection'),
        codeSection: document.getElementById('codeSection'),

        // Copy Code
        copyCodeBtn: document.getElementById('copyCodeBtn'),

        // Workspace Details
        workspaceName: document.getElementById('workspaceName'),
        workspaceType: document.getElementById('workspaceType'),
        workspaceLocation: document.getElementById('workspaceLocation'),

        // Booking Details
        bookingDate: document.getElementById('bookingDate'),
        bookingTime: document.getElementById('bookingTime'),
        bookingDuration: document.getElementById('bookingDuration'),
        bookingTotal: document.getElementById('bookingTotal'),

        // Accordion
        detailsToggle: document.getElementById('bookingDetailsToggle'),
        detailsContent: document.getElementById('bookingDetailsContent'),
        detailsCaret: document.getElementById('detailsCaret'),

        // Action Buttons
        contactHostBtn: document.querySelector('.help-btn.contact-host'),
        getSupportBtn: document.querySelector('.help-btn.get-support'),
        cancelBookingBtn: document.querySelector('.help-btn.cancel-booking'),
        workspaceNavBtn: document.querySelector('.workspace-nav-btn'),
    };

    // ================================================================
    // 3. STATE
    // ================================================================

    let state = {
        bookingId: null,
        bookingData: null,
        workspaceData: null,
        countdownInterval: null,
        countdownSeconds: 1001, // 16 minutes and 41 seconds = 1001 seconds
        isCodeVisible: false,
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

    /**
     * PATCH /api/bookings/:id/cancel - Cancel booking
     */
    async function cancelBooking(bookingId, reason = 'User cancelled') {
        try {
            const data = await apiRequest(`/api/bookings/${bookingId}/cancel`, {
                method: 'PATCH',
                body: { reason }
            });
            return data;
        } catch (error) {
            console.error('Failed to cancel booking:', error);
            throw error;
        }
    }

    // ================================================================
    // 6. CORE LOGIC: LOAD CHECK-IN DATA
    // ================================================================

    async function loadCheckInData() {
        if (!isAuthenticated()) {
            console.warn('🔒 Not authenticated, redirecting to login...');
            logout();
            return;
        }

        // 1. Extract bookingId from URL
        const urlParams = new URLSearchParams(window.location.search);
        const bookingId = urlParams.get('id') || urlParams.get('bookingId');

        if (!bookingId) {
            alert('No booking ID found. Please go back to your bookings.');
            window.location.href = 'my-bookings.html';
            return;
        }

        state.bookingId = bookingId;
        console.log(`📦 Loading check-in for booking: ${bookingId}`);

        // 2. Fetch booking details
        const booking = await fetchBookingDetails(bookingId);
        if (!booking) {
            alert('Could not load booking details. Please try again.');
            window.location.href = 'my-bookings.html';
            return;
        }
        state.bookingData = booking;

        // 3. Fetch workspace details
        const workspaceId = booking.workspaceId || booking.workspace_id;
        if (!workspaceId) {
            alert('Workspace ID missing from booking.');
            window.location.href = 'my-bookings.html';
            return;
        }
        const workspace = await fetchWorkspaceDetails(workspaceId);
        if (!workspace) {
            alert('Could not load workspace details. Please try again.');
            window.location.href = 'my-bookings.html';
            return;
        }
        state.workspaceData = workspace;

        // 4. Render the UI
        renderCheckIn(booking, workspace);
    }

    // ================================================================
    // 7. RENDER FUNCTIONS
    // ================================================================

    function renderCheckIn(booking, workspace) {
        // --- Workspace Details ---
        if (DOM.workspaceName) {
            DOM.workspaceName.textContent = workspace.title || 'Untitled Workspace';
        }
        if (DOM.workspaceType) {
            DOM.workspaceType.textContent = workspace.workspace_type || 'Workspace';
        }
        if (DOM.workspaceLocation) {
            DOM.workspaceLocation.textContent = workspace.address || workspace.city || 'Location not specified';
        }

        // --- Booking Details ---
        const startTime = new Date(booking.startTime || booking.start_time);
        const endTime = new Date(booking.endTime || booking.end_time);
        const durationMs = endTime - startTime;
        const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));

        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = startTime.toLocaleDateString('en-US', options);
        const timeStr = `${startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} – ${endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

        const totalAmount = booking.totalAmount || booking.total_amount || 0;

        if (DOM.bookingDate) DOM.bookingDate.textContent = dateStr;
        if (DOM.bookingTime) DOM.bookingTime.textContent = timeStr;
        if (DOM.bookingDuration) DOM.bookingDuration.textContent = `${durationHours} Hour${durationHours !== 1 ? 's' : ''}`;
        if (DOM.bookingTotal) DOM.bookingTotal.textContent = `₦${Number(totalAmount).toLocaleString('en-NG')}`;

        // --- Check-In Code ---
        // If the backend returns a check-in code, use it. Otherwise, generate a random one.
        let checkinCode = booking.checkinCode || booking.checkin_code;
        
        if (!checkinCode) {
            // Generate a random 6-digit code for demo purposes
            checkinCode = Math.floor(100000 + Math.random() * 900000).toString();
            console.warn('⚠️ No check-in code from backend. Generated random code:', checkinCode);
        }

        // Ensure it's a string and exactly 6 digits
        const codeStr = String(checkinCode).padStart(6, '0').slice(0, 6);

        // Update the access code display
        const codeDisplay = document.querySelector('.code-number');
        if (codeDisplay) {
            codeDisplay.textContent = codeStr;
        }

        // Update the QR code data
        const qrImage = document.querySelector('.qr-image');
        if (qrImage) {
            qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=SPACESHARE-${codeStr}`;
        }

        // Store code for copy functionality
        state.checkinCode = codeStr;

        // --- Start Countdown ---
        startCountdown();
    }

    // ================================================================
    // 8. COUNTDOWN TIMER
    // ================================================================

    function startCountdown() {
        if (state.countdownInterval) {
            clearInterval(state.countdownInterval);
        }

        // Reset to 16:41 (1001 seconds) if not set
        if (!state.countdownSeconds) {
            state.countdownSeconds = 1001;
        }

        updateCountdownDisplay();

        state.countdownInterval = setInterval(() => {
            state.countdownSeconds--;
            
            if (state.countdownSeconds <= 0) {
                clearInterval(state.countdownInterval);
                state.countdownInterval = null;
                if (DOM.countdownDisplay) {
                    DOM.countdownDisplay.textContent = 'Expired';
                }
                return;
            }

            updateCountdownDisplay();
        }, 1000);
    }

    function updateCountdownDisplay() {
        if (!DOM.countdownDisplay) return;

        const minutes = Math.floor(state.countdownSeconds / 60);
        const seconds = state.countdownSeconds % 60;
        const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        DOM.countdownDisplay.textContent = `Expires in ${formattedTime}`;
    }

    // ================================================================
    // 9. TOGGLE HANDLERS (QR Code / Access Code)
    // ================================================================

    function showQRSection() {
        DOM.qrSection.classList.add('active');
        DOM.codeSection.classList.remove('active');
        DOM.qrToggle.classList.add('active');
        DOM.codeToggle.classList.remove('active');
        state.isCodeVisible = false;
    }

    function showCodeSection() {
        DOM.codeSection.classList.add('active');
        DOM.qrSection.classList.remove('active');
        DOM.codeToggle.classList.add('active');
        DOM.qrToggle.classList.remove('active');
        state.isCodeVisible = true;
    }

    // ================================================================
    // 10. COPY TO CLIPBOARD
    // ================================================================

    async function handleCopyCode() {
        if (!state.checkinCode) {
            alert('No code available to copy.');
            return;
        }

        try {
            await navigator.clipboard.writeText(state.checkinCode);
            
            // Show visual feedback
            const originalText = DOM.copyCodeBtn.innerHTML;
            DOM.copyCodeBtn.innerHTML = '<i class="ph-bold ph-check"></i> Copied!';
            DOM.copyCodeBtn.style.color = '#10B981';
            DOM.copyCodeBtn.style.borderColor = '#10B981';

            setTimeout(() => {
                DOM.copyCodeBtn.innerHTML = originalText;
                DOM.copyCodeBtn.style.color = '';
                DOM.copyCodeBtn.style.borderColor = '';
            }, 2000);
        } catch (error) {
            console.error('Failed to copy code:', error);
            alert('Failed to copy code. Please manually copy the code.');
        }
    }

    // ================================================================
    // 11. ACCORDION TOGGLE (Booking Details)
    // ================================================================

    function toggleBookingDetails() {
        const isOpen = DOM.detailsContent.classList.contains('open');
        
        if (isOpen) {
            DOM.detailsContent.classList.remove('open');
            DOM.detailsToggle.classList.remove('open');
        } else {
            DOM.detailsContent.classList.add('open');
            DOM.detailsToggle.classList.add('open');
        }
    }

    // ================================================================
    // 12. EVENT HANDLERS
    // ================================================================

    function handleBack() {
        window.history.back();
    }

    function handleContactHost() {
        alert('Contact Host feature coming soon!');
    }

    function handleGetSupport() {
        alert('Get Support feature coming soon!');
    }

    async function handleCancelBooking() {
        if (!state.bookingId) return;

        const confirmed = confirm('Are you sure you want to cancel this booking?');
        if (!confirmed) return;

        try {
            await cancelBooking(state.bookingId);
            alert('Booking cancelled successfully.');
            window.location.href = 'my-bookings.html';
        } catch (error) {
            console.error('Cancellation error:', error);
            alert('Failed to cancel booking. Please try again.');
        }
    }

    function handleWorkspaceNav() {
        if (state.workspaceData) {
            const id = state.workspaceData.id || state.workspaceData._id;
            window.location.href = `workspace-details.html?id=${id}`;
        }
    }

    // ================================================================
    // 13. INITIALIZATION
    // ================================================================

    function init() {
        console.log('🚀 SpaceShare — Check-In Code View initializing...');
        console.log(`📍 API Base URL: ${API_BASE_URL}`);

        // 1. Authentication Check
        if (!isAuthenticated()) {
            console.warn('🔒 Not authenticated, redirecting to login...');
            logout();
            return;
        }

        // 2. Attach Event Listeners
        if (DOM.backBtn) {
            DOM.backBtn.addEventListener('click', handleBack);
        }

        if (DOM.qrToggle) {
            DOM.qrToggle.addEventListener('click', showQRSection);
        }

        if (DOM.codeToggle) {
            DOM.codeToggle.addEventListener('click', showCodeSection);
        }

        if (DOM.copyCodeBtn) {
            DOM.copyCodeBtn.addEventListener('click', handleCopyCode);
        }

        if (DOM.detailsToggle) {
            DOM.detailsToggle.addEventListener('click', toggleBookingDetails);
        }

        if (DOM.contactHostBtn) {
            DOM.contactHostBtn.addEventListener('click', handleContactHost);
        }

        if (DOM.getSupportBtn) {
            DOM.getSupportBtn.addEventListener('click', handleGetSupport);
        }

        if (DOM.cancelBookingBtn) {
            DOM.cancelBookingBtn.addEventListener('click', handleCancelBooking);
        }

        if (DOM.workspaceNavBtn) {
            DOM.workspaceNavBtn.addEventListener('click', handleWorkspaceNav);
        }

        // 3. Load Check-In Data
        loadCheckInData();

        console.log('✅ Check-In Code View ready!');
    }

    // ================================================================
    // 14. START
    // ================================================================

    document.addEventListener('DOMContentLoaded', init);

})();