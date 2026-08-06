/* ================================================================
   SPACESHARE — SEARCH EMPTY STATE JS
   Flawless Logic to trigger this screen when API returns 0 results.
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
        // Desktop Elements
        desktopSearchInput: document.querySelector('.search-input'),
        desktopDeepSearchBtn: document.querySelector('.pill-search-btn'),
        filterChips: document.querySelectorAll('.filter-chip:not(.map-toggle-btn)'),
        mapToggleBtn: document.querySelector('.map-toggle-btn'),

        // Mobile Elements
        mobileBackBtn: document.querySelector('.pill-back-btn'),
        mobileFilterBtn: document.querySelector('.pill-filter-btn'),

        // Action Buttons
        clearFiltersBtn: document.querySelector('.btn-clear-filters'),
        searchNearbyBtn: document.querySelector('.btn-search-nearby'),

        // Navigation
        navItems: document.querySelectorAll('.nav-item'),
        sidebarItems: document.querySelectorAll('.sidebar-menu .nav-item')
    };

    // ================================================================
    // 3. STATE
    // ================================================================

    let state = {
        user: null,
        isLoading: false,
        searchQuery: '',
        lastFilters: {}
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
     * GET /api/workspaces - Fetch workspaces to check if empty
     */
    async function fetchWorkspaces(filters = {}) {
        try {
            const queryParams = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) queryParams.append(key, value);
            });
            const queryString = queryParams.toString();
            const endpoint = `/api/workspaces${queryString ? `?${queryString}` : ''}`;

            const data = await apiRequest(endpoint, { method: 'GET' });

            let workspaces = [];
            if (data.success && data.data) {
                workspaces = Array.isArray(data.data) ? data.data : data.data.workspaces || [];
            } else if (Array.isArray(data)) {
                workspaces = data;
            } else if (data.workspaces) {
                workspaces = data.workspaces;
            }
            return workspaces;
        } catch (error) {
            console.error('Failed to fetch workspaces:', error);
            return [];
        }
    }

    // ================================================================
    // 6. CORE LOGIC: CHECK EMPTY STATE
    // ================================================================

    /**
     * Main function to check if the API returned 0 results.
     * If 0 results are found, it stays on this page.
     * If results are found, it redirects to the List View.
     */
    async function checkEmptyState() {
        if (!isAuthenticated()) {
            console.warn('🔒 Not authenticated, redirecting to login...');
            logout();
            return;
        }

        // Retrieve filters from URL query params (if any)
        const urlParams = new URLSearchParams(window.location.search);
        const filters = {};
        urlParams.forEach((value, key) => {
            filters[key] = value;
        });

        console.log('🔍 Checking for workspaces with filters:', filters);

        try {
            const workspaces = await fetchWorkspaces(filters);

            if (workspaces.length > 0) {
                // ✅ Results found! Redirect to List View.
                console.log(`✅ Found ${workspaces.length} workspaces. Redirecting to List View.`);
                window.location.href = `search-list-view.html?${urlParams.toString()}`;
            } else {
                // ❌ No results found. Stay on this page.
                console.log('❌ No workspaces found. Displaying Empty State.');
                // You can optionally update the subtitle with the search query
                const query = filters.search || '';
                if (query && DOM.emptySubtitle) {
                    DOM.emptySubtitle.textContent = `No results found for "${query}". Try adjusting your filters.`;
                }
            }
        } catch (error) {
            console.error('Error checking workspace count:', error);
            // Fallback: Stay on empty state but show a toast
            showToast('Unable to load results. Please try again.');
        }
    }

    // ================================================================
    // 7. ACTION HANDLERS
    // ================================================================

    function handleClearFilters() {
        showToast('Redirecting to Dashboard...');
        window.location.href = 'seeker-dashboard.html';
    }

    function handleSearchNearby() {
        showToast('Opening Map View...');
        window.location.href = 'search-map-view.html';
    }

    function handleBack() {
        window.history.back();
    }

    function handleFilter() {
        showToast('Filter panel opening soon!');
    }

    // ================================================================
    // 8. TOAST NOTIFICATION SYSTEM
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
    // 9. INITIALIZATION
    // ================================================================

    function init() {
        console.log('🚀 SpaceShare — Search Empty State initializing...');
        console.log(`📍 API Base URL: ${API_BASE_URL}`);

        // 1. Authentication Check
        if (!isAuthenticated()) {
            console.warn('🔒 Not authenticated, redirecting to login...');
            logout();
            return;
        }

        // 2. Attach Event Listeners
        if (DOM.clearFiltersBtn) {
            DOM.clearFiltersBtn.addEventListener('click', handleClearFilters);
        }

        if (DOM.searchNearbyBtn) {
            DOM.searchNearbyBtn.addEventListener('click', handleSearchNearby);
        }

        if (DOM.mobileBackBtn) {
            DOM.mobileBackBtn.addEventListener('click', handleBack);
        }

        if (DOM.mobileFilterBtn) {
            DOM.mobileFilterBtn.addEventListener('click', handleFilter);
        }

        // 3. Run the Empty State Check
        checkEmptyState();

        console.log('✅ Search Empty State ready!');
    }

    // ================================================================
    // 10. START
    // ================================================================

    document.addEventListener('DOMContentLoaded', init);

})();