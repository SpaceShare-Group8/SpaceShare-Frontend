/* ================================================================
   SPACESHARE — SEEKER DASHBOARD JS (UPDATED)
   Full Backend Integration with Token Persistence
   API: https://spaceshare-backend-cor9.onrender.com
   Includes: Desktop Sidebar + Mobile Bottom Nav support
   ================================================================ */

(function() {
    'use strict';

    // ================================================================
    // 1. CONFIGURATION
    // ================================================================

    const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000'
        : 'https://spaceshare-backend-cor9.onrender.com';

    // ⚠️ CRITICAL: Matches login.js and role-selection.js exactly
    const STORAGE_KEYS = {
        ACCESS_TOKEN: 'access_token',
        REFRESH_TOKEN: 'refresh_token',
        USER: 'user'
    };

    // ================================================================
    // 2. DOM REFERENCES (Targeting the Header specifically)
    // ================================================================

    // We target the Header elements directly to avoid conflict with the Desktop Sidebar
    const headerAvatar = document.querySelector('.dashboard-header .user-avatar-wrapper');
    const headerAvatarInitials = headerAvatar ? headerAvatar.querySelector('.avatar-initials') : null;
    const headerUserNameDisplay = document.getElementById('userNameDisplay');

    const DOM = {
        // Header & Greeting
        userNameDisplay: headerUserNameDisplay,
        avatarInitials: headerAvatarInitials,
        
        // Instant Match
        instantMatchBtn: document.getElementById('instantMatchBtn'),
        
        // Summary Cards
        favouritesCount: document.querySelector('.summary-card:nth-child(1) .summary-card-subtitle'),
        bookingsCount: document.querySelector('.summary-card:nth-child(2) .summary-card-subtitle'),
        
        // Nearby Spaces Grid
        spacesGrid: document.getElementById('spacesGrid'),
        
        // Filter Chips
        filterChips: document.querySelectorAll('.filter-bar .filter-chip:not(.map-toggle-btn)'),
        mapToggleBtn: document.querySelector('.filter-bar .map-toggle-btn'),
        
        // Search Bar (Main Header)
        searchInput: document.querySelector('.dashboard-header .search-input'),
        
        // Notifications
        notificationDot: document.querySelector('.notification-dot'),
        
        // Bottom Nav (Mobile)
        navItems: document.querySelectorAll('.bottom-nav .nav-item'),
        
        // Desktop Sidebar (For active state management)
        sidebarItems: document.querySelectorAll('.desktop-sidebar .nav-item')
    };

    // ================================================================
    // 3. STATE
    // ================================================================

    let state = {
        user: null,
        workspaces: [],
        favorites: [],
        activeBookings: 0,
        isLoading: false,
        currentFilter: null,
        searchQuery: ''
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

    async function fetchCurrentUser() {
        try {
            const data = await apiRequest('/api/auth/me', { method: 'GET' });
            const user = data.user || data.data || data;
            if (user) {
                localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
                state.user = user;
                return user;
            }
            return null;
        } catch (error) {
            console.error('Failed to fetch user:', error);
            return null;
        }
    }

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

    async function addFavorite(workspaceId) {
        try {
            const data = await apiRequest(`/api/favorites/${workspaceId}`, { method: 'POST' });
            return data.success || data.ok || true;
        } catch (error) {
            console.error('Failed to add favorite:', error);
            return false;
        }
    }

    async function removeFavorite(workspaceId) {
        try {
            const data = await apiRequest(`/api/favorites/${workspaceId}`, { method: 'DELETE' });
            return data.success || data.ok || true;
        } catch (error) {
            console.error('Failed to remove favorite:', error);
            return false;
        }
    }

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

    function renderUserProfile() {
        const userStr = localStorage.getItem(STORAGE_KEYS.USER);
        if (!userStr) return;
        
        try {
            const user = JSON.parse(userStr);
            state.user = user;

            if (DOM.userNameDisplay) {
                DOM.userNameDisplay.textContent = user.full_name || user.name || 'User';
            }

            if (DOM.avatarInitials) {
                const name = (user.full_name || user.name || 'User');
                const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                DOM.avatarInitials.textContent = initials;
            }
        } catch (e) {
            console.error('Failed to parse user data:', e);
        }
    }

    function createSpaceCardHTML(space, isFavorite = false) {
        const id = space.id || space._id;
        const title = space.title || 'Untitled Space';
        const location = space.address || space.city || 'Location not specified';
        const rating = space.rating || 0;
        const reviews = space.reviewCount || space.reviews || 0;
        const price = space.hourly_rate || space.price || 0;
        const speed = space.internet_speed || space.wifi_speed || 'N/A';
        const imageUrl = space.images && space.images.length > 0 
            ? space.images[0] 
            : 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80';
        const type = space.workspace_type || 'Workspace';
        const hasPower = space.power_backup === true || space.power_backup_type === 'generator';

        const formattedPrice = typeof price === 'number' 
            ? price.toLocaleString('en-NG') 
            : price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

        const isFav = isFavorite || (state.favorites && state.favorites.some(f => f.workspaceId === id || f._id === id));
        const favIcon = isFav ? 'ph-fill ph-heart' : 'ph ph-heart';

        return `
            <article class="space-card" data-id="${id}">
                <a href="workspace-details.html?id=${id}" class="space-card-link">
                    <div class="space-card-image-wrapper">
                        <img src="${imageUrl}" alt="${title}" class="space-card-img" loading="lazy" />
                        <div class="space-card-overlays">
                            <div class="space-card-badges-top">
                                ${hasPower ? `<span class="badge-power"><i class="ph-fill ph-lightning"></i> Power</span>` : ''}
                                <span class="badge-type">${type}</span>
                            </div>
                            <button class="space-card-fav-btn ${isFav ? 'active' : ''}" data-id="${id}" aria-label="Toggle favourite">
                                <i class="${favIcon}"></i>
                            </button>
                        </div>
                    </div>
                    <div class="space-card-body">
                        <div class="space-card-top-row">
                            <h3 class="space-card-title">${title}</h3>
                            <p class="space-card-price">₦${formattedPrice}<small>/hr</small></p>
                        </div>
                        <div class="space-card-location-row">
                            <i class="ph-bold ph-map-pin"></i>
                            <span>${location}</span>
                        </div>
                        <div class="space-card-bottom-row">
                            <div class="space-card-rating">
                                <i class="ph-fill ph-star" style="color: #FFC107;"></i>
                                <span>${rating.toFixed(1)} <small>(${reviews})</small></span>
                            </div>
                            <div class="space-card-wifi">
                                <i class="ph ph-wifi-high"></i>
                                <span>${speed}</span>
                            </div>
                        </div>
                    </div>
                </a>
            </article>
        `;
    }

    function renderSpaces(spaces) {
        if (!DOM.spacesGrid) return;

        const workspaces = spaces || state.workspaces || [];

        if (workspaces.length === 0) {
            DOM.spacesGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--text-gray);">
                    <i class="ph ph-buildings" style="font-size: 48px; display: block; margin-bottom: 12px;"></i>
                    <p style="font-size: 18px;">No workspaces found nearby</p>
                    <p style="font-size: 14px; color: var(--text-light-gray);">Try adjusting your filters or check back later</p>
                </div>
            `;
            return;
        }

        DOM.spacesGrid.innerHTML = workspaces
            .map(space => createSpaceCardHTML(space))
            .join('');

        attachCardEvents();
    }

    function renderSummaryCards() {
        if (DOM.favouritesCount) {
            const count = state.favorites.length;
            DOM.favouritesCount.textContent = `${count} saved listing${count !== 1 ? 's' : ''}`;
        }

        if (DOM.bookingsCount) {
            DOM.bookingsCount.textContent = `${state.activeBookings} active session${state.activeBookings !== 1 ? 's' : ''}`;
        }
    }

    // ================================================================
    // 7. EVENT HANDLERS
    // ================================================================

    function attachCardEvents() {
        document.querySelectorAll('.space-card-fav-btn').forEach(btn => {
            btn.removeEventListener('click', handleFavoriteToggle);
            btn.addEventListener('click', handleFavoriteToggle);
        });
    }

    async function handleFavoriteToggle(e) {
        e.stopPropagation();
        const btn = e.currentTarget;
        const workspaceId = btn.dataset.id;
        const isCurrentlyFav = btn.classList.contains('active');

        btn.classList.toggle('active');
        const icon = btn.querySelector('i');
        icon.className = btn.classList.contains('active') ? 'ph-fill ph-heart' : 'ph ph-heart';

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
                const revertIcon = btn.querySelector('i');
                revertIcon.className = btn.classList.contains('active') ? 'ph-fill ph-heart' : 'ph ph-heart';
                showToast('Something went wrong. Please try again.');
            }

            renderSummaryCards();
        } catch (error) {
            console.error('Favorite toggle error:', error);
            btn.classList.toggle('active');
            const revertIcon = btn.querySelector('i');
            revertIcon.className = btn.classList.contains('active') ? 'ph-fill ph-heart' : 'ph ph-heart';
            showToast('Error updating favourites');
        }
    }

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
                renderSpaces(workspaces);
                showToast(`Found ${workspaces.length} result${workspaces.length !== 1 ? 's' : ''}`);
            } else {
                state.workspaces = [];
                renderSpaces([]);
                showToast('No results found for your search');
            }
        } catch (error) {
            console.error('Search error:', error);
            showToast('Error searching. Please try again.');
        }
    }

    function handleFilterClick(e) {
        const chip = e.currentTarget;
        const filter = chip.dataset.filter;
        
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
        loadWorkspaces({ filter: filter });
    }

    async function handleInstantMatch() {
        const btn = DOM.instantMatchBtn;
        if (!btn) return;

        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="ph-fill ph-spinner ph-spin"></i> Finding spaces...';
        btn.disabled = true;

        try {
            const position = await getCurrentPosition();
            const { latitude, longitude } = position.coords;

            const result = await findMePowerNow(latitude, longitude);
            
            if (result && result.length > 0) {
                state.workspaces = result;
                renderSpaces(result);
                showToast(`📍 Found ${result.length} power-verified spaces near you!`);
            } else {
                showToast('No power-verified spaces found nearby. Showing all spaces.');
                await loadWorkspaces();
            }
        } catch (error) {
            console.error('Instant Match error:', error);
            if (error.code === 1) {
                showToast('📍 Please enable location access to find spaces near you');
            } else {
                showToast('Unable to find spaces. Please try again.');
            }
            await loadWorkspaces();
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    function getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            });
        });
    }

    // ================================================================
    // 8. LOAD DATA FUNCTIONS
    // ================================================================

    async function loadDashboardData() {
        if (!isAuthenticated()) {
            console.warn('🔒 Not authenticated, redirecting to login...');
            logout();
            return;
        }

        showLoading(true);

        try {
            renderUserProfile();
            state.favorites = await fetchFavorites();
            await loadWorkspaces();
            renderSummaryCards();
            showLoading(false);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            showToast('Error loading dashboard. Please refresh.');
            showLoading(false);
        }
    }

    async function loadWorkspaces(filters = {}) {
        try {
            const workspaces = await fetchWorkspaces(filters);
            state.workspaces = workspaces || [];
            renderSpaces(state.workspaces);
            return state.workspaces;
        } catch (error) {
            console.error('Failed to load workspaces:', error);
            return [];
        }
    }

    function showLoading(isLoading) {
        state.isLoading = isLoading;
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
        console.log('🚀 SpaceShare — Seeker Dashboard initializing...');
        console.log(`📍 API Base URL: ${API_BASE_URL}`);

        if (!isAuthenticated()) {
            console.warn('🔒 Not authenticated, redirecting to login...');
            logout();
            return;
        }

        if (DOM.instantMatchBtn) {
            DOM.instantMatchBtn.addEventListener('click', handleInstantMatch);
        }

        if (DOM.searchInput) {
            DOM.searchInput.addEventListener('input', handleSearchInput);
        }

        DOM.filterChips.forEach(chip => {
            chip.addEventListener('click', handleFilterClick);
        });

        loadDashboardData();

        console.log('✅ Dashboard ready!');
    }

    // ================================================================
    // 11. START
    // ================================================================

    document.addEventListener('DOMContentLoaded', init);

})();