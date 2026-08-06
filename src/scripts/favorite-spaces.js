/* ================================================================
   SPACESHARE — FAVORITES SCREEN JS
   Flawless Logic to fetch, render, and manage user favorites.
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

    const MAX_UNDO_TIME = 5000; // 5 seconds to undo a removal

    // ================================================================
    // 2. DOM REFERENCES
    // ================================================================

    const DOM = {
        // Header
        favoritesCount: document.getElementById('favoritesCount'),

        // Grid Container
        gridContainer: document.getElementById('favoritesGridContainer'),

        // Mobile Header
        mobileBackBtn: document.querySelector('.pill-back-btn'),
        mobileFilterBtn: document.querySelector('.pill-filter-btn'),

        // Toast & Undo
        toast: document.getElementById('favoriteToast'),
        undoBar: document.getElementById('undoBar'),
        undoBtn: document.querySelector('.undo-btn'),

        // Navigation
        navItems: document.querySelectorAll('.nav-item'),
        sidebarItems: document.querySelectorAll('.sidebar-menu .nav-item')
    };

    // ================================================================
    // 3. STATE
    // ================================================================

    let state = {
        favorites: [],           // Full workspace objects
        isLoading: false,
        removedItem: null,       // Store the removed workspace for undo
        undoTimeout: null
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
     * POST /api/favorites/:workspaceId - Add to favorites (For Undo)
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

    // ================================================================
    // 6. RENDER FUNCTIONS
    // ================================================================

    /**
     * Create a Favorite Card HTML element
     */
    function createFavoriteCardHTML(workspace) {
        const id = workspace.id || workspace._id || workspace.workspaceId;
        const title = workspace.title || workspace.name || 'Untitled Space';
        const type = workspace.type || workspace.workspace_type || 'Workspace';
        const location = workspace.address || workspace.city || 'Location not specified';
        const rating = workspace.rating || 0;
        const reviews = workspace.reviewCount || workspace.reviews || 0;
        const price = workspace.hourly_rate || workspace.price || 0;
        const imageUrl = workspace.images && workspace.images.length > 0
            ? workspace.images[0]
            : 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80';
        
        // Parse amenities
        let amenities = [];
        if (Array.isArray(workspace.amenities)) {
            amenities = workspace.amenities.slice(0, 3);
        } else if (typeof workspace.amenities === 'string') {
            amenities = workspace.amenities.split(',').map(a => a.trim()).slice(0, 3);
        } else {
            amenities = ['WiFi', 'AC', 'Parking'];
        }

        const formattedPrice = typeof price === 'number'
            ? price.toLocaleString('en-NG')
            : price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

        const priceSuffix = workspace.price_period === 'day' ? '/day' : '/hr';

        // Amenity icon mapping
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
            <article class="favorite-card" data-id="${id}">
                <div class="favorite-card-image-wrapper">
                    <img src="${imageUrl}" alt="${title}" class="favorite-card-img" loading="lazy" />
                    <button class="favorite-card-fav-btn active" data-id="${id}" aria-label="Remove from favourites">
                        <i class="ph-fill ph-heart" style="color: #FF383C;"></i>
                    </button>
                </div>
                <div class="favorite-card-details">
                    <div class="favorite-card-header">
                        <h3 class="favorite-card-title">${title}</h3>
                        <button class="favorite-card-compare-btn" data-id="${id}" aria-label="Compare">
                            <i class="ph ph-arrows-left-right"></i>
                        </button>
                    </div>
                    <p class="favorite-card-subtitle">${type}</p>
                    <div class="favorite-card-meta">
                        <div class="meta-rating">
                            <i class="ph-fill ph-star" style="color: #FFC107;"></i>
                            <span>${rating.toFixed(1)} <small>(${reviews})</small></span>
                        </div>
                        <div class="meta-divider"></div>
                        <div class="meta-distance">
                            <i class="ph-fill ph-map-pin"></i>
                            <span>${location}</span>
                        </div>
                    </div>
                    <div class="favorite-card-amenities">
                        ${amenityChips}
                    </div>
                    <div class="favorite-card-footer">
                        <div class="price-action-wrapper">
                            <p class="favorite-card-price">₦${formattedPrice}<small>${priceSuffix}</small></p>
                            <button class="remove-fav-btn" data-id="${id}">Remove from favourites</button>
                        </div>
                        <button class="btn-book-now" data-id="${id}">
                            Book Now <i class="ph-bold ph-caret-right"></i>
                        </button>
                    </div>
                </div>
            </article>
        `;
    }

    /**
     * Render all favorites into the grid
     */
    function renderFavorites(favorites) {
        if (!DOM.gridContainer) return;

        const items = favorites || state.favorites || [];

        // Update count
        if (DOM.favoritesCount) {
            DOM.favoritesCount.textContent = `(${items.length})`;
        }

        if (items.length === 0) {
            DOM.gridContainer.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-gray);">
                    <i class="ph-fill ph-heart" style="font-size: 48px; color: var(--border-color); display: block; margin-bottom: 16px;"></i>
                    <p style="font-size: 20px; font-weight: 600; color: var(--text-dark);">No favourites yet</p>
                    <p style="font-size: 16px; color: var(--text-light-gray);">Save workspace you love to favourites to quickly find them later.</p>
                    <button class="btn-book-now" style="margin-top: 20px; width: auto; padding: 10px 24px;" onclick="window.location.href='search-list-view.html'">
                        Browse Workspaces <i class="ph-bold ph-caret-right"></i>
                    </button>
                </div>
            `;
            return;
        }

        DOM.gridContainer.innerHTML = items
            .map(workspace => createFavoriteCardHTML(workspace))
            .join('');

        // Attach event listeners
        attachCardEvents();
    }

    /**
     * Attach events to Favorite Cards
     */
    function attachCardEvents() {
        // Remove buttons (Heart)
        document.querySelectorAll('.favorite-card-fav-btn').forEach(btn => {
            btn.removeEventListener('click', handleRemoveClick);
            btn.addEventListener('click', handleRemoveClick);
        });

        // Remove buttons (Text link)
        document.querySelectorAll('.remove-fav-btn').forEach(btn => {
            btn.removeEventListener('click', handleRemoveClick);
            btn.addEventListener('click', handleRemoveClick);
        });

        // Book Now buttons
        document.querySelectorAll('.btn-book-now').forEach(btn => {
            btn.removeEventListener('click', handleBookNow);
            btn.addEventListener('click', handleBookNow);
        });

        // Compare buttons
        document.querySelectorAll('.favorite-card-compare-btn').forEach(btn => {
            btn.removeEventListener('click', handleCompare);
            btn.addEventListener('click', handleCompare);
        });
    }

    // ================================================================
    // 7. EVENT HANDLERS
    // ================================================================

    /**
     * Handle Remove from Favorites (Heart or Text button)
     */
    async function handleRemoveClick(e) {
        e.stopPropagation();
        const btn = e.currentTarget;
        const workspaceId = btn.dataset.id;

        // Find the full workspace object before removing
        const workspaceToRemove = state.favorites.find(w => 
            (w.id || w._id || w.workspaceId) === workspaceId
        );

        if (!workspaceToRemove) return;

        // Optimistic UI: Hide the card immediately
        const card = btn.closest('.favorite-card');
        if (card) {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            setTimeout(() => card.remove(), 300);
        }

        // Update state locally
        state.favorites = state.favorites.filter(w => 
            (w.id || w._id || w.workspaceId) !== workspaceId
        );

        // Update count
        if (DOM.favoritesCount) {
            DOM.favoritesCount.textContent = `(${state.favorites.length})`;
        }

        // Show Undo Bar
        showUndoBar(workspaceToRemove);

        // Make the API call
        const success = await removeFavorite(workspaceId);

        if (!success) {
            // If API fails, revert the UI
            showToast('Failed to remove. Please try again.');
            renderFavorites(state.favorites);
        }
    }

    /**
     * Handle Book Now button click
     */
    function handleBookNow(e) {
        const btn = e.currentTarget;
        const id = btn.dataset.id;
        window.location.href = `booking.html?id=${id}`;
    }

    /**
     * Handle Compare button click
     */
    function handleCompare(e) {
        e.stopPropagation();
        const btn = e.currentTarget;
        const id = btn.dataset.id;

        // Store in sessionStorage for Compare Mode
        let compareList = JSON.parse(sessionStorage.getItem('spaceshare_compare_list') || '[]');
        if (!compareList.includes(id)) {
            compareList.push(id);
            if (compareList.length > 3) compareList.shift();
            sessionStorage.setItem('spaceshare_compare_list', JSON.stringify(compareList));
            showToast('Added to Compare');
        } else {
            showToast('Already in compare list');
        }
    }

    /**
     * Handle Back button click
     */
    function handleBack() {
        window.history.back();
    }

    /**
     * Handle Filter button click
     */
    function handleFilter() {
        showToast('Filter panel opening soon!');
    }

    // ================================================================
    // 8. UNDO BAR LOGIC
    // ================================================================

    function showUndoBar(workspace) {
        // Clear any existing timeout
        if (state.undoTimeout) {
            clearTimeout(state.undoTimeout);
            state.undoTimeout = null;
        }

        // Store the removed item
        state.removedItem = workspace;

        // Show the undo bar
        if (DOM.undoBar) {
            DOM.undoBar.classList.add('visible');
        }

        // Set timeout to auto-dismiss
        state.undoTimeout = setTimeout(() => {
            hideUndoBar();
            state.removedItem = null;
        }, MAX_UNDO_TIME);
    }

    function hideUndoBar() {
        if (DOM.undoBar) {
            DOM.undoBar.classList.remove('visible');
        }
        if (state.undoTimeout) {
            clearTimeout(state.undoTimeout);
            state.undoTimeout = null;
        }
    }

    async function handleUndo() {
        if (!state.removedItem) return;

        const id = state.removedItem.id || state.removedItem._id || state.removedItem.workspaceId;

        // Hide the undo bar immediately
        hideUndoBar();

        // Call API to add back
        const success = await addFavorite(id);

        if (success) {
            // Add back to state and re-render
            state.favorites.push(state.removedItem);
            renderFavorites(state.favorites);
            showToast('Restored to favourites');
        } else {
            showToast('Failed to undo. Please try again.');
        }

        state.removedItem = null;
    }

    // ================================================================
    // 9. TOAST NOTIFICATION SYSTEM
    // ================================================================

    let toastTimeout = null;

    function showToast(message) {
        if (!DOM.toast) return;

        // Reset animation
        DOM.toast.classList.remove('visible');
        if (toastTimeout) clearTimeout(toastTimeout);

        // Update content
        const content = DOM.toast.querySelector('.toast-content span');
        if (content) content.textContent = message;

        // Show
        setTimeout(() => {
            DOM.toast.classList.add('visible');
        }, 10);

        toastTimeout = setTimeout(() => {
            DOM.toast.classList.remove('visible');
            toastTimeout = null;
        }, 2800);
    }

    // ================================================================
    // 10. LOAD DATA FUNCTIONS
    // ================================================================

    async function loadFavorites() {
        if (!isAuthenticated()) {
            console.warn('🔒 Not authenticated, redirecting to login...');
            logout();
            return;
        }

        try {
            state.isLoading = true;
            const favorites = await fetchFavorites();
            state.favorites = favorites;
            renderFavorites(state.favorites);
            return state.favorites;
        } catch (error) {
            console.error('Failed to load favorites:', error);
            showToast('Error loading favorites. Please refresh.');
            return [];
        } finally {
            state.isLoading = false;
        }
    }

    // ================================================================
    // 11. INITIALIZATION
    // ================================================================

    function init() {
        console.log('🚀 SpaceShare — Favorites Screen initializing...');
        console.log(`📍 API Base URL: ${API_BASE_URL}`);

        // 1. Authentication Check
        if (!isAuthenticated()) {
            console.warn('🔒 Not authenticated, redirecting to login...');
            logout();
            return;
        }

        // 2. Attach Event Listeners
        if (DOM.mobileBackBtn) {
            DOM.mobileBackBtn.addEventListener('click', handleBack);
        }

        if (DOM.mobileFilterBtn) {
            DOM.mobileFilterBtn.addEventListener('click', handleFilter);
        }

        if (DOM.undoBtn) {
            DOM.undoBtn.addEventListener('click', handleUndo);
        }

        // 3. Load Favorites
        loadFavorites();

        console.log('✅ Favorites Screen ready!');
    }

    // ================================================================
    // 12. START
    // ================================================================

    document.addEventListener('DOMContentLoaded', init);

})();