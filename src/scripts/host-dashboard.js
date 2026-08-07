/* ================================================================
   SPACESHARE — HOST DASHBOARD JS (PUBLIC DEMO VERSION)
   Shows mock data without requiring login
   ================================================================ */

(function() {
    'use strict';

    // ================================================================
    // 1. MOCK DATA
    // ================================================================

    const MOCK_DATA = {
        user: {
            full_name: 'Host User',
            email: 'host@spaceshare.com',
            phone: '+234 800 000 0000'
        },
        bookings: [
            {
                id: 'bk-001',
                workspaceName: 'Hub One Workspace',
                guestName: 'Zara Danjuma',
                startTime: new Date(Date.now() - 86400000).toISOString(),
                endTime: new Date(Date.now() - 43200000).toISOString(),
                totalAmount: 15000,
                status: 'completed'
            },
            {
                id: 'bk-002',
                workspaceName: 'WorkNest Hub',
                guestName: 'Ayomide Ogunlade',
                startTime: new Date(Date.now() + 86400000).toISOString(),
                endTime: new Date(Date.now() + 172800000).toISOString(),
                totalAmount: 30000,
                status: 'confirmed'
            },
            {
                id: 'bk-003',
                workspaceName: 'Creative Space',
                guestName: 'Elizabeth Bamidele',
                startTime: new Date(Date.now() + 604800000).toISOString(),
                endTime: new Date(Date.now() + 691200000).toISOString(),
                totalAmount: 50000,
                status: 'pending'
            },
            {
                id: 'bk-004',
                workspaceName: 'Hub One Workspace',
                guestName: 'Chidi Okonkwo',
                startTime: new Date(Date.now() - 259200000).toISOString(),
                endTime: new Date(Date.now() - 216000000).toISOString(),
                totalAmount: 45000,
                status: 'completed'
            },
            {
                id: 'bk-005',
                workspaceName: 'WorkNest Hub',
                guestName: 'Ngozi Eze',
                startTime: new Date(Date.now() + 432000000).toISOString(),
                endTime: new Date(Date.now() + 518400000).toISOString(),
                totalAmount: 60000,
                status: 'confirmed'
            }
        ],
        listings: [
            {
                id: 'ls-001',
                title: 'Hub One Workspace',
                address: 'Lekki Phase 1, Lagos',
                city: 'Lagos',
                hourly_rate: 15000,
                status: 'active',
                images: ['https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80']
            },
            {
                id: 'ls-002',
                title: 'WorkNest Hub',
                address: 'Ikeja GRA, Lagos',
                city: 'Lagos',
                hourly_rate: 30000,
                status: 'active',
                images: ['https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80']
            },
            {
                id: 'ls-003',
                title: 'Creative Space',
                address: 'Ikorodu, Lagos',
                city: 'Lagos',
                hourly_rate: 50000,
                status: 'inactive',
                images: ['https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=600&q=80']
            }
        ]
    };

    // ================================================================
    // 2. DOM REFERENCES
    // ================================================================

    const DOM = {
        // Header & Greeting
        userNameDisplay: document.getElementById('userNameDisplay'),
        avatarInitials: document.querySelector('.avatar-initials'),
        
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
        
        // Bottom Nav
        navItems: document.querySelectorAll('.bottom-nav .nav-item'),
        
        // Sidebar
        sidebarItems: document.querySelectorAll('.desktop-sidebar .nav-item')
    };

    // ================================================================
    // 3. STATE
    // ================================================================

    let state = {
        user: MOCK_DATA.user,
        bookings: MOCK_DATA.bookings,
        listings: MOCK_DATA.listings,
        stats: {
            totalBookings: 0,
            totalEarnings: 0,
            activeListings: 0,
            totalReviews: 0,
            avgRating: 0
        }
    };

    // ================================================================
    // 4. RENDER FUNCTIONS
    // ================================================================

    function renderUserProfile() {
        const user = state.user;

        if (DOM.userNameDisplay) {
            DOM.userNameDisplay.textContent = user.full_name || user.name || 'Host';
        }

        if (DOM.avatarInitials) {
            const name = (user.full_name || user.name || 'Host');
            const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            DOM.avatarInitials.textContent = initials;
        }
    }

    function renderStats() {
        const bookings = state.bookings;
        const listings = state.listings;
        
        // Calculate stats
        state.stats.totalBookings = bookings.length;
        state.stats.activeListings = listings.filter(l => 
            (l.status || 'active').toLowerCase() === 'active'
        ).length;
        
        // Calculate earnings from completed bookings
        const completedBookings = bookings.filter(b => 
            (b.status || 'pending').toLowerCase() === 'completed'
        );
        state.stats.totalEarnings = completedBookings.reduce((sum, b) => {
            return sum + (b.totalAmount || 0);
        }, 0);
        
        // Mock reviews (for demo)
        state.stats.totalReviews = 47;
        state.stats.avgRating = 4.8;

        if (DOM.totalBookings) DOM.totalBookings.textContent = state.stats.totalBookings;
        if (DOM.totalEarnings) DOM.totalEarnings.textContent = `₦${state.stats.totalEarnings.toLocaleString()}`;
        if (DOM.activeListings) DOM.activeListings.textContent = state.stats.activeListings;
        if (DOM.totalReviews) DOM.totalReviews.textContent = state.stats.totalReviews;
        if (DOM.avgRating) DOM.avgRating.textContent = state.stats.avgRating.toFixed(1);
    }

    function createBookingCardHTML(booking) {
        const id = booking.id || booking._id;
        const workspaceName = booking.workspaceName || booking.workspace_title || 'Untitled Workspace';
        const guestName = booking.guestName || booking.guest_name || 'Guest';
        const totalAmount = booking.totalAmount || booking.total_amount || 0;
        const status = booking.status || 'pending';
        
        const startTime = booking.startTime || booking.start_time;
        const endTime = booking.endTime || booking.end_time;
        
        const statusConfig = {
            'pending': { class: 'status-pending', label: 'Pending' },
            'confirmed': { class: 'status-confirmed', label: 'Confirmed' },
            'completed': { class: 'status-completed', label: 'Completed' },
            'cancelled': { class: 'status-cancelled', label: 'Cancelled' }
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
                    <i class="ph-fill ph-calendar-blank" style="font-size: 48px; color: var(--border-color); display: block; margin-bottom: 12px;"></i>
                    <p style="font-size: 18px; font-weight: 600; color: var(--text-dark);">No bookings yet</p>
                    <p style="font-size: 14px; color: var(--text-light-gray);">When you get bookings, they'll appear here.</p>
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

        const statusLabel = status.toLowerCase() === 'active' ? 'Active' : 'Inactive';
        const statusClass = status.toLowerCase() === 'active' ? 'status-active' : 'status-inactive';

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
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="ph-fill ph-buildings" style="font-size: 48px; color: var(--border-color); display: block; margin-bottom: 12px;"></i>
                    <p style="font-size: 18px; font-weight: 600; color: var(--text-dark);">No listings yet</p>
                    <p style="font-size: 14px; color: var(--text-light-gray);">List your first workspace and start earning.</p>
                    <button class="btn-primary" onclick="window.location.href='host-create-listing.html'">
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
    // 5. SEARCH HANDLER
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
            const workspace = (booking.workspaceName || booking.workspace_title || '').toLowerCase();
            const guest = (booking.guestName || booking.guest_name || '').toLowerCase();
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
    // 6. TOAST NOTIFICATION SYSTEM
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
    // 7. INITIALIZATION
    // ================================================================

    function init() {
        console.log('🚀 SpaceShare — Host Dashboard (Demo Mode)');
        console.log('📊 Using mock data for demonstration');

        // Render all data immediately
        renderUserProfile();
        renderStats();
        renderRecentBookings();
        renderMyListings();

        // Attach event listeners
        if (DOM.searchInput) {
            DOM.searchInput.addEventListener('input', handleSearchInput);
        }

        console.log('✅ Host Dashboard ready!');
    }

    // ================================================================
    // 8. START
    // ================================================================

    document.addEventListener('DOMContentLoaded', init);

})();