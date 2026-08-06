/* ================================================================
   SPACESHARE — COMPARE MODE JS
   Flawless Logic to fetch selected workspaces and render the table.
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
        USER: 'user',
        COMPARE_LIST: 'spaceshare_compare_list' // Stores array of workspace IDs
    };

    // ================================================================
    // 2. DOM REFERENCES
    // ================================================================

    const DOM = {
        // Header
        backBtn: document.querySelector('.back-btn'),
        selectionPill: document.querySelector('.selection-pill'),

        // Image Cards Container
        imageCardsContainer: document.querySelector('.compare-image-cards'),

        // Table Elements
        tableHead: document.querySelector('.comparison-table thead tr'),
        tableBody: document.querySelector('.comparison-table tbody'),
        tableFoot: document.querySelector('.comparison-table tfoot tr'),

        // Swipe Indicator
        swipeIndicator: document.querySelector('.swipe-indicator'),

        // Navigation
        navItems: document.querySelectorAll('.nav-item'),
        sidebarItems: document.querySelectorAll('.sidebar-menu .nav-item')
    };

    // ================================================================
    // 3. STATE
    // ================================================================

    let state = {
        workspaces: [], // Full workspace objects fetched from API
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
     * GET /api/workspaces/:id - Fetch a single workspace by ID
     */
    async function fetchWorkspaceById(id) {
        try {
            const data = await apiRequest(`/api/workspaces/${id}`, { method: 'GET' });
            // Handle response formats: { data } or { success: true, data: {...} } or direct object
            return data.data || data;
        } catch (error) {
            console.error(`Failed to fetch workspace ${id}:`, error);
            return null;
        }
    }

    // ================================================================
    // 6. CORE LOGIC: FETCH & RENDER COMPARISON
    // ================================================================

    /**
     * Main function to load the comparison data
     */
    async function loadComparison() {
        if (!isAuthenticated()) {
            console.warn('🔒 Not authenticated, redirecting to login...');
            logout();
            return;
        }

        // 1. Retrieve the list of selected IDs from sessionStorage
        const compareListJson = sessionStorage.getItem(STORAGE_KEYS.COMPARE_LIST);
        let selectedIds = [];

        try {
            selectedIds = compareListJson ? JSON.parse(compareListJson) : [];
        } catch (e) {
            console.error('Failed to parse comparison list:', e);
            selectedIds = [];
        }

        // Validate: Must have 2 or 3 items
        if (selectedIds.length < 2 || selectedIds.length > 3) {
            showToast('Please select 2 to 3 workspaces to compare.');
            // Redirect back to search after a delay
            setTimeout(() => {
                window.location.href = 'search-list-view.html';
            }, 2000);
            return;
        }

        // 2. Update the selection pill
        if (DOM.selectionPill) {
            DOM.selectionPill.textContent = `${selectedIds.length} selected`;
        }

        // 3. Fetch full details for each ID
        state.isLoading = true;
        showToast('Loading comparison data...');

        try {
            const fetchPromises = selectedIds.map(id => fetchWorkspaceById(id));
            const results = await Promise.all(fetchPromises);
            
            // Filter out any failed fetches (null results)
            state.workspaces = results.filter(w => w !== null);

            if (state.workspaces.length < 2) {
                showToast('Could not load all selected workspaces. Please try again.');
                setTimeout(() => {
                    window.location.href = 'search-list-view.html';
                }, 2000);
                return;
            }

            // 4. Render the UI
            renderImageCards();
            renderComparisonTable();
            
            state.isLoading = false;
            showToast('Comparison loaded successfully!');

        } catch (error) {
            console.error('Error loading comparison:', error);
            showToast('Failed to load comparison data. Please try again.');
            state.isLoading = false;
        }
    }

    // ================================================================
    // 7. RENDER FUNCTIONS
    // ================================================================

    /**
     * Render the top Image Cards
     */
    function renderImageCards() {
        if (!DOM.imageCardsContainer) return;

        DOM.imageCardsContainer.innerHTML = state.workspaces.map(workspace => {
            const title = workspace.title || 'Untitled Space';
            const imageUrl = workspace.images && workspace.images.length > 0
                ? workspace.images[0]
                : 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80';

            return `
                <div class="compare-card-image-wrapper">
                    <img src="${imageUrl}" alt="${title}" class="compare-card-img" />
                    <div class="compare-card-name-badge">${title}</div>
                </div>
            `;
        }).join('');
    }

    /**
     * Render the full Comparison Table
     */
    function renderComparisonTable() {
        if (!DOM.tableHead || !DOM.tableBody || !DOM.tableFoot) return;

        // 1. Render Table Header (Column Titles)
        DOM.tableHead.innerHTML = `
            <th class="feature-column-header">FEATURES</th>
            ${state.workspaces.map(w => `<th>${w.title || 'Untitled'}</th>`).join('')}
        `;

        // 2. Render Table Body (Rows)
        const rows = [
            { label: 'Type', key: 'workspace_type', fallback: 'Workspace' },
            { label: 'Price', key: 'hourly_rate', fallback: '0' },
            { label: 'Reliability score', key: 'reliability_score', fallback: '0' },
            { label: 'Amenities', key: 'amenities', fallback: [] },
            { label: 'Reviews', key: 'rating', fallback: 0 },
            { label: 'Distance', key: 'distance', fallback: 'N/A' }
        ];

        DOM.tableBody.innerHTML = rows.map(row => {
            const rowData = state.workspaces.map(w => {
                const value = w[row.key] !== undefined ? w[row.key] : row.fallback;
                return formatCellValue(row.key, value);
            });

            return `
                <tr>
                    <td class="feature-name">${row.label}</td>
                    ${rowData.map(cell => `<td>${cell}</td>`).join('')}
                </tr>
            `;
        }).join('');

        // 3. Render Table Footer (Book Now Buttons)
        DOM.tableFoot.innerHTML = `
            <td></td>
            ${state.workspaces.map(w => `
                <td>
                    <button class="btn-book-now" data-id="${w.id || w._id}">
                        Book Now <i class="ph-bold ph-caret-right"></i>
                    </button>
                </td>
            `).join('')}
        `;

        // 4. Attach event listeners to the new buttons
        document.querySelectorAll('.btn-book-now').forEach(btn => {
            btn.removeEventListener('click', handleBookNow);
            btn.addEventListener('click', handleBookNow);
        });
    }

    // ================================================================
    // 8. FORMATTING HELPERS (For the table cells)
    // ================================================================

    function formatCellValue(key, value) {
        switch (key) {
            case 'hourly_rate':
                const price = typeof value === 'number' ? value : parseInt(value) || 0;
                return `₦${price.toLocaleString('en-NG')} <small>/hr</small>`;

            case 'reliability_score':
                const score = typeof value === 'number' ? value : parseInt(value) || 0;
                if (score >= 95) return `<span class="reliability-high">${score}% Uptime</span>`;
                if (score >= 80) return `<span class="reliability-medium">${score}% Uptime</span>`;
                return `<span class="reliability-low">${score}% Uptime</span>`;

            case 'amenities':
                let amenities = [];
                if (Array.isArray(value)) amenities = value.slice(0, 3);
                else if (typeof value === 'string') amenities = value.split(',').map(a => a.trim()).slice(0, 3);
                else amenities = ['WiFi', 'AC', 'Parking'];

                return `
                    <div class="amenity-chips-row">
                        ${amenities.map(amen => `
                            <span class="amenity-chip"><i class="ph-bold ph-check-circle"></i> ${amen}</span>
                        `).join('')}
                    </div>
                `;

            case 'rating':
                const rating = typeof value === 'number' ? value : parseFloat(value) || 0;
                const reviews = state.workspaces.find(w => w.id === w.id)?.reviewCount || 0;
                return `
                    <div class="rating-display">
                        <i class="ph-fill ph-star" style="color: #FFC107;"></i>
                        <span>${rating.toFixed(1)} <small>(${reviews})</small></span>
                    </div>
                `;

            case 'distance':
                return `
                    <div class="distance-display">
                        <i class="ph-fill ph-map-pin"></i>
                        <span>${value}</span>
                    </div>
                `;

            default:
                return value || '—';
        }
    }

    // ================================================================
    // 9. EVENT HANDLERS
    // ================================================================

    function handleBookNow(e) {
        const btn = e.currentTarget;
        const id = btn.dataset.id;
        window.location.href = `booking.html?id=${id}`;
    }

    function handleBack() {
        window.history.back();
    }

    // ================================================================
    // 10. TOAST NOTIFICATION SYSTEM
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
    // 11. INITIALIZATION
    // ================================================================

    function init() {
        console.log('🚀 SpaceShare — Compare Mode initializing...');
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

        // 3. Load the comparison data
        loadComparison();

        console.log('✅ Compare Mode ready!');
    }

    // ================================================================
    // 12. START
    // ================================================================

    document.addEventListener('DOMContentLoaded', init);

})();