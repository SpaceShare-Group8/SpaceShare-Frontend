/* ================================================================
   SPACESHARE — HOST DASHBOARD JS (AUTHENTICATED VERSION)
   Fetches real data from the backend using stored tokens
   Redirects to login if not authenticated
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
        ACCESS_TOKEN: 'spaceshare:accessToken',
        REFRESH_TOKEN: 'spaceshare:refreshToken',
        USER_DATA: 'spaceshare:user',
        USER_ROLE: 'spaceshare:userRole'
    };

    // ================================================================
    // 2. DOM REFERENCES
    // ================================================================

    const DOM = {
        // Header & Greeting
        userNameDisplay: document.getElementById('userNameDisplay'),
        avatarInitials: document.querySelector('.avatar-initials'),
        userEmailDisplay: document.getElementById('userEmailDisplay'),
        userPhoneDisplay: document.getElementById('userPhoneDisplay'),
        
        // Stats
        totalBookings: document.getElementById('totalBookings'),
        totalEarnings: document.getElementById('totalEarnings'),
        activeListings: document.getElementById('activeListings'),
        totalReviews: document.getElementById('totalReviews'),
        avgRating: document.getElementById('avgRating'),
        
        // Recent Bookings
        recentBookingsList: document.getElementById('recentBookingsList'),
        
        // My Listings
        myListingsGrid: document.getElementById('myListingsGrid'),
        
        // Search
        searchInput: document.getElementById('mainSearchInput'),
        
        // Switch to Seeker Button
        switchToSeekerBtn: document.getElementById('switchToSeekerBtn'),
        sidebarSwitchToSeeker: document.getElementById('sidebarSwitchToSeeker'),

        // Bottom Nav
        navItems: document.querySelectorAll('.bottom-nav .nav-item'),
        
        // Sidebar
        sidebarItems: document.querySelectorAll('.desktop-sidebar .nav-item')
    };

    // ================================================================
    // 3. STATE
    // ================================================================

    let state = {
        user: null,
        bookings: [],
        listings: [],
        stats: {
            totalBookings: 0,
            totalEarnings: 0,
            activeListings: 0,
            totalReviews: 0,
            avgRating: 0
        },
        isLoading: true,
        error: null
    };

    // ================================================================
    // 4. AUTHENTICATION HELPERS
    // ================================================================

    function getAccessToken() {
        return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    }

    function getUserData() {
        const data = localStorage.getItem(STORAGE_KEYS.USER_DATA);
        return data ? JSON.parse(data) : null;
    }

    function getUserRole() {
        return localStorage.getItem(STORAGE_KEYS.USER_ROLE) || 'seeker';
    }

    function isAuthenticated() {
        return !!getAccessToken();
    }

    function redirectToLogin() {
        console.warn('🔒 Not authenticated. Redirecting to login...');
        window.location.href = 'login.html';
    }

    function redirectToSeekerDashboard() {
        console.log('🔄 Switching to Seeker Dashboard...');
        window.location.href = 'seeker-dashboard.html';
    }

    // ================================================================
    // 5. API HELPERS
    // ================================================================

    async function apiRequest(endpoint, options = {}) {
        const token = getAccessToken();
        
        if (!token) {
            throw new Error('No access token found');
        }

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };

        const response = await fetch(`${API_BASE_URL}${endpoint}`, mergedOptions);

        if (response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.USER_DATA);
            localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
            redirectToLogin();
            throw new Error('Session expired. Please login again.');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `API Error: ${response.status}`);
        }

        return data;
    }

    // ================================================================
    // 6. DATA FETCHING FUNCTIONS
    // ================================================================

    async function fetchUserProfile() {
        try {
            const result = await apiRequest('/api/auth/me');
            return result.data || result;
        } catch (error) {
            console.error('❌ Failed to fetch user profile:', error);
            throw error;
        }
    }

    async function fetchWorkspaces() {
        try {
            const result = await apiRequest('/api/workspaces?limit=50');
            return result.data || result || [];
        } catch (error) {
            console.error('❌ Failed to fetch workspaces:', error);
            return [];
        }
    }

    async function fetchBookings() {
        try {
            const result = await apiRequest('/api/bookings?limit=50');
            return result.data || result || [];
        } catch (error) {
            console.error('❌ Failed to fetch bookings:', error);
            return [];
        }
    }

    // ================================================================
    // 7. RENDER FUNCTIONS
    // ================================================================

    function renderUserProfile() {
        const user = state.user;

        if (!user) return;

        if (DOM.userNameDisplay) {
            DOM.userNameDisplay.textContent = user.full_name || user.name || user.fullName || 'Host User';
        }

        if (DOM.userEmailDisplay) {
            DOM.userEmailDisplay.textContent = user.email || 'No email provided';
        }

        if (DOM.userPhoneDisplay) {
            DOM.userPhoneDisplay.textContent = user.phone || 'No phone number';
        }

        if (DOM.avatarInitials) {
            const name = user.full_name || user.name || user.fullName || 'Host';
            const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            DOM.avatarInitials.textContent = initials;
        }
    }

    function renderStats() {
        const bookings = state.bookings || [];
        const listings = state.listings || [];
        
        // Calculate stats
        state.stats.totalBookings = bookings.length;
        state.stats.activeListings = listings.filter(l => 
            (l.status || 'active').toLowerCase() === 'active' || 
            (l.status || 'approved').toLowerCase() === 'approved'
        ).length;
        
        // Calculate earnings from completed bookings
        const completedBookings = bookings.filter(b => 
            (b.status || 'pending').toLowerCase() === 'completed'
        );
        state.stats.totalEarnings = completedBookings.reduce((sum, b) => {
            return sum + (b.total_amount || b.totalAmount || 0);
        }, 0);
        
        // Calculate average rating from reviews (if available)
        const reviews = bookings.filter(b => b.review && b.review.rating);
        if (reviews.length > 0) {
            const totalRating = reviews.reduce((sum, b) => sum + b.review.rating, 0);
            state.stats.totalReviews = reviews.length;
            state.stats.avgRating = totalRating / reviews.length;
        } else {
            state.stats.totalReviews = 0;
            state.stats.avgRating = 0;
        }

        if (DOM.totalBookings) DOM.totalBookings.textContent = state.stats.totalBookings;
        if (DOM.totalEarnings) DOM.totalEarnings.textContent = `₦${state.stats.totalEarnings.toLocaleString()}`;
        if (DOM.activeListings) DOM.activeListings.textContent = state.stats.activeListings;
        if (DOM.totalReviews) DOM.totalReviews.textContent = state.stats.totalReviews;
        if (DOM.avgRating) DOM.avgRating.textContent = state.stats.avgRating > 0 ? state.stats.avgRating.toFixed(1) : 'N/A';
    }

    function createBookingCardHTML(booking) {
        const id = booking.id || booking._id;
        const workspaceName = booking.workspace?.title || booking.workspace_name || booking.workspaceName || 'Untitled Workspace';
        const guestName = booking.seeker?.full_name || booking.seeker_name || booking.guestName || 'Guest';
        const totalAmount = booking.total_amount || booking.totalAmount || 0;
        const status = booking.status || 'pending';
        
        const startTime = booking.start_time || booking.startTime;
        const endTime = booking.end_time || booking.endTime;
        
        const statusConfig = {
            'pending': { class: 'status-pending', label: 'Pending' },
            'pending_payment': { class: 'status-pending', label: 'Pending Payment' },
            'confirmed': { class: 'status-confirmed', label: 'Confirmed' },
            'in_progress': { class: 'status-confirmed', label: 'In Progress' },
            'completed': { class: 'status-completed', label: 'Completed' },
            'cancelled': { class: 'status-cancelled', label: 'Cancelled' },
            'declined': { class: 'status-cancelled', label: 'Declined' }
        };
        
        const statusInfo = statusConfig[status.toLowerCase()] || statusConfig.pending;

        const dateStr = startTime ? new Date(startTime).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }) : 'N/A';

        const timeStr = startTime && endTime 
            ? `${new Date(startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} – ${new Date(endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
            : 'N/A';

        return `
            <div class="booking-card" data-id="${id}">
                <div class="booking-card-info">
                    <h4 class="booking-card-title">${workspaceName}</h4>
                    <div class="booking-card-meta">
                        <span><i class="ph-bold ph-user"></i> ${guestName}</span>
                        <span><i class="ph-bold ph-calendar"></i> ${dateStr}</span>
                        <span><i class="ph-bold ph-clock"></i> ${timeStr}</span>
                    </div>
                </div>
                <div class="booking-card-right">
                    <span class="booking-card-amount">₦${totalAmount.toLocaleString()}</span>
                    <span class="status-badge ${statusInfo.class}">${statusInfo.label}</span>
                </div>
            </div>
        `;
    }

    function renderRecentBookings(bookings) {
        if (!DOM.recentBookingsList) return;

        const items = bookings || state.bookings || [];

        if (items.length === 0) {
            DOM.recentBookingsList.innerHTML = `
                <div class="empty-state">
                    <i class="ph-fill ph-calendar-blank" style="font-size: 48px; color: #D1D1D6; display: block; margin-bottom: 12px;"></i>
                    <p style="font-size: 18px; font-weight: 600; color: #111111;">No bookings yet</p>
                    <p style="font-size: 14px; color: #948E8E;">When you get bookings, they'll appear here.</p>
                </div>
            `;
            return;
        }

        DOM.recentBookingsList.innerHTML = items
            .slice(0, 5)
            .map(booking => createBookingCardHTML(booking))
            .join('');
    }

    function createListingCardHTML(listing) {
        const id = listing.id || listing._id;
        const title = listing.title || 'Untitled Listing';
        const location = listing.address || listing.city || 'Location not specified';
        const price = listing.hourly_rate || listing.price || 0;
        const imageUrl = listing.images && listing.images.length > 0
            ? listing.images[0]
            : 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80';
        const status = listing.status || 'active';

        const formattedPrice = typeof price === 'number'
            ? price.toLocaleString('en-NG')
            : price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

        const statusLabel = status.toLowerCase() === 'active' || status.toLowerCase() === 'approved' ? 'Active' : 'Inactive';
        const statusClass = status.toLowerCase() === 'active' || status.toLowerCase() === 'approved' ? 'status-active' : 'status-inactive';

        return `
            <div class="listing-card" data-id="${id}">
                <div class="listing-card-image-wrapper">
                    <img src="${imageUrl}" alt="${title}" class="listing-card-img" loading="lazy" />
                </div>
                <div class="listing-card-body">
                    <div class="listing-card-top">
                        <h4 class="listing-card-title">${title}</h4>
                        <span class="listing-card-price">₦${formattedPrice}<small>/hr</small></span>
                    </div>
                    <div class="listing-card-location">
                        <i class="ph-bold ph-map-pin"></i>
                        <span>${location}</span>
                    </div>
                    <div class="listing-card-bottom">
                        <span class="listing-card-status ${statusClass}">${statusLabel}</span>
                        <button class="btn-view-listing" data-id="${id}">
                            View Details <i class="ph-bold ph-caret-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    function renderMyListings(listings) {
        if (!DOM.myListingsGrid) return;

        const items = listings || state.listings || [];

        if (items.length === 0) {
            DOM.myListingsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                    <i class="ph-fill ph-buildings" style="font-size: 48px; color: #D1D1D6; display: block; margin-bottom: 12px;"></i>
                    <p style="font-size: 18px; font-weight: 600; color: #111111;">No listings yet</p>
                    <p style="font-size: 14px; color: #948E8E;">List your first workspace and start earning.</p>
                    <button class="btn-primary" onclick="window.location.href='host-add-space.html'">
                        Create Listing <i class="ph-bold ph-plus"></i>
                    </button>
                </div>
            `;
            return;
        }

        DOM.myListingsGrid.innerHTML = items
            .map(listing => createListingCardHTML(listing))
            .join('');

        // Attach event listeners
        document.querySelectorAll('.btn-view-listing').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                window.location.href = `host-listing-details.html?id=${id}`;
            });
        });
    }

    // ================================================================
    // 8. SEARCH HANDLER
    // ================================================================

    let searchTimeout;

    function handleSearchInput(e) {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        searchTimeout = setTimeout(() => {
            if (query.length >= 2) {
                filterData(query);
            } else {
                resetData();
            }
        }, 300);
    }

    function filterData(query) {
        // Filter bookings by workspace name or guest name
        const filteredBookings = state.bookings.filter(booking => {
            const workspace = (booking.workspace?.title || booking.workspace_name || booking.workspaceName || '').toLowerCase();
            const guest = (booking.seeker?.full_name || booking.seeker_name || booking.guestName || '').toLowerCase();
            return workspace.includes(query.toLowerCase()) || guest.includes(query.toLowerCase());
        });
        renderRecentBookings(filteredBookings);

        // Filter listings by title or location
        const filteredListings = state.listings.filter(listing => {
            const title = (listing.title || '').toLowerCase();
            const location = (listing.address || listing.city || '').toLowerCase();
            return title.includes(query.toLowerCase()) || location.includes(query.toLowerCase());
        });
        renderMyListings(filteredListings);
    }

    function resetData() {
        renderRecentBookings(state.bookings);
        renderMyListings(state.listings);
    }

    // ================================================================
    // 9. TOAST NOTIFICATION SYSTEM
    // ================================================================

    let toastTimeout = null;

    function showToast(message, type = 'info') {
        const existing = document.querySelector('.toast-notification');
        if (existing) existing.remove();
        if (toastTimeout) clearTimeout(toastTimeout);

        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#1A4A8A'};
            color: white;
            padding: 14px 24px;
            border-radius: 12px;
            font-weight: 500;
            z-index: 9999;
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            transform: translateY(100px);
            opacity: 0;
            transition: transform 0.3s ease, opacity 0.3s ease;
            font-family: 'Inter', sans-serif;
        `;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        });

        toastTimeout = setTimeout(() => {
            toast.style.transform = 'translateY(100px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 350);
            toastTimeout = null;
        }, 3000);
    }

    // ================================================================
    // 10. MAIN INITIALIZATION
    // ================================================================

    async function init() {
        console.log('🚀 SpaceShare — Host Dashboard');

        // Check authentication
        if (!isAuthenticated()) {
            redirectToLogin();
            return;
        }

        // Check role - should be host
        const role = getUserRole();
        if (role !== 'host') {
            console.warn(`⚠️ User role is "${role}", redirecting to seeker dashboard...`);
            redirectToSeekerDashboard();
            return;
        }

        // Show loading state
        const loadingHTML = `
            <div style="text-align: center; padding: 40px; color: #948E8E;">
                <i class="ph-bold ph-spinner" style="font-size: 32px; animation: spin 1s linear infinite; display: block; margin-bottom: 12px;"></i>
                <p>Loading your dashboard...</p>
            </div>
        `;
        if (DOM.recentBookingsList) DOM.recentBookingsList.innerHTML = loadingHTML;
        if (DOM.myListingsGrid) DOM.myListingsGrid.innerHTML = loadingHTML;

        try {
            // Fetch all data in parallel
            const [userProfile, workspaces, bookings] = await Promise.all([
                fetchUserProfile(),
                fetchWorkspaces(),
                fetchBookings()
            ]);

            state.user = userProfile;
            state.listings = workspaces || [];
            state.bookings = bookings || [];
            state.isLoading = false;

            console.log(`✅ Loaded ${state.listings.length} workspaces and ${state.bookings.length} bookings`);

            // Render everything
            renderUserProfile();
            renderStats();
            renderRecentBookings();
            renderMyListings();

            // Show success toast
            showToast(`Welcome back, ${state.user?.full_name || 'Host'}! 👋`, 'success');

        } catch (error) {
            console.error('❌ Failed to load dashboard data:', error);
            state.isLoading = false;
            state.error = error.message;

            if (DOM.recentBookingsList) {
                DOM.recentBookingsList.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #EF4444;">
                        <i class="ph-bold ph-warning" style="font-size: 32px; display: block; margin-bottom: 12px;"></i>
                        <p>Unable to load data: ${error.message}</p>
                        <button onclick="location.reload()" style="margin-top: 12px; padding: 8px 24px; background: #2862BC; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            Retry
                        </button>
                    </div>
                `;
            }
            showToast('Failed to load dashboard data', 'error');
        }

        // Attach event listeners
        if (DOM.searchInput) {
            DOM.searchInput.addEventListener('input', handleSearchInput);
        }

        // Switch to Seeker Dashboard buttons
        if (DOM.switchToSeekerBtn) {
            DOM.switchToSeekerBtn.addEventListener('click', redirectToSeekerDashboard);
        }
        if (DOM.sidebarSwitchToSeeker) {
            DOM.sidebarSwitchToSeeker.addEventListener('click', redirectToSeekerDashboard);
        }

        console.log('✅ Host Dashboard ready!');
    }

    // ================================================================
    // 11. START
    // ================================================================

    document.addEventListener('DOMContentLoaded', init);

    // Expose functions for inline HTML
    window.redirectToSeekerDashboard = redirectToSeekerDashboard;
    window.showToast = showToast;

})();