/* ================================================================
   SPACESHARE — SEARCH MAP VIEW JS
   Full Leaflet.js Integration with Backend API
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
        // Map Container
        mapContainer: document.getElementById('mapContainer'),

        // Mobile Search Header
        backBtn: document.querySelector('.pill-back-btn'),
        filterBtn: document.querySelector('.pill-filter-btn'),
        locationDisplay: document.querySelector('.pill-location-wrapper span'),

        // Desktop Interface
        desktopSearchInput: document.querySelector('.desktop-search-input'),
        desktopFilterChips: document.querySelectorAll('.desktop-filter-chips .filter-chip'),
        desktopToggleMapBtn: document.querySelector('.desktop-filter-chips .map-toggle-btn'),

        // Map Controls
        zoomInBtn: document.getElementById('zoomInBtn'),
        zoomOutBtn: document.getElementById('zoomOutBtn'),

        // Bottom Sheet
        bottomSheet: document.querySelector('.bottom-sheet'),
        sheetImage: document.querySelector('.bottom-sheet-img'),
        sheetFavBtn: document.querySelector('.bottom-sheet-fav-btn'),
        sheetTitle: document.querySelector('.bottom-sheet-title'),
        sheetSubtitle: document.querySelector('.bottom-sheet-subtitle'),
        sheetRating: document.querySelector('.meta-rating span'),
        sheetDistance: document.querySelector('.meta-distance span'),
        sheetAmenities: document.querySelector('.bottom-sheet-amenities'),
        sheetPrice: document.querySelector('.bottom-sheet-price'),
        sheetViewBtn: document.querySelector('.btn-view-space'),
        sheetCompareBtn: document.querySelector('.bottom-sheet-compare-btn')
    };

    // ================================================================
    // 3. STATE
    // ================================================================

    let state = {
        map: null,
        markers: [],
        workspaces: [],
        favorites: [],
        selectedWorkspace: null,
        userLat: 6.5244, // Default to Lagos, Nigeria
        userLng: 3.3792,
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
    // 5. API ENDPOINT FUNCTIONS (Postman Collection)
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

    // ================================================================
    // 6. MAP INITIALIZATION & MARKERS
    // ================================================================

    /**
     * Initialize Leaflet Map
     */
    function initMap() {
        if (!DOM.mapContainer) return;

        // Set default view to Lagos, Nigeria
        state.map = L.map('mapContainer', {
            center: [state.userLat, state.userLng],
            zoom: 13,
            zoomControl: false // We use custom zoom controls
        });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(state.map);

        // Connect custom zoom buttons
        if (DOM.zoomInBtn) {
            DOM.zoomInBtn.addEventListener('click', () => state.map.zoomIn());
        }
        if (DOM.zoomOutBtn) {
            DOM.zoomOutBtn.addEventListener('click', () => state.map.zoomOut());
        }

        // Get user's live location for better accuracy
        getUserLocation();
    }

    /**
     * Try to get user's live location, fallback to Lagos
     */
    function getUserLocation() {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                state.userLat = position.coords.latitude;
                state.userLng = position.coords.longitude;
                state.map.setView([state.userLat, state.userLng], 13);
                loadWorkspaces(); // Reload with fresh location
            },
            () => {
                console.warn('📍 User denied location. Using default Lagos coordinates.');
                loadWorkspaces();
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    /**
     * Create a Custom Marker with a Price Pill
     */
    function createMarker(workspace) {
        const lat = workspace.latitude || workspace.lat || 6.5244;
        const lng = workspace.longitude || workspace.lng || 3.3792;
        const price = workspace.hourly_rate || workspace.price || 0;
        const formattedPrice = typeof price === 'number'
            ? price.toLocaleString('en-NG')
            : price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

        // Custom DivIcon for the Price Pill
        const markerIcon = L.divIcon({
            className: 'custom-map-pill',
            html: `
                <div style="
                    background-color: #2862BC; 
                    color: #FFFFFF; 
                    padding: 6px 14px; 
                    border-radius: 20px; 
                    font-weight: 700; 
                    font-size: 13px; 
                    box-shadow: 0 4px 12px rgba(40, 98, 188, 0.35);
                    white-space: nowrap;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                ">
                    ₦${formattedPrice}/hr
                </div>
            `,
            iconSize: [80, 32],
            iconAnchor: [40, 16]
        });

        const marker = L.marker([lat, lng], { icon: markerIcon });

        // Bind click event to update Bottom Sheet
        marker.on('click', () => {
            selectWorkspace(workspace);
        });

        return marker;
    }

    /**
     * Render all workspaces onto the map
     */
    function renderMapMarkers(workspaces) {
        // Clear existing markers
        state.markers.forEach(marker => state.map.removeLayer(marker));
        state.markers = [];

        // If no workspaces, show a message
        if (!workspaces || workspaces.length === 0) {
            return;
        }

        workspaces.forEach(workspace => {
            const marker = createMarker(workspace);
            marker.addTo(state.map);
            state.markers.push(marker);
        });

        // Fit map bounds to show all markers
        if (state.markers.length > 0) {
            const group = L.featureGroup(state.markers);
            state.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    // ================================================================
    // 7. BOTTOM SHEET RENDER LOGIC
    // ================================================================

    /**
     * Select a workspace and update the Bottom Sheet
     */
    function selectWorkspace(workspace) {
        state.selectedWorkspace = workspace;
        renderBottomSheet(workspace);
        // Smooth scroll to bottom sheet on mobile
        if (window.innerWidth < 1024 && DOM.bottomSheet) {
            DOM.bottomSheet.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }

    /**
     * Render the Bottom Sheet with workspace data
     */
    function renderBottomSheet(workspace) {
        if (!DOM.bottomSheet) return;

        const id = workspace.id || workspace._id;
        const title = workspace.title || 'Untitled Space';
        const type = workspace.workspace_type || 'Workspace';
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

        const isFav = state.favorites.some(f => f.workspaceId === id || f._id === id);

        // Update DOM elements
        DOM.sheetImage.src = imageUrl;
        DOM.sheetImage.alt = title;
        DOM.sheetTitle.textContent = title;
        DOM.sheetSubtitle.textContent = type;
        DOM.sheetRating.innerHTML = `${rating.toFixed(1)} <small>(${reviews})</small>`;
        DOM.sheetDistance.textContent = location;
        DOM.sheetPrice.innerHTML = `₦${formattedPrice} <small>/hr</small>`;

        // Update Fav button state
        DOM.sheetFavBtn.dataset.id = id;
        const favIcon = DOM.sheetFavBtn.querySelector('i');
        if (isFav) {
            favIcon.className = 'ph-fill ph-heart';
            favIcon.style.color = '#FF383C';
        } else {
            favIcon.className = 'ph ph-heart';
            favIcon.style.color = '';
        }

        // Update Amenities
        DOM.sheetAmenities.innerHTML = amenities.map(amen => `
            <span class="amenity-chip"><i class="ph-bold ph-check-circle"></i> ${amen}</span>
        `).join('');

        // Update View Button
        DOM.sheetViewBtn.dataset.id = id;

        // Update Compare Button
        DOM.sheetCompareBtn.dataset.id = id;

        // Show the bottom sheet
        DOM.bottomSheet.style.display = 'block';
    }

    // ================================================================
    // 8. EVENT HANDLERS
    // ================================================================

    /**
     * Handle Favorites toggle from Bottom Sheet
     */
    async function handleSheetFavoriteToggle(e) {
        e.stopPropagation();
        const btn = e.currentTarget;
        const workspaceId = btn.dataset.id;
        const isCurrentlyFav = btn.classList.contains('active');
        const icon = btn.querySelector('i');

        // Optimistic update
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

    /**
     * Handle View Space button click
     */
    function handleViewSpace(e) {
        const btn = e.currentTarget;
        const id = btn.dataset.id;
        window.location.href = `workspace-details.html?id=${id}`;
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

    /**
     * Handle Search input on Desktop
     */
    let searchTimeout;
    function handleDesktopSearch(e) {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        searchTimeout = setTimeout(() => {
            if (query.length >= 2 || query.length === 0) {
                performSearch(query);
            }
        }, 400);
    }

    async function performSearch(query) {
        if (query.length < 2) {
            await loadWorkspaces();
            return;
        }
        showToast(`🔍 Searching for "${query}"...`);
        try {
            const workspaces = await fetchWorkspaces({ search: query });
            if (workspaces.length > 0) {
                state.workspaces = workspaces;
                renderMapMarkers(workspaces);
                showToast(`Found ${workspaces.length} result${workspaces.length !== 1 ? 's' : ''}`);
            } else {
                state.workspaces = [];
                renderMapMarkers([]);
                showToast('No results found for your search');
            }
        } catch (error) {
            console.error('Search error:', error);
            showToast('Error searching. Please try again.');
        }
    }

    /**
     * Handle Filter Chips on Desktop
     */
    async function handleFilterClick(e) {
        const chip = e.currentTarget;
        const filter = chip.dataset.filter;
        showToast(`Filter: ${filter}`);
        await loadWorkspaces({ filter: filter });
    }

    /**
     * Handle Toggle Map/List view
     */
    function handleToggleView(e) {
        e.preventDefault();
        window.location.href = 'search-list-view.html';
    }

    // ================================================================
    // 9. LOAD DATA FUNCTIONS
    // ================================================================

    async function loadWorkspaces(filters = {}) {
        try {
            state.isLoading = true;
            const workspaces = await fetchWorkspaces(filters);
            state.workspaces = workspaces || [];
            renderMapMarkers(state.workspaces);
            return state.workspaces;
        } catch (error) {
            console.error('Failed to load workspaces:', error);
            return [];
        } finally {
            state.isLoading = false;
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
        console.log('🚀 SpaceShare — Search Map View initializing...');
        console.log(`📍 API Base URL: ${API_BASE_URL}`);

        // 1. Authentication Check
        if (!isAuthenticated()) {
            console.warn('🔒 Not authenticated, redirecting to login...');
            logout();
            return;
        }

        // 2. Initialize Map
        initMap();

        // 3. Attach Event Listeners
        if (DOM.backBtn) {
            DOM.backBtn.addEventListener('click', handleBack);
        }

        if (DOM.filterBtn) {
            DOM.filterBtn.addEventListener('click', handleFilter);
        }

        if (DOM.desktopSearchInput) {
            DOM.desktopSearchInput.addEventListener('input', handleDesktopSearch);
        }

        DOM.desktopFilterChips.forEach(chip => {
            chip.addEventListener('click', handleFilterClick);
        });

        if (DOM.desktopToggleMapBtn) {
            DOM.desktopToggleMapBtn.addEventListener('click', handleToggleView);
        }

        if (DOM.sheetFavBtn) {
            DOM.sheetFavBtn.addEventListener('click', handleSheetFavoriteToggle);
        }

        if (DOM.sheetViewBtn) {
            DOM.sheetViewBtn.addEventListener('click', handleViewSpace);
        }

        // 4. Load Data
        loadDashboardData();

        console.log('✅ Search Map View ready!');
    }

    // ================================================================
    // 12. START
    // ================================================================

    document.addEventListener('DOMContentLoaded', init);

})();