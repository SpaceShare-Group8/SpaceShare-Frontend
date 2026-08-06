/* ================================================================
   SPACESHARE — SEARCH LIST VIEW JS
   Full Backend Integration with Token Persistence
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
    // 2. DOM REFERENCES (Based on search-list-view.html)
    // ================================================================

    const DOM = {
        // Header Search
        searchInput: document.querySelector('.top-header .search-input'),

        // Deep Search Pill (Filters)
        pillLocation: document.querySelector('.pill-segment:nth-child(1) .pill-value'),
        pillDate: document.querySelector('.pill-segment:nth-child(3) .pill-value'),
        pillTime: document.querySelector('.pill-segment:nth-child(5) .pill-value'),
        pillSearchBtn: document.querySelector('.pill-search-btn'),

        // Filter Chips
        filterChips: document.querySelectorAll('.filter-chip:not(.map-toggle-btn)'),
        mapToggleBtn: document.querySelector('.map-toggle-btn'),

        // Results Count
        resultsCount: document.querySelector('.results-count'),
        resultsSubtitle: document.querySelector('.results-subtitle'),

        // Card Container
        listContainer: document.getElementById('listViewContainer'),

        // Navigation
        navItems: document.querySelectorAll('.sidebar-menu .nav-item')
    };

    // ================================================================
    // 3. STATE
    // ================================================================

    let state = {
        workspaces: [],
        favorites: [],
        currentFilter: null,
        searchQuery: '',
        isLoading: false,
        user: null
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

    /**
     * GET /api/workspaces/find-me-power-now - Find power-verified spaces
     */
    async function findMePowerNow(latitude, longitude) {
        try {
            const endpoint = `/api/workspaces/find-me-power-now?latitude=${latitude}&longitude=${longitude}&radius=10`;
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
            console.error('Find Me Power Now failed:', error);
            return null;
        }
    }

    // ================================================================
    // 6. RENDER FUNCTIONS
    // ================================================================

    /**
     * Create a List Card HTML element (Matches the exact Figma design)
     */
    function createListCardHTML(space, isFavorite = false) {
        const id = space.id || space._id;
        const title = space.title || 'Untitled Space';
        const type = space.workspace_type || 'Workspace';
        const location = space.address || space.city || 'Location not specified';
        const rating = space.rating || 0;
        const reviews = space.reviewCount || space.reviews || 0;
        const price = space.hourly_rate || space.price || 0;
        const distance = space.distance || '2.5 km Away';
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

        const isFav = isFavorite || (state.favorites && state.favorites.some(f => f.workspaceId === id || f._id === id));

        // Amenity icon mapping
        const amenityIcons = {
            'wifi': 'ph-bold ph-wifi-high',
            'ac': 'ph-bold ph-snowflake',
            'parking': 'ph-fill ph-car-profile',
            'coffee': 'ph-bold ph-coffee',
            'generator': 'ph-bold ph-car-battery',
            'sound system': 'ph-fill ph-microphone',
            'changing room': 'ph-bold ph-coat-hanger',
            'soundproof': 'ph-bold ph-speaker-simple-x'
        };

        const amenityChips = amenities.map(amen => {
            const key = amen.toLowerCase();
            const icon = amenityIcons[key] || 'ph-bold ph-check-circle';
            return `<button class="amenity-chip"><i class="${icon}"></i> ${amen}</button>`;
        }).join('');

        return `
            <article class="list-card" data-id="${id}">
                <div class="list-card-image-wrapper">
                    <img src="${imageUrl}" alt="${title}" class="list-card-img" loading="lazy" />
                    <div class="list-card-overlays">
                        <span class="badge-type">${type}</span>
                    </div>
                </div>
                <div class="list-card-details">
                    <div class="list-card-header">
                        <h3 class="list-card-title">${title}</h3>
                        <div class="list-card-header-actions">
                            <button class="icon-btn-compare" aria-label="Compare">
                                <i class="ph ph-arrows-left-right"></i>
                            </button>
                            <button class="icon-btn-fav ${isFav ? 'active' : ''}" data-id="${id}" aria-label="Add to favourites">
                                <i class="${isFav ? 'ph-fill' : 'ph'} ph-heart" style="${isFav ? 'color: #FF383C;' : ''}"></i>
                            </button>
                        </div>
                    </div>
                    <p class="list-card-subtitle">${type}</p>
                    <div class="list-card-meta">
                        <div class="meta-rating">
                            <i class="ph-fill ph-star" style="color: #FFC107;"></i>
                            <span>${rating.toFixed(1)} <small>(${reviews})</small></span>
                        </div>
                        <div class="meta-divider"></div>
                        <div class="meta-distance">
                            <i class="ph-fill ph-map-pin"></i>
                            <span>${distance}</span>
                        </div>
                    </div>
                    <div class="list-card-amenities">
                        ${amenityChips}
                    </div>
                    <div class="list-card-footer">
                        <p class="list-card-price">₦ ${formattedPrice} <small>/hr</small></p>
                        <button class="btn-view-space" data-id="${id}">
                            View Space <i class="ph-bold ph-caret-right"></i>
                        </button>
                    </div>
                </div>
            </article>
        `;
    }

    /**
     * Render the search results into the list container
     */
    function renderWorkspaces(workspaces) {
        if (!DOM.listContainer) return;

        const spaces = workspaces || state.workspaces || [];

        if (spaces.length === 0) {
            DOM.listContainer.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 60px 20px; color: var(--text-gray);">
                    <i class="ph ph-buildings" style="font-size: 48px; display: block; margin-bottom: 16px;"></i>
                    <p style="font-size: 20px; font-weight: 600; color: var(--text-dark);">No workspaces found</p>
                    <p style="font-size: 16px; color: var(--text-light-gray);">Try adjusting your filters or search another location</p>
                    <button class="filter-chip" style="margin-top: 20px; background: var(--primary-blue); color: white; border: none; padding: 10px 24px;" onclick="window.location.href='seeker-dashboard.html'">
                        Clear Filters <i class="ph-bold ph-caret-right"></i>
                    </button>
                </div>
            `;
            if (DOM.resultsCount) DOM.resultsCount.textContent = '0 WORKSPACES FOUND';
            if (DOM.resultsSubtitle) DOM.resultsSubtitle.textContent = 'No matches nearby';
            return;
        }

        DOM.listContainer.innerHTML = spaces
            .map(space => createListCardHTML(space))
            .join('');

        // Update results count
        if (DOM.resultsCount) DOM.resultsCount.textContent = `${spaces.length} WORKSPACES FOUND`;
        if (DOM.resultsSubtitle) DOM.resultsSubtitle.textContent = `Showing matches nearby`;

        // Attach event listeners to the new cards
        attachCardEvents();
    }

    /**
     * Attach events to List Cards (Fav button & View Space button)
     */
    function attachCardEvents() {
        // Favorite buttons
        document.querySelectorAll('.icon-btn-fav').forEach(btn => {
            btn.removeEventListener('click', handleFavoriteToggle);
            btn.addEventListener('click', handleFavoriteToggle);
        });

        // View Space buttons
        document.querySelectorAll('.btn-view-space').forEach(btn => {
            btn.removeEventListener('click', handleViewSpace);
            btn.addEventListener('click', handleViewSpace);
        });

        // Compare buttons
        document.querySelectorAll('.icon-btn-compare').forEach(btn => {
            btn.removeEventListener('click', handleCompare);
            btn.addEventListener('click', handleCompare);
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

        // Optimistic UI update
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
                    showToast('Removed from favourites');
                }
            } else {
                success = await addFavorite(workspaceId);
                if (success) {
                    state.favorites.push({ workspaceId });
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

    function handleViewSpace(e) {
        e.stopPropagation();
        const btn = e.currentTarget;
        const id = btn.dataset.id;
        window.location.href = `workspace-details.html?id=${id}`;
    }

    function handleCompare(e) {
        e.stopPropagation();
        const btn = e.currentTarget;
        const card = btn.closest('.list-card');
        const id = card.dataset.id;
        // Future implementation: store selected IDs in sessionStorage and redirect to compare page
        showToast('Compare mode coming soon!');
    }

    // ================================================================
    // 8. SEARCH & FILTER LOGIC
    // ================================================================

    let searchTimeout;

    function handleSearchInput(e) {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        searchTimeout = setTimeout(() => {
            if (query.length >= 2 || query.length === 0) {
                performSearch(query);
            }
        }, 400);
    }

    async function performSearch(query) {
        state.searchQuery = query;
        if (query.length < 2) {
            await loadWorkspaces();
            return;
        }

        showToast(`🔍 Searching for "${query}"...`);
        try {
            const workspaces = await fetchWorkspaces({ search: query });
            if (workspaces.length > 0) {
                state.workspaces = workspaces;
                renderWorkspaces(workspaces);
                showToast(`Found ${workspaces.length} result${workspaces.length !== 1 ? 's' : ''}`);
            } else {
                state.workspaces = [];
                renderWorkspaces([]);
                showToast('No results found for your search');
            }
        } catch (error) {
            console.error('Search error:', error);
            showToast('Error searching. Please try again.');
        }
    }
    // Inside search-list-view.js, search-grid-view.js, or search-map-view.js
const workspaces = await fetchWorkspaces(filters);

if (workspaces.length === 0) {
    // OPTION 2 LOGIC: Immediately redirect to the empty state page
    const query = DOM.searchInput?.value.trim() || '';
    window.location.href = `search-empty-state.html?search=${encodeURIComponent(query)}`;
    return;
}

    async function handleFilterClick(e) {
        const chip = e.currentTarget;
        const filter = chip.dataset.filter;

        // Toggle active state
        DOM.filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.currentFilter = filter;

        const filterNames = {
            type: 'Workspace Type',
            price: 'Price Range',
            power: 'Power Reliability',
            capacity: 'Capacity',
            amenities: 'Amenities',
            workspace: 'Workspace Type',
            availability: 'Availability'
        };

        showToast(`Filter: ${filterNames[filter] || filter}`);
        await loadWorkspaces({ filter: filter });
    }

    async function handleDeepSearch() {
        // Collect values from the pill segments
        const location = DOM.pillLocation ? DOM.pillLocation.textContent : '';
        const date = DOM.pillDate ? DOM.pillDate.textContent : '';
        const time = DOM.pillTime ? DOM.pillTime.textContent : '';

        showToast(`🔍 Searching in ${location}...`);
        await loadWorkspaces({ 
            city: location.split(',')[0].trim(),
            date: date,
            time: time
        });
    }

    // ================================================================
    // 9. LOAD DATA FUNCTIONS
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
        console.log('🚀 SpaceShare — Search List View initializing...');
        console.log(`📍 API Base URL: ${API_BASE_URL}`);

        // 1. Authentication Check
        if (!isAuthenticated()) {
            console.warn('🔒 Not authenticated, redirecting to login...');
            logout();
            return;
        }

        // 2. Attach Event Listeners
        if (DOM.searchInput) {
            DOM.searchInput.addEventListener('input', handleSearchInput);
        }

        if (DOM.pillSearchBtn) {
            DOM.pillSearchBtn.addEventListener('click', handleDeepSearch);
        }

        DOM.filterChips.forEach(chip => {
            chip.addEventListener('click', handleFilterClick);
        });

        // 3. Load Data
        loadDashboardData();

        console.log('✅ Search List View ready!');
    }

    // ================================================================
    // 12. START
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