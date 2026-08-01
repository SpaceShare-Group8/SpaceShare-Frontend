// ================================================================
// SPACESHARE — SEEKER DASHBOARD
// Complete with Live Backend API Integration
// Backend: https://spaceshare-backend-cor9.onrender.com
// ================================================================

// ================================================================
// CONFIGURATION
// ================================================================

const API_BASE_URL = 'https://spaceshare-backend-cor9.onrender.com';
const STORAGE_KEYS = {
    ACCESS_TOKEN: 'spaceshare_access_token',
    REFRESH_TOKEN: 'spaceshare_refresh_token',
    USER: 'spaceshare_user'
};

// ================================================================
// STATE
// ================================================================

let state = {
    user: null,
    workspaces: [],
    favorites: [],
    isLoading: false,
    currentFilter: 'type'
};

// ================================================================
// DOM REFS
// ================================================================

const DOM = {
    searchInput: document.getElementById('searchInput'),
    notificationsBtn: document.getElementById('notificationsBtn'),
    notificationDot: document.getElementById('notificationDot'),
    userAvatar: document.getElementById('userAvatar'),
    avatarImg: document.getElementById('avatarImg'),
    userNameDisplay: document.getElementById('userNameDisplay'),
    instantMatchBtn: document.getElementById('instantMatchBtn'),
    favouritesScroll: document.getElementById('favouritesScroll'),
    spacesGrid: document.getElementById('spacesGrid'),
    favouritesCount: document.getElementById('favouritesCount'),
    viewAllBtn: document.getElementById('viewAllBtn'),
    filterChips: document.querySelectorAll('.filter-chip'),
    navItems: document.querySelectorAll('.nav-item')
};

// ================================================================
// API HELPERS
// ================================================================

/**
 * Get the current access token
 */
function getAccessToken() {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || 
           sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

/**
 * Get the current refresh token
 */
function getRefreshToken() {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || 
           sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

/**
 * Save tokens to storage
 */
function saveTokens(accessToken, refreshToken, remember = true) {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) {
        storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
}

/**
 * Save user data
 */
function saveUser(user) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    state.user = user;
}

/**
 * Get user from storage
 */
function getUser() {
    if (state.user) return state.user;
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (userStr) {
        try {
            state.user = JSON.parse(userStr);
            return state.user;
        } catch (e) {
            return null;
        }
    }
    return null;
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return !!getAccessToken();
}

/**
 * API request wrapper with authentication
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    // Add auth token if available
    const token = getAccessToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json().catch(() => ({}));

        // Handle token expiry
        if (response.status === 401) {
            // Try to refresh token
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                // Retry the request with new token
                const newHeaders = {
                    ...headers,
                    'Authorization': `Bearer ${getAccessToken()}`
                };
                const retryConfig = {
                    ...config,
                    headers: newHeaders
                };
                const retryResponse = await fetch(url, retryConfig);
                const retryData = await retryResponse.json().catch(() => ({}));
                if (!retryResponse.ok) {
                    throw new Error(retryData.message || `Request failed (${retryResponse.status})`);
                }
                return retryData;
            } else {
                // Redirect to login
                redirectToLogin();
                throw new Error('Session expired. Please login again.');
            }
        }

        if (!response.ok) {
            throw new Error(data.message || `Request failed (${response.status})`);
        }

        return data;
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
}

/**
 * Refresh access token
 */
async function refreshAccessToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && data.accessToken) {
            saveTokens(data.accessToken, data.refreshToken || refreshToken);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Token refresh failed:', error);
        return false;
    }
}

/**
 * Redirect to login page
 */
function redirectToLogin() {
    // Clear tokens
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    
    window.location.href = 'login.html?session_expired=1';
}

// ================================================================
// API FUNCTIONS
// ================================================================

/**
 * Get current user profile
 * GET /api/auth/me
 */
async function fetchCurrentUser() {
    try {
        const data = await apiRequest('/api/auth/me', { method: 'GET' });
        if (data.success && data.data) {
            saveUser(data.data);
            return data.data;
        }
        return null;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        return null;
    }
}

/**
 * Fetch workspaces with filters
 * GET /api/workspaces
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
        
        // Handle different response formats
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
 * Fetch user favorites
 * GET /api/favorites
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
 * Add workspace to favorites
 * POST /api/favorites/:workspaceId
 */
async function addFavorite(workspaceId) {
    try {
        const data = await apiRequest(`/api/favorites/${workspaceId}`, { 
            method: 'POST' 
        });
        return data.success;
    } catch (error) {
        console.error('Failed to add favorite:', error);
        return false;
    }
}

/**
 * Remove workspace from favorites
 * DELETE /api/favorites/:workspaceId
 */
async function removeFavorite(workspaceId) {
    try {
        const data = await apiRequest(`/api/favorites/${workspaceId}`, { 
            method: 'DELETE' 
        });
        return data.success;
    } catch (error) {
        console.error('Failed to remove favorite:', error);
        return false;
    }
}

/**
 * Get workspace availability
 * GET /api/workspaces/:id/availability
 */
async function fetchAvailability(workspaceId, date) {
    try {
        const endpoint = `/api/workspaces/${workspaceId}/availability${date ? `?date=${date}` : ''}`;
        const data = await apiRequest(endpoint, { method: 'GET' });
        return data.success ? data.data : null;
    } catch (error) {
        console.error('Failed to fetch availability:', error);
        return null;
    }
}

/**
 * Search workspaces with "Find Me Power Now"
 * GET /api/workspaces/find-me-power-now
 */
async function findMePowerNow(latitude, longitude) {
    try {
        const endpoint = `/api/workspaces/find-me-power-now?lat=${latitude}&lng=${longitude}`;
        const data = await apiRequest(endpoint, { method: 'GET' });
        return data.success ? data.data : null;
    } catch (error) {
        console.error('Find Me Power Now failed:', error);
        return null;
    }
}

// ================================================================
// RENDER FUNCTIONS
// ================================================================

/**
 * Render user profile information
 */
function renderUserProfile() {
    const user = getUser();
    if (!user) return;

    // Display name
    if (DOM.userNameDisplay) {
        const fullName = user.full_name || user.name || 'User';
        DOM.userNameDisplay.textContent = fullName;
    }

    // Update avatar
    if (DOM.avatarImg) {
        const name = (user.full_name || user.name || 'User').replace(/\s+/g, '+');
        DOM.avatarImg.src = `https://ui-avatars.com/api/?name=${name}&background=2862BC&color=fff&size=40&font-size=0.5`;
        DOM.avatarImg.alt = user.full_name || user.name || 'User';
    }
}

/**
 * Create space card HTML
 */
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
        : 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop&crop=center';
    const workspaceType = space.workspace_type || 'Workspace';
    const isPowerVerified = space.power_backup === true || space.power_backup_type === 'generator';

    // Format price
    const formattedPrice = typeof price === 'number' 
        ? price.toLocaleString('en-NG') 
        : price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    // Favorite state
    const isFav = isFavorite || (state.favorites && state.favorites.some(f => f.workspaceId === id || f._id === id));
    const favIcon = isFav ? 'ph-fill ph-heart' : 'ph ph-heart';
    const favClass = isFav ? 'is-fav' : '';

    return `
        <div class="space-card fade-in" data-id="${id}" data-title="${title}">
            <div class="space-card-image" style="background: linear-gradient(135deg, #e0e7ff, #f0f4ff);">
                <img src="${imageUrl}" alt="${title}" loading="lazy" />
                <div style="display:flex; align-items:flex-start; justify-content:space-between; width:100%; position:relative; z-index:2; padding-top:4px;">
                    <span class="space-card-badge">
                        <i class="ph ph-power"></i>
                        ${isPowerVerified ? 'Power' : 'Standard'}
                    </span>
                    <span class="space-card-type">${workspaceType}</span>
                </div>
                <button class="space-card-fav ${favClass}" data-id="${id}" aria-label="Toggle favourite">
                    <i class="${favIcon}"></i>
                </button>
            </div>
            <div class="space-card-body">
                <div class="space-card-top">
                    <span class="space-card-title">${title}</span>
                    <span class="space-card-price">
                        <span class="naira-icon">₦</span>${formattedPrice}<span style="font-size:14px;color:var(--text-gray);font-weight:400;">/hr</span>
                    </span>
                </div>
                <div class="space-card-location">
                    <i class="ph ph-map-pin"></i>
                    <span>${location}</span>
                </div>
                <div class="space-card-bottom">
                    <div class="space-card-rating">
                        <i class="ph-fill ph-star"></i>
                        <span>${rating.toFixed(1)} (${reviews})</span>
                    </div>
                    <div class="space-card-wifi">
                        <i class="ph ph-wifi-high"></i>
                        <span>${speed}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render favorites scroll
 */
function renderFavorites() {
    if (!DOM.favouritesScroll) return;

    const favorites = state.favorites || [];

    if (favorites.length === 0) {
        DOM.favouritesScroll.innerHTML = `
            <div class="empty-state" style="flex:1; text-align:center; padding:30px 20px; color:var(--text-gray);">
                <i class="ph ph-heart" style="font-size:2rem; display:block; margin-bottom:8px;"></i>
                <p style="font-size:0.9rem;">No favourites yet</p>
                <p style="font-size:0.8rem;">Heart spaces you love to save them here</p>
            </div>
        `;
        if (DOM.favouritesCount) {
            DOM.favouritesCount.textContent = '0 saved listings';
        }
        return;
    }

    // Get workspace details for favorites
    const favoriteWorkspaces = favorites.map(fav => {
        // Find workspace in state
        const workspace = state.workspaces.find(w => 
            w.id === fav.workspaceId || w._id === fav.workspaceId || 
            w.id === fav._id || w._id === fav._id
        );
        return workspace || fav;
    });

    DOM.favouritesScroll.innerHTML = favoriteWorkspaces
        .filter(w => w)
        .map(space => createSpaceCardHTML(space, true))
        .join('');

    if (DOM.favouritesCount) {
        DOM.favouritesCount.textContent = `${favorites.length} saved listing${favorites.length !== 1 ? 's' : ''}`;
    }

    // Attach favorite button events
    attachFavoriteEvents();
}

/**
 * Render nearby spaces grid
 */
function renderNearbySpaces(spaces) {
    if (!DOM.spacesGrid) return;

    const workspaces = spaces || state.workspaces || [];

    if (workspaces.length === 0) {
        DOM.spacesGrid.innerHTML = `
            <div class="empty-state">
                <i class="ph ph-buildings"></i>
                <p>No workspaces found nearby</p>
                <p>Try adjusting your filters or check back later</p>
            </div>
        `;
        return;
    }

    // Check which workspaces are favorited
    const favoriteIds = (state.favorites || []).map(f => f.workspaceId || f._id);

    DOM.spacesGrid.innerHTML = workspaces
        .map(space => createSpaceCardHTML(space, favoriteIds.includes(space.id) || favoriteIds.includes(space._id)))
        .join('');

    // Attach favorite button events
    attachFavoriteEvents();

    // Attach card click events
    attachCardClickEvents();
}

/**
 * Attach favorite button events
 */
function attachFavoriteEvents() {
    document.querySelectorAll('.space-card-fav').forEach(btn => {
        btn.removeEventListener('click', handleFavoriteToggle);
        btn.addEventListener('click', handleFavoriteToggle);
    });
}

/**
 * Handle favorite toggle
 */
async function handleFavoriteToggle(e) {
    e.stopPropagation();
    const btn = e.currentTarget;
    const workspaceId = btn.dataset.id;
    const isCurrentlyFav = btn.classList.contains('is-fav');

    // Optimistic UI update
    btn.classList.toggle('is-fav');
    const icon = btn.querySelector('i');
    if (btn.classList.contains('is-fav')) {
        icon.className = 'ph-fill ph-heart';
    } else {
        icon.className = 'ph ph-heart';
    }

    try {
        let success;
        if (isCurrentlyFav) {
            success = await removeFavorite(workspaceId);
            if (success) {
                state.favorites = (state.favorites || []).filter(f => 
                    f.workspaceId !== workspaceId && f._id !== workspaceId
                );
                showToast('Removed from favourites');
            }
        } else {
            success = await addFavorite(workspaceId);
            if (success) {
                state.favorites.push({ workspaceId, _id: workspaceId });
                showToast('Added to favourites ✨');
            }
        }

        if (!success) {
            // Revert on failure
            btn.classList.toggle('is-fav');
            const revertIcon = btn.querySelector('i');
            if (btn.classList.contains('is-fav')) {
                revertIcon.className = 'ph-fill ph-heart';
            } else {
                revertIcon.className = 'ph ph-heart';
            }
            showToast('Something went wrong. Please try again.');
        }

        // Update favorites count and re-render
        renderFavorites();
    } catch (error) {
        console.error('Favorite toggle error:', error);
        // Revert on error
        btn.classList.toggle('is-fav');
        const revertIcon = btn.querySelector('i');
        if (btn.classList.contains('is-fav')) {
            revertIcon.className = 'ph-fill ph-heart';
        } else {
            revertIcon.className = 'ph ph-heart';
        }
        showToast('Error updating favourites');
    }
}

/**
 * Attach card click events
 */
function attachCardClickEvents() {
    document.querySelectorAll('.space-card').forEach(card => {
        card.removeEventListener('click', handleCardClick);
        card.addEventListener('click', handleCardClick);
    });
}

/**
 * Handle card click - navigate to detail
 */
function handleCardClick(e) {
    // Don't navigate if clicking favorite button
    if (e.target.closest('.space-card-fav')) return;

    const card = e.currentTarget;
    const id = card.dataset.id;
    const title = card.dataset.title || 'Workspace';

    showToast(`Opening "${title}"...`);
    // Navigate to detail page
    // window.location.href = `listing-detail.html?id=${id}`;
    console.log(`Navigate to workspace: ${id}`);
}

// ================================================================
// SEARCH FUNCTIONALITY
// ================================================================

/**
 * Perform search
 */
async function performSearch(query) {
    if (!query || query.trim().length < 2) {
        // Load all workspaces
        await loadWorkspaces();
        return;
    }

    showToast(`🔍 Searching for "${query.trim()}"...`);
    
    try {
        const workspaces = await fetchWorkspaces({ 
            search: query.trim() 
        });
        
        if (workspaces && workspaces.length > 0) {
            state.workspaces = workspaces;
            renderNearbySpaces(workspaces);
            showToast(`Found ${workspaces.length} result${workspaces.length !== 1 ? 's' : ''}`);
        } else {
            state.workspaces = [];
            renderNearbySpaces([]);
            showToast('No results found for your search');
        }
    } catch (error) {
        console.error('Search error:', error);
        showToast('Error searching. Please try again.');
    }
}

// ================================================================
// FILTER FUNCTIONALITY
// ================================================================

/**
 * Apply filter
 */
async function applyFilter(filterType) {
    state.currentFilter = filterType;
    
    // Update active state on chips
    DOM.filterChips.forEach(chip => {
        chip.classList.toggle('active', chip.dataset.filter === filterType);
    });

    // In a real app, this would open a filter modal or dropdown
    // For now, show a toast with the filter type
    const filterNames = {
        type: 'Workspace Type',
        price: 'Price Range',
        power: 'Power Reliability',
        capacity: 'Capacity',
        amenities: 'Amenities',
        workspace: 'Workspace Type',
        availability: 'Availability'
    };
    
    showToast(`Filter: ${filterNames[filterType] || filterType}`);
    
    // Here you would apply the actual filter
    // await loadWorkspaces({ filter: filterType });
}

// ================================================================
// INSTANT MATCH FUNCTIONALITY
// ================================================================

/**
 * Find Me Power Now - Get user location and find power-verified spaces
 */
async function handleInstantMatch() {
    const btn = DOM.instantMatchBtn;
    if (!btn) return;

    // Show loading state
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Finding spaces...';
    btn.disabled = true;

    try {
        // Get user location
        const position = await getCurrentPosition();
        const { latitude, longitude } = position.coords;

        // Call the Find Me Power Now endpoint
        const result = await findMePowerNow(latitude, longitude);
        
        if (result && result.length > 0) {
            state.workspaces = result;
            renderNearbySpaces(result);
            showToast(`📍 Found ${result.length} power-verified spaces near you!`);
        } else {
            // Fallback: search with power filter
            const workspaces = await fetchWorkspaces({ 
                power_backup: true,
                lat: latitude,
                lng: longitude
            });
            
            if (workspaces && workspaces.length > 0) {
                state.workspaces = workspaces;
                renderNearbySpaces(workspaces);
                showToast(`📍 Found ${workspaces.length} power-verified spaces near you!`);
            } else {
                showToast('No power-verified spaces found nearby. Try adjusting your search.');
                // Load all workspaces as fallback
                await loadWorkspaces();
            }
        }
    } catch (error) {
        console.error('Instant Match error:', error);
        
        if (error.code === 1) {
            // User denied location
            showToast('📍 Please enable location access to find spaces near you');
            // Load all workspaces as fallback
            await loadWorkspaces();
        } else {
            showToast('Unable to find spaces. Please try again.');
            await loadWorkspaces();
        }
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

/**
 * Get current position with promise
 */
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
// LOAD DATA FUNCTIONS
// ================================================================

/**
 * Load all data for dashboard
 */
async function loadDashboardData() {
    if (!isAuthenticated()) {
        redirectToLogin();
        return;
    }

    showLoading(true);

    try {
        // Load user profile
        await fetchCurrentUser();
        renderUserProfile();

        // Load favorites
        state.favorites = await fetchFavorites();

        // Load workspaces
        await loadWorkspaces();

        // Render favorites
        renderFavorites();

        // Check notifications
        checkNotifications();

        showLoading(false);
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showToast('Error loading dashboard. Please refresh.');
        showLoading(false);
    }
}

/**
 * Load workspaces
 */
async function loadWorkspaces(filters = {}) {
    try {
        const workspaces = await fetchWorkspaces(filters);
        state.workspaces = workspaces || [];
        renderNearbySpaces(state.workspaces);
        return state.workspaces;
    } catch (error) {
        console.error('Failed to load workspaces:', error);
        return [];
    }
}

/**
 * Show/hide loading state
 */
function showLoading(isLoading) {
    state.isLoading = isLoading;
    // You can add a loading overlay or spinner here
}

// ================================================================
// NOTIFICATION FUNCTIONALITY
// ================================================================

/**
 * Check for notifications
 */
function checkNotifications() {
    // In a real app, fetch notifications from API
    // GET /api/notifications
    // For now, just show dot if there are any
    const hasNotifications = false; // Replace with actual check
    if (DOM.notificationDot) {
        DOM.notificationDot.style.display = hasNotifications ? 'block' : 'none';
    }
}

/**
 * Open notifications
 */
function openNotifications() {
    // In a real app, navigate to notifications page
    showToast('🔔 No new notifications');
    if (DOM.notificationDot) {
        DOM.notificationDot.style.display = 'none';
    }
}

// ================================================================
// TOAST NOTIFICATION
// ================================================================

let toastTimeout = null;

function showToast(message) {
    // Remove existing toast
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();
    if (toastTimeout) clearTimeout(toastTimeout);

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;

    document.body.appendChild(toast);

    // Trigger fade in
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
// EVENT LISTENERS
// ================================================================

/**
 * Initialize all event listeners
 */
function initEventListeners() {
    // Search
    if (DOM.searchInput) {
        let debounceTimer;
        DOM.searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();
            debounceTimer = setTimeout(() => {
                if (query.length >= 2 || query.length === 0) {
                    performSearch(query);
                }
            }, 400);
        });

        DOM.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && DOM.searchInput.value.trim().length >= 2) {
                e.preventDefault();
                performSearch(DOM.searchInput.value.trim());
            }
        });
    }

    // Filter chips
    DOM.filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            applyFilter(chip.dataset.filter);
        });
    });

    // Instant Match
    if (DOM.instantMatchBtn) {
        DOM.instantMatchBtn.addEventListener('click', handleInstantMatch);
    }

    // View All
    if (DOM.viewAllBtn) {
        DOM.viewAllBtn.addEventListener('click', () => {
            // Navigate to full search results
            showToast('Showing all nearby spaces');
            // window.location.href = 'search-results.html';
        });
    }

    // Notifications
    if (DOM.notificationsBtn) {
        DOM.notificationsBtn.addEventListener('click', openNotifications);
    }

    // User avatar - navigate to profile
    if (DOM.userAvatar) {
        DOM.userAvatar.addEventListener('click', () => {
            showToast('👤 Viewing your profile');
            // window.location.href = 'profile.html';
        });
    }

    // Bottom navigation
    DOM.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            DOM.navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            const label = item.querySelector('span')?.textContent || 'Home';
            
            // Navigate based on nav item
            const navMap = {
                'home': () => { /* Already on home */ },
                'search': () => { window.location.href = 'search-results.html'; },
                'favourites': () => { showToast('❤️ Viewing favourites'); },
                'bookings': () => { window.location.href = 'booking-history.html'; },
                'profile': () => { window.location.href = 'profile.html'; }
            };
            
            const action = navMap[item.dataset.nav];
            if (action) action();
        });
    });
}

// ================================================================
// INITIALIZATION
// ================================================================

/**
 * Initialize the dashboard
 */
async function init() {
    console.log('🚀 SpaceShare — Seeker Dashboard initializing...');
    console.log(`📍 API Base URL: ${API_BASE_URL}`);

    // Check authentication
    if (!isAuthenticated()) {
        console.log('🔒 Not authenticated, redirecting to login...');
        redirectToLogin();
        return;
    }

    // Initialize event listeners
    initEventListeners();

    // Load data
    await loadDashboardData();

    console.log('✅ Dashboard ready!');
}

// ================================================================
// START
// ================================================================

// Run when DOM is ready
document.addEventListener('DOMContentLoaded', init);