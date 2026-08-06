/* ================================================================
   SPACESHARE — MY BOOKINGS / BOOKING HISTORY JS
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
        // Page Header
        searchInput: document.querySelector('.page-search .search-input'),
        
        // Filter Dropdown
        filterTrigger: document.getElementById('filterDropdownTrigger'),
        filterMenu: document.getElementById('filterDropdownMenu'),
        filterOptions: document.querySelectorAll('.filter-option'),
        activeFilterLabel: document.getElementById('activeFilterLabel'),

        // Bookings List
        bookingsList: document.getElementById('bookingsList'),

        // Mobile Elements
        mobileBackBtn: document.querySelector('.pill-back-btn'),
        mobileFilterBtn: document.querySelector('.pill-filter-btn'),

        // Navigation
        bottomNavItems: document.querySelectorAll('.bottom-nav .nav-item'),
        sidebarItems: document.querySelectorAll('.sidebar-nav .nav-item')
    };

    // ================================================================
    // 3. STATE
    // ================================================================

    let state = {
        bookings: [],
        currentFilter: 'all',
        searchQuery: '',
        isLoading: false
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
     * GET /api/bookings - Fetch user's bookings
     * Supports pagination and status filtering
     */
    async function fetchBookings(filters = {}) {
        try {
            const queryParams = new URLSearchParams();
            
            // Always include role=seeker
            queryParams.append('role', 'seeker');
            
            // Add optional filters
            if (filters.status && filters.status !== 'all') {
                queryParams.append('status', filters.status);
            }
            if (filters.page) {
                queryParams.append('page', filters.page);
            }
            if (filters.limit) {
                queryParams.append('limit', filters.limit);
            }
            
            const queryString = queryParams.toString();
            const endpoint = `/api/bookings${queryString ? `?${queryString}` : ''}`;

            const data = await apiRequest(endpoint, { method: 'GET' });

            let bookings = [];
            if (data.success && data.data) {
                bookings = Array.isArray(data.data) ? data.data : data.data.bookings || [];
            } else if (Array.isArray(data)) {
                bookings = data;
            } else if (data.bookings) {
                bookings = data.bookings;
            }
            
            return bookings;
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
            return [];
        }
    }

    // ================================================================
    // 6. RENDER FUNCTIONS
    // ================================================================

    /**
     * Get the status badge class and label based on booking status
     */
    function getStatusConfig(status) {
        const statusMap = {
            'pending': { class: 'status-pending', label: 'Pending' },
            'in_progress': { class: 'status-in-progress', label: 'In Progress' },
            'in-progress': { class: 'status-in-progress', label: 'In Progress' },
            'upcoming': { class: 'status-upcoming', label: 'Upcoming' },
            'confirmed': { class: 'status-upcoming', label: 'Upcoming' },
            'completed': { class: 'status-completed', label: 'Completed' },
            'canceled': { class: 'status-canceled', label: 'Canceled' },
            'cancelled': { class: 'status-canceled', label: 'Canceled' }
        };
        
        const normalizedStatus = status?.toLowerCase() || 'pending';
        return statusMap[normalizedStatus] || { class: 'status-pending', label: 'Pending' };
    }

    /**
     * Format a date string into a readable format
     */
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    /**
     * Format a time string into a readable format
     */
    function formatTime(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    /**
     * Create a Booking Card HTML element
     */
    function createBookingCardHTML(booking) {
        const id = booking.id || booking._id;
        const workspaceName = booking.workspaceName || booking.workspace_title || 'Untitled Workspace';
        const location = booking.location || booking.city || 'Location not specified';
        const totalAmount = booking.totalAmount || booking.total_amount || 0;
        const imageUrl = booking.imageUrl || booking.image_url || 
            'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=200&q=80';
        
        const startTime = booking.startTime || booking.start_time;
        const endTime = booking.endTime || booking.end_time;
        const status = booking.status || 'pending';

        const statusConfig = getStatusConfig(status);
        const formattedPrice = `₦${Number(totalAmount).toLocaleString('en-NG')}`;

        // Format date and time
        const dateStr = formatDate(startTime);
        const timeStr = startTime && endTime 
            ? `${formatTime(startTime)} – ${formatTime(endTime)}`
            : 'N/A';

        return `
            <article class="booking-card" data-id="${id}" data-status="${status}">
                <div class="booking-card-image-wrapper">
                    <img src="${imageUrl}" alt="${workspaceName}" class="booking-card-img" loading="lazy" />
                </div>
                <div class="booking-card-details">
                    <div class="booking-card-header">
                        <h3 class="booking-card-title">${workspaceName}</h3>
                        <span class="status-badge ${statusConfig.class}">${statusConfig.label}</span>
                    </div>
                    <div class="booking-card-meta">
                        <div class="meta-row">
                            <i class="ph-bold ph-map-pin"></i>
                            <span>${location}</span>
                        </div>
                        <div class="meta-row">
                            <i class="ph-bold ph-calendar"></i>
                            <span>${dateStr}</span>
                        </div>
                        <div class="meta-row">
                            <i class="ph-bold ph-clock"></i>
                            <span>${timeStr}</span>
                        </div>
                    </div>
                    <div class="booking-card-footer">
                        <span class="booking-card-price">${formattedPrice}</span>
                        <button class="btn-view-booking" data-id="${id}">
                            View Details <i class="ph-bold ph-caret-right"></i>
                        </button>
                    </div>
                </div>
            </article>
        `;
    }

    /**
     * Render all bookings into the list
     */
    function renderBookings(bookings) {
        if (!DOM.bookingsList) return;

        const items = bookings || state.bookings || [];

        if (items.length === 0) {
            DOM.bookingsList.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 60px 20px; color: var(--text-gray);">
                    <i class="ph-fill ph-calendar-blank" style="font-size: 48px; color: var(--border-color); display: block; margin-bottom: 16px;"></i>
                    <p style="font-size: 20px; font-weight: 600; color: var(--text-dark);">No bookings found</p>
                    <p style="font-size: 16px; color: var(--text-light-gray);">${state.currentFilter !== 'all' ? `No ${state.currentFilter} bookings.` : 'Book a workspace to get started.'}</p>
                    <button class="btn-view-booking" style="margin-top: 20px; background: var(--primary-blue); color: white; padding: 10px 24px; border: none; border-radius: 9999px; font-weight: 600; cursor: pointer;" onclick="window.location.href='search-list-view.html'">
                        Browse Workspaces <i class="ph-bold ph-caret-right"></i>
                    </button>
                </div>
            `;
            return;
        }

        DOM.bookingsList.innerHTML = items
            .map(booking => createBookingCardHTML(booking))
            .join('');

        // Attach event listeners to the new cards
        attachCardEvents();
    }

    /**
     * Attach events to Booking Cards
     */
    function attachCardEvents() {
        document.querySelectorAll('.btn-view-booking').forEach(btn => {
            btn.removeEventListener('click', handleViewBooking);
            btn.addEventListener('click', handleViewBooking);
        });
    }

    // ================================================================
    // 7. EVENT HANDLERS
    // ================================================================

    /**
     * Handle View Details button click
     */
    function handleViewBooking(e) {
        const btn = e.currentTarget;
        const bookingId = btn.dataset.id;
        window.location.href = `booking-details.html?id=${bookingId}`;
    }

    /**
     * Handle Filter Dropdown Toggle
     */
    function toggleFilterDropdown() {
        DOM.filterMenu.classList.toggle('open');
        DOM.filterTrigger.classList.toggle('active');
    }

    /**
     * Handle Filter Option Selection
     */
    function handleFilterSelect(e) {
        const option = e.currentTarget;
        const filter = option.dataset.filter;

        // Update state
        state.currentFilter = filter;

        // Update active state on options
        DOM.filterOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');

        // Update trigger label
        DOM.activeFilterLabel.textContent = option.textContent;

        // Close dropdown
        DOM.filterMenu.classList.remove('open');
        DOM.filterTrigger.classList.remove('active');

        // Reload bookings with the new filter
        loadBookings({ status: filter });
    }

    /**
     * Handle Search Input (Debounced)
     */
    let searchTimeout;
    function handleSearchInput(e) {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        searchTimeout = setTimeout(() => {
            state.searchQuery = query;
            // Filter bookings by workspace name
            filterBookingsBySearch(query);
        }, 300);
    }

    /**
     * Filter bookings by search query (client-side)
     */
    function filterBookingsBySearch(query) {
        if (!query) {
            // If search is empty, re-render with current filter
            loadBookings({ status: state.currentFilter });
            return;
        }

        const filtered = state.bookings.filter(booking => {
            const name = (booking.workspaceName || booking.workspace_title || '').toLowerCase();
            return name.includes(query.toLowerCase());
        });

        renderBookings(filtered);
    }

    /**
     * Handle mobile back button
     */
    function handleMobileBack() {
        window.history.back();
    }

    /**
     * Handle mobile filter button
     */
    function handleMobileFilter() {
        // On mobile, this could open a bottom sheet or modal with filter options
        toggleFilterDropdown();
    }

    // ================================================================
    // 8. LOAD DATA FUNCTIONS
    // ================================================================

    /**
     * Load bookings from the backend
     */
    async function loadBookings(filters = {}) {
        try {
            state.isLoading = true;
            
            // Merge filters with current state
            const filterParams = {
                status: filters.status || state.currentFilter || 'all',
                ...filters
            };
            
            const bookings = await fetchBookings(filterParams);
            state.bookings = bookings || [];
            
            // Apply search filter if there's an active search
            if (state.searchQuery) {
                filterBookingsBySearch(state.searchQuery);
            } else {
                renderBookings(state.bookings);
            }
            
            return state.bookings;
        } catch (error) {
            console.error('Failed to load bookings:', error);
            showToast('Error loading bookings. Please refresh.');
            return [];
        } finally {
            state.isLoading = false;
        }
    }

    /**
     * Load initial dashboard data
     */
    async function loadDashboardData() {
        if (!isAuthenticated()) {
            console.warn('🔒 Not authenticated, redirecting to login...');
            logout();
            return;
        }

        try {
            await loadBookings({ status: 'all' });
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            showToast('Error loading data. Please refresh.');
        }
    }

    // ================================================================
    // 9. TOAST NOTIFICATION SYSTEM
    // ================================================================

    let toastTimeout = null;

    function showToast(message) {
        const existing = document.querySelector('.toast-notification');
        if (existing) existing.remove();
        if (toastTimeout) clearTimeout(toastTimeout);

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });

        toastTimeout = setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 350);
            toastTimeout = null;
        }, 2800);
    }

    // ================================================================
    // 10. INITIALIZATION
    // ================================================================

    function init() {
        console.log('🚀 SpaceShare — My Bookings Page initializing...');
        console.log(`📍 API Base URL: ${API_BASE_URL}`);

        // 1. Authentication Check
        if (!isAuthenticated()) {
            console.warn('🔒 Not authenticated, redirecting to login...');
            logout();
            return;
        }

        // 2. Attach Event Listeners
        // Filter Dropdown
        if (DOM.filterTrigger) {
            DOM.filterTrigger.addEventListener('click', toggleFilterDropdown);
        }

        DOM.filterOptions.forEach(option => {
            option.addEventListener('click', handleFilterSelect);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.filter-dropdown')) {
                DOM.filterMenu.classList.remove('open');
                DOM.filterTrigger.classList.remove('active');
            }
        });

        // Search Input
        if (DOM.searchInput) {
            DOM.searchInput.addEventListener('input', handleSearchInput);
        }

        // Mobile Buttons
        if (DOM.mobileBackBtn) {
            DOM.mobileBackBtn.addEventListener('click', handleMobileBack);
        }
        if (DOM.mobileFilterBtn) {
            DOM.mobileFilterBtn.addEventListener('click', handleMobileFilter);
        }

        // 3. Load Data
        loadDashboardData();

        console.log('✅ My Bookings Page ready!');
    }

    // ================================================================
    // 11. START
    // ================================================================

    document.addEventListener('DOMContentLoaded', init);

})();
