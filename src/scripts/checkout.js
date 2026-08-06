/* ================================================================
   SPACESHARE — CHECKOUT PAGE LOGIC (checkout.js)
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
    // 2. DOM REFERENCES (Based on checkout.html)
    // ================================================================

    const DOM = {
        // Booking Summary (Left Panel)
        summaryDate: document.getElementById('summaryDate'),
        summaryTime: document.getElementById('summaryTime'),
        summaryDuration: document.getElementById('summaryDuration'),
        summaryTotal: document.getElementById('summaryTotal'),
        mobileTotal: document.getElementById('mobileTotal'),

        // Workspace Details (Static data will be updated by JS)
        workspaceTitle: document.querySelector('.checkout-workspace-title'),
        workspaceLocation: document.querySelector('.checkout-workspace-location span'),
        workspaceRating: document.querySelector('.checkout-workspace-rating span'),
        workspacePrice: document.querySelector('.checkout-workspace-price'),

        // Price Breakdown (Dynamic calculation)
        subtotalEl: document.querySelector('.price-row:nth-child(1) span:last-child'),
        serviceFeeEl: document.querySelector('.price-row:nth-child(2) span:last-child'),
        vatEl: document.querySelector('.price-row:nth-child(3) span:last-child'),
        totalEl: document.querySelector('.price-row.total span:last-child'),

        // Payment Methods
        paymentMethods: document.querySelectorAll('input[name="paymentMethod"]'),

        // Buttons
        continueBtnDesktop: document.getElementById('continuePaymentBtn'),
        continueBtnMobile: document.getElementById('mobileContinueBtn'),
    };

    // ================================================================
    // 3. STATE
    // ================================================================

    let state = {
        bookingId: null,
        bookingData: null,
        workspaceData: null,
        isProcessing: false,
        selectedPaymentMethod: 'card'
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
    // 5. API ENDPOINT FUNCTIONS (Postman Collection Matches)
    // ================================================================

    /**
     * GET /api/bookings/:id - Fetch booking details
     */
    async function fetchBookingDetails(bookingId) {
        try {
            const data = await apiRequest(`/api/bookings/${bookingId}`, { method: 'GET' });
            // Handle response: { data: { booking: {...} } } or direct object
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
     * POST /api/payments/initiate - Initiate payment
     */
    async function initiatePayment(bookingId, paymentMethod) {
        try {
            const data = await apiRequest('/api/payments/initiate', {
                method: 'POST',
                body: {
                    bookingId: bookingId,
                    paymentMethod: paymentMethod
                }
            });
            return data;
        } catch (error) {
            console.error('Payment initiation failed:', error);
            throw error;
        }
    }

    // ================================================================
    // 6. CORE LOGIC: LOAD CHECKOUT DATA
    // ================================================================

    async function loadCheckoutData() {
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
        console.log(`📦 Loading checkout for booking: ${bookingId}`);

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
        renderCheckout(booking, workspace);
    }

    // ================================================================
    // 7. RENDER FUNCTIONS
    // ================================================================

    function renderCheckout(booking, workspace) {
        // --- Workspace Details ---
        if (DOM.workspaceTitle) {
            DOM.workspaceTitle.textContent = workspace.title || 'Untitled Workspace';
        }
        if (DOM.workspaceLocation) {
            DOM.workspaceLocation.textContent = workspace.address || workspace.city || 'Location not specified';
        }
        if (DOM.workspaceRating) {
            const rating = workspace.rating || 0;
            const reviews = workspace.reviewCount || workspace.reviews || 0;
            DOM.workspaceRating.innerHTML = `${rating.toFixed(1)} <small>(${reviews} reviews)</small>`;
        }
        if (DOM.workspacePrice) {
            const rate = workspace.hourly_rate || workspace.price || 15000;
            DOM.workspacePrice.textContent = `₦${rate.toLocaleString('en-NG')} / hour`;
        }

        // --- Booking Summary ---
        const startTime = new Date(booking.startTime || booking.start_time);
        const endTime = new Date(booking.endTime || booking.end_time);
        const durationMs = endTime - startTime;
        const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));

        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = startTime.toLocaleDateString('en-US', options);
        const timeStr = `${startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} – ${endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

        if (DOM.summaryDate) DOM.summaryDate.textContent = dateStr;
        if (DOM.summaryTime) DOM.summaryTime.textContent = timeStr;
        if (DOM.summaryDuration) DOM.summaryDuration.textContent = `${durationHours} Hour${durationHours !== 1 ? 's' : ''}`;

        // --- Price Breakdown Calculation ---
        const baseRate = workspace.hourly_rate || workspace.price || 15000;
        const subtotal = baseRate * durationHours;
        const serviceFee = Math.round(subtotal * 0.05); // 5%
        const vat = Math.round(subtotal * 0.075); // 7.5%
        const total = subtotal + serviceFee + vat;

        const formatPrice = (amount) => `₦${amount.toLocaleString('en-NG')}`;

        if (DOM.subtotalEl) DOM.subtotalEl.textContent = formatPrice(subtotal);
        if (DOM.serviceFeeEl) DOM.serviceFeeEl.textContent = formatPrice(serviceFee);
        if (DOM.vatEl) DOM.vatEl.textContent = formatPrice(vat);
        if (DOM.totalEl) DOM.totalEl.textContent = formatPrice(total);
        if (DOM.summaryTotal) DOM.summaryTotal.textContent = formatPrice(total);
        if (DOM.mobileTotal) DOM.mobileTotal.textContent = formatPrice(total);
    }

    // ================================================================
    // 8. PAYMENT HANDLER
    // ================================================================

    async function handlePayment(e) {
        e.preventDefault();

        if (state.isProcessing) return;
        if (!state.bookingId) {
            alert('Booking ID is missing. Please refresh the page.');
            return;
        }

        // Get selected payment method
        const selected = document.querySelector('input[name="paymentMethod"]:checked');
        state.selectedPaymentMethod = selected ? selected.value : 'card';

        // Set loading state
        state.isProcessing = true;
        DOM.continueBtnDesktop.disabled = true;
        DOM.continueBtnDesktop.innerHTML = '<span class="btn-spinner"></span> Processing...';
        DOM.continueBtnMobile.disabled = true;
        DOM.continueBtnMobile.innerHTML = '<span class="btn-spinner"></span> Processing...';

        try {
            console.log(`💳 Initiating payment for booking: ${state.bookingId} via ${state.selectedPaymentMethod}`);
            
            const result = await initiatePayment(state.bookingId, state.selectedPaymentMethod);

            // --- Handle Payment Gateway Redirect ---
            // Based on Paystack/Flutterwave response, we expect a paymentUrl or authorization_url
            const paymentUrl = result.paymentUrl || result.data?.authorization_url || result.data?.payment_url;

            if (paymentUrl) {
                console.log(`✅ Redirecting to payment gateway: ${paymentUrl}`);
                window.location.href = paymentUrl;
            } else {
                // If no URL is returned, assume payment is handled inline or redirect to a generic success page
                console.log('✅ Payment initiated (no redirect URL). Redirecting to confirmation...');
                window.location.href = `booking-confirmation.html?bookingId=${state.bookingId}`;
            }

        } catch (error) {
            console.error('❌ Payment error:', error);
            
            let errorMessage = 'Failed to initiate payment. Please try again.';
            if (error.message.includes('403')) {
                errorMessage = 'Corporate budget exceeded or insufficient permissions.';
            } else if (error.message.includes('400')) {
                errorMessage = 'Invalid payment request. Please check your booking.';
            }
            
            alert(errorMessage);
            resetButtons();
        }
    }

    // ================================================================
    // 9. UI HELPERS
    // ================================================================

    function resetButtons() {
        state.isProcessing = false;
        DOM.continueBtnDesktop.disabled = false;
        DOM.continueBtnDesktop.innerHTML = 'Continue to Payment <i class="ph-bold ph-arrow-right"></i>';
        DOM.continueBtnMobile.disabled = false;
        DOM.continueBtnMobile.innerHTML = 'Continue to Payment <i class="ph-bold ph-arrow-right"></i>';
    }

    // ================================================================
    // 10. INITIALIZATION
    // ================================================================

    function init() {
        console.log('🚀 SpaceShare — Checkout Page initializing...');
        console.log(`📍 API Base URL: ${API_BASE_URL}`);

        // 1. Authentication Check
        if (!isAuthenticated()) {
            console.warn('🔒 Not authenticated, redirecting to login...');
            logout();
            return;
        }

        // 2. Attach Event Listeners
        DOM.continueBtnDesktop.addEventListener('click', handlePayment);
        DOM.continueBtnMobile.addEventListener('click', handlePayment);

        // 3. Load Checkout Data
        loadCheckoutData();

        console.log('✅ Checkout Page ready!');
    }

    // ================================================================
    // 11. START
    // ================================================================

    document.addEventListener('DOMContentLoaded', init);

})();