/* ================================================================
   SPACESHARE — SEARCH GRID VIEW JS
   100% Backend Integration with Token Persistence
   API: https://spaceshare-backend-cor9.onrender.com
   ================================================================ */

(function() {
    'use strict';

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
    // 2. DOM REFERENCES (Based on search-grid-view.html)
    // ================================================================

    const DOM = {
        // Mobile Search Header
        backBtn: document.querySelector('.pill-back-btn'),
        filterBtn: document.querySelector('.pill-filter-btn'),
        locationDisplay: document.querySelector('.pill-location-wrapper span'),

        // Toggle Buttons
        toggleList: document.querySelector('.toggle-list'),
        toggleGrid: document.querySelector('.toggle-grid'),

        // Card Container
        gridContainer: document.getElementById('gridViewContainer'),

        // Saved Workspaces Indicator
        savedIndicator: document.querySelector('.saved-workspaces-indicator span'),

        // Navigation
        navItems: document.querySelectorAll('.bottom-nav .nav-item'),
        sidebarItems: document.querySelectorAll('.sidebar-menu .nav-item')
    };

    // ================================================================
    // 3. STATE
    // ================================================================

    let state = {
        workspaces: [],
        favorites: [],
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
    // 5. API ENDPOINT FUNCTIONS (Postman Collection Matches)
    // ================================================================

    /**
     * GET /api/workspaces - Fetch all workspaces with filters
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
            // Inside search-list-view.js, search-grid-view.js, or search-map-view.js
const workspaces = await fetchWorkspaces(filters);

if (workspaces.length === 0) {
    // OPTION 2 LOGIC: Immediately redirect to the empty state page
    const query = DOM.searchInput?.value.trim() || '';
    window.location.href = `search-empty-state.html?search=${encodeURIComponent(query)}`;
    return;
}
            
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

    /**
     * GET /api/favorites - Fetch user's favorites list
     */
    async function fetchFavorites() {
        try {
            const data = await apiRequest('/api/favorites', { method: 'GET' });
            let favorites = [];
            if (data.success && data.data) {
                favorites = Array.isArray(data.data) ? data.data : data.data.favorites || [];
            } else if (Array.isArray(data)) {
                favorites = data;
            } else if (data.favorites) {
                favorites = data.favorites;
            }
            return favorites;
        } catch (error) {
            console.error('Failed to fetch favorites:', error);
            return [];
        }
    }

    /**
     * POST /api/favorites/:workspaceId - Add to favorites
     */
    async function addFavorite(workspaceId) {
        try {
            const data = await apiRequest(`/api/favorites/${workspaceId}`, { method: 'POST' });
            return data.success || data.ok || true;
        } catch (error) {
            console.error('Failed to add favorite:', error);
            return false;
        }
    }

    /**
     * DELETE /api/favorites/:workspaceId - Remove from favorites
     */
    async function removeFavorite(workspaceId) {
        try {
            const data = await apiRequest(`/api/favorites/${workspaceId}`, { method: 'DELETE' });
            return data.success || data.ok || true;
        } catch (error) {
            console.error('Failed to remove favorite:', error);
            return false;
        }
    }

    // ================================================================
    // 6. RENDER FUNCTIONS
    // ================================================================

    /**
     * Create a Grid Card HTML element (Matches the exact Figma design)
     */
    function createGridCardHTML(space, isFavorite = false) {
        const id = space.id || space._id;
        const title = space.title || 'Untitled Space';
        const type = space.workspace_type || 'Workspace';
        const location = space.address || space.city || 'Location not specified';
        const rating = space.rating || 0;
        const reviews = space.reviewCount || space.reviews || 0;
        const price = space.hourly_rate || space.price || 0;
        const imageUrl = space.images && space.images.length > 0
            ? space.images[0]
            : 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80';
        
        // Parse amenities (assuming array or string)
        let amenities = [];
        if (Array.isArray(space.amenities)) {
            amenities = space.amenities.slice(0, 3);
        } else if (typeof space.amenities === 'string') {
            amenities = space.amenities.split(',').map(a => a.trim()).slice(0, 3);
        } else {
            amenities = ['WiFi', 'AC', 'Parking']; // Fallback
        }

        const formattedPrice = typeof price === 'number'
            ? price.toLocaleString('en-NG')
            : price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

        // Fix: `price` suffix detection (/hr, /day, etc.)
        const priceSuffix = space.price_period === 'day' ? '/day' : '/hr';

        const isFav = isFavorite || (state.favorites && state.favorites.some(f => f.workspaceId === id || f._id === id));

        // Amenity icon mapping (Same as List View)
        const amenityIcons = {
            'wifi': 'ph-bold ph-wifi-high',
            'ac': 'ph-bold ph-snowflake',
            'parking': 'ph-fill ph-car-profile',
            'coffee': 'ph-bold ph-coffee',
            'generator': 'ph-bold ph-car-battery',
            'sound system': 'ph-fill ph-microphone',
            'changing room': 'ph-bold ph-coat-hanger',
            'soundproof': 'ph-bold ph-speaker-simple-x',
            'projector': 'ph-bold ph-projector-screen',
            'whiteboard': 'ph-bold ph-chalkboard-simple'
        };

        const amenityChips = amenities.map(amen => {
            const key = amen.toLowerCase();
            const icon = amenityIcons[key] || 'ph-bold ph-check-circle';
            return `<span class="amenity-chip"><i class="${icon}"></i> ${amen}</span>`;
        }).join('');

        return `
            <article class="grid-card" data-id="${id}">
                <div class="grid-card-image-wrapper">
                    <img src="${imageUrl}" alt="${title}" class="grid-card-img" loading="lazy" />
                    <button class="grid-card-fav-btn ${isFav ? 'active' : ''}" data-id="${id}" aria-label="Toggle favourite">
                        <i class="${isFav ? 'ph-fill' : 'ph'} ph-heart" style="${isFav ? 'color: #FF383C;' : ''}"></i>
                    </button>
                </div>
                <div class="grid-card-details">
                    <div class="grid-card-header">
                        <h3 class="grid-card-title">${title}</h3>
                    </div>
                    <p class="grid-card-subtitle">${type}</p>
                    <div class="grid-card-meta">
                        <div class="meta-rating">
                            <i class="ph-fill ph-star" style="color: #FFC107;"></i>
                            <span>${rating.toFixed(1)} <small>(${reviews})</small></span>
                        </div>
                        <div class="meta-location">
                            <i class="ph-fill ph-map-pin"></i>
                            <span>${location}</span>
                        </div>
                    </div>
                    <div class="grid-card-amenities">
                        ${amenityChips}
                    </div>
                    <div class="grid-card-footer">
                        <p class="grid-card-price">₦${formattedPrice}<small>${priceSuffix}</small></p>
                        <button class="btn-book-now" data-id="${id}">
                            Book Now <i class="ph-bold ph-caret-right"></i>
                        </button>
                    </div>
                </div>
            </article>
        `;
    }

    /**
     * Render the search results into the grid container
     */
    function renderWorkspaces(workspaces) {
        if (!DOM.gridContainer) return;

        const spaces = workspaces || state.workspaces || [];

        if (spaces.length === 0) {
            DOM.gridContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-gray);">
                    <i class="ph ph-buildings" style="font-size: 48px; display: block; margin-bottom: 16px;"></i>
                    <p style="font-size: 20px; font-weight: 600; color: var(--text-dark);">No workspaces found</p>
                    <p style="font-size: 16px; color: var(--text-light-gray);">Try adjusting your filters or search another location</p>
                    <button class="filter-chip" style="margin-top: 20px; background: var(--primary-blue); color: white; border: none; padding: 10px 24px; border-radius: 9999px; cursor: pointer;" onclick="window.location.href='seeker-dashboard.html'">
                        Clear Filters <i class="ph-bold ph-caret-right"></i>
                    </button>
                </div>
            `;
            updateSavedIndicator(0);
            return;
        }

        DOM.gridContainer.innerHTML = spaces
            .map(space => createGridCardHTML(space))
            .join('');

        updateSavedIndicator(state.favorites.length);

        // Attach event listeners to the new cards
        attachCardEvents();
    }

    /**
     * Update the "Saved Workspaces" indicator count
     */
    function updateSavedIndicator(count) {
        if (DOM.savedIndicator) {
            DOM.savedIndicator.textContent = `Saved Workspaces (${count})`;
        }
    }

    /**
     * Attach events to Grid Cards (Fav button & Book Now button)
     */
    function attachCardEvents() {
        // Favorite buttons
        document.querySelectorAll('.grid-card-fav-btn').forEach(btn => {
            btn.removeEventListener('click', handleFavoriteToggle);
            btn.addEventListener('click', handleFavoriteToggle);
        });

        // Book Now buttons
        document.querySelectorAll('.btn-book-now').forEach(btn => {
            btn.removeEventListener('click', handleBookNow);
            btn.addEventListener('click', handleBookNow);
        });
    }

    // ================================================================
    // 7. EVENT HANDLERS
    // ================================================================

    async function handleFavoriteToggle(e) {
        e.stopPropagation();
        const btn = e.currentTarget;
        const workspaceId = btn.dataset.id;
        const isCurrentlyFav = btn.classList.contains('active');
        const icon = btn.querySelector('i');

        // Optimistic UI update (Instantly changes the heart)
        btn.classList.toggle('active');
        if (btn.classList.contains('active')) {
            icon.className = 'ph-fill ph-heart';
            icon.style.color = '#FF383C';
        } else {
            icon.className = 'ph ph-heart';
            icon.style.color = '';
        }

        try {
            let success;
            if (isCurrentlyFav) {
                success = await removeFavorite(workspaceId);
                if (success) {
                    state.favorites = state.favorites.filter(f => f.workspaceId !== workspaceId);
                    updateSavedIndicator(state.favorites.length);
                    showToast('Removed from favourites');
                }
            } else {
                success = await addFavorite(workspaceId);
                if (success) {
                    state.favorites.push({ workspaceId });
                    updateSavedIndicator(state.favorites.length);
                    showToast('Added to favourites ✨');
                }
            }

            if (!success) {
                // Revert on failure
                btn.classList.toggle('active');
                if (btn.classList.contains('active')) {
                    icon.className = 'ph-fill ph-heart';
                    icon.style.color = '#FF383C';
                } else {
                    icon.className = 'ph ph-heart';
                    icon.style.color = '';
                }
                showToast('Something went wrong. Please try again.');
            }
        } catch (error) {
            console.error('Favorite toggle error:', error);
            btn.classList.toggle('active');
            if (btn.classList.contains('active')) {
                icon.className = 'ph-fill ph-heart';
                icon.style.color = '#FF383C';
            } else {
                icon.className = 'ph ph-heart';
                icon.style.color = '';
            }
            showToast('Error updating favourites');
        }
    }

    function handleBookNow(e) {
        e.stopPropagation();
        const btn = e.currentTarget;
        const id = btn.dataset.id;
        // Redirect to the booking page for this workspace
        window.location.href = `booking.html?id=${id}`;
    }

    function handleBack() {
        window.history.back();
    }

    function handleFilter() {
        showToast('Filter panel opening soon!');
    }

    function handleToggleView(e) {
        e.preventDefault();
        if (e.currentTarget === DOM.toggleList) {
            window.location.href = 'search-list-view.html';
        }
    }

    // ================================================================
    // 8. LOAD DATA FUNCTIONS
    // ================================================================

    async function loadWorkspaces(filters = {}) {
        try {
            state.isLoading = true;
            const workspaces = await fetchWorkspaces(filters);
            state.workspaces = workspaces || [];
            renderWorkspaces(state.workspaces);
            return state.workspaces;
        } catch (error) {
            console.error('Failed to load workspaces:', error);
            return [];
        } finally {
            state.isLoading = false;
        }
    }

    async function loadDashboardData() {
        if (!isAuthenticated()) {
            console.warn('🔒 Not authenticated, redirecting to login...');
            logout();
            return;
        }

        try {
            state.favorites = await fetchFavorites();
            await loadWorkspaces();
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
        console.log('🚀 SpaceShare — Search Grid View initializing...');
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

        if (DOM.filterBtn) {
            DOM.filterBtn.addEventListener('click', handleFilter);
        }

        if (DOM.toggleList) {
            DOM.toggleList.addEventListener('click', handleToggleView);
        }

        if (DOM.toggleGrid) {
            DOM.toggleGrid.addEventListener('click', handleToggleView);
        }

        // 3. Load Data
        loadDashboardData();

        console.log('✅ Search Grid View ready!');
    }

    // ================================================================
    // 11. START
    // ================================================================

    document.addEventListener('DOMContentLoaded', init);

})();


// Add this inside your search-list-view.js or search-grid-view.js
function handleCompare(e) {
    e.stopPropagation();
    const btn = e.currentTarget;
    const card = btn.closest('.list-card') || btn.closest('.grid-card');
    const id = card.dataset.id;

    // Get current selection from sessionStorage
    let compareList = JSON.parse(sessionStorage.getItem('spaceshare_compare_list') || '[]');

    if (compareList.includes(id)) {
        showToast('Already in comparison list');
        return;
    }

    // Add ID to list (max 3)
    compareList.push(id);
    if (compareList.length > 3) {
        compareList.shift(); // Remove the oldest one
    }

    sessionStorage.setItem('spaceshare_compare_list', JSON.stringify(compareList));
    showToast(`Added to compare (${compareList.length}/3)`);

    // Update button visual (optional)
    btn.style.color = '#2862BC';
    btn.style.borderColor = '#2862BC';
}