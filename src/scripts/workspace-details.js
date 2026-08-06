/* ==========================================================================
   SpaceShare Workspace Details Master Script (API-Integrated)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {

    // --- Config & API Utilities ---
    const API_BASE_URL = window.API_BASE_URL || "https://spaceshare-backend-cor9.onrender.com";
    let currentPhotoIndex = 0;
    let workspaceData = null;
    let map = null;

    // Extract workspace ID from query parameter (?id=xxx) or URL path
    function getWorkspaceIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const idFromQuery = urlParams.get('id');
        if (idFromQuery) return idFromQuery;

        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1];
        return (lastSegment && lastSegment !== 'workspace-details.html') ? lastSegment : null;
    }

    const workspaceId = getWorkspaceIdFromURL();

    // Retrieve active JWT access token
    function getAuthToken() {
        return localStorage.getItem('access_token') || localStorage.getItem('seekerToken') || '';
    }

    // Dynamic headers generator
    function getHeaders(includeAuth = false) {
        const headers = { 'Content-Type': 'application/json' };
        if (includeAuth) {
            const token = getAuthToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    // --- 1. Fetch Data from SpaceShare APIs ---

    // Fetch Workspace Details: GET /api/workspaces/:id
    async function fetchWorkspaceDetails() {
        if (!workspaceId) return null;
        try {
            const res = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}`, {
                method: 'GET',
                headers: getHeaders(false)
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const result = await res.json();
            return result.data || result;
        } catch (err) {
            console.error("Failed to fetch workspace details:", err);
            return null;
        }
    }

    // Fetch Workspace Photos: GET /api/workspaces/:id/photos
    async function fetchWorkspacePhotos() {
        if (!workspaceId) return [];
        try {
            const res = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/photos`, {
                method: 'GET',
                headers: getHeaders(false)
            });
            if (!res.ok) return [];
            const result = await res.json();
            const photosArray = Array.isArray(result) ? result : (result.data || []);
            return photosArray.map(p => typeof p === 'string' ? p : (p.image_url || p.url));
        } catch (err) {
            console.error("Failed to fetch workspace photos:", err);
            return [];
        }
    }

    // Fetch Reliability Score: GET /api/workspaces/:id/reliability-score
    async function fetchReliabilityScore() {
        if (!workspaceId) return null;
        try {
            const res = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/reliability-score`, {
                method: 'GET',
                headers: getHeaders(true)
            });
            if (!res.ok) return null;
            const result = await res.json();
            return result.data || result;
        } catch (err) {
            console.error("Failed to fetch reliability score:", err);
            return null;
        }
    }

    // Check user's saved favorites list: GET /api/favorites
    async function checkIsFavorite() {
        const token = getAuthToken();
        if (!token || !workspaceId) return false;
        try {
            const res = await fetch(`${API_BASE_URL}/api/favorites`, {
                method: 'GET',
                headers: getHeaders(true)
            });
            if (!res.ok) return false;
            const result = await res.json();
            const favorites = Array.isArray(result) ? result : (result.data || []);
            return favorites.some(fav => (fav.workspace_id || fav.id || fav) === workspaceId);
        } catch (err) {
            console.error("Failed to check favorites:", err);
            return false;
        }
    }

    // Initialize Workspace Page State
    async function initializeWorkspacePage() {
        const details = await fetchWorkspaceDetails();

        if (!details) {
            console.warn("Workspace not found or offline. Using fallback data.");
            workspaceData = {
                id: workspaceId || "32e38db9-50f7-4ffa-97c5-b9d2acc56a80",
                title: "Hub One Workspace",
                price: "₦15,000",
                rawPrice: 15000,
                type: "COWORKING SPACE",
                rating: "4.8",
                reviewsCount: 120,
                address: "Lekki Phase 1, Lagos. 2.5km from your location.",
                lat: 6.4474,
                lng: 3.4723,
                description: "Hub One is a state-of-the-art workspace located in the heart of Lekki...",
                photos: [
                    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=1200&q=80"
                ],
                isFavorite: false
            };
        } else {
            const [photos, reliability, isFav] = await Promise.all([
                fetchWorkspacePhotos(),
                fetchReliabilityScore(),
                checkIsFavorite()
            ]);

            const priceNum = Number(details.price || details.rawPrice || 15000);

            workspaceData = {
                id: details.id || workspaceId,
                title: details.title || "Workspace Details",
                price: `₦${priceNum.toLocaleString()}`,
                rawPrice: priceNum,
                type: (details.workspace_type || "COWORKING SPACE").toUpperCase(),
                rating: reliability?.reliabilityScore || details.rating || "4.8",
                reviewsCount: reliability?.reviewCount || details.reviewsCount || 0,
                address: `${details.address || ''}, ${details.city || ''}`.replace(/^,\s*/, '') || "Lagos, Nigeria",
                lat: Number(details.latitude) || 6.4474,
                lng: Number(details.longitude) || 3.4723,
                description: details.description || "No description available.",
                photos: photos.length > 0 ? photos : [
                    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80"
                ],
                isFavorite: isFav
            };
        }

        renderDOM();
        initMap();
    }

    // Synchronize UI Elements
    function renderDOM() {
        const titleEl = document.getElementById('workspaceTitle');
        const priceEl = document.getElementById('workspacePrice');
        const typeEl = document.getElementById('workspaceType');
        const ratingEl = document.getElementById('workspaceRating');
        const reviewsCountEl = document.getElementById('workspaceReviewsCount');
        const addressEl = document.getElementById('workspaceAddress');
        const descEl = document.getElementById('aboutTextContainer');

        if (titleEl) titleEl.textContent = workspaceData.title;
        if (priceEl) priceEl.textContent = workspaceData.price;
        if (typeEl) typeEl.textContent = workspaceData.type;
        if (ratingEl) ratingEl.textContent = workspaceData.rating;
        if (reviewsCountEl) reviewsCountEl.textContent = `(${workspaceData.reviewsCount} reviews)`;
        if (addressEl) addressEl.textContent = workspaceData.address;
        if (descEl) descEl.textContent = workspaceData.description;

        updateFavoriteUI();
        updateGalleryDisplay();
    }

    // --- 2. Sidebar Navigation Logic ---
    const sidebar = document.getElementById('appSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const closeBtn = document.getElementById('sidebarCloseBtn');

    function openSidebar() {
        if (sidebar && overlay) {
            sidebar.classList.add('open');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeSidebar() {
        if (sidebar && overlay) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // --- 3. Photo Gallery Carousel Logic ---
    const featuredPhoto = document.getElementById('featuredPhoto');
    const photoCounter = document.getElementById('photoCounter');
    const prevBtn = document.getElementById('prevPhotoBtn');
    const nextBtn = document.getElementById('nextPhotoBtn');

    function updateGalleryDisplay() {
        if (!featuredPhoto || !photoCounter || !workspaceData?.photos?.length) return;

        featuredPhoto.style.opacity = '0.4';

        setTimeout(() => {
            featuredPhoto.src = workspaceData.photos[currentPhotoIndex];
            photoCounter.textContent = `${currentPhotoIndex + 1} / ${workspaceData.photos.length}`;
            featuredPhoto.style.opacity = '1';
        }, 150);
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (!workspaceData?.photos?.length) return;
            currentPhotoIndex = (currentPhotoIndex === 0) 
                ? workspaceData.photos.length - 1 
                : currentPhotoIndex - 1;
            updateGalleryDisplay();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (!workspaceData?.photos?.length) return;
            currentPhotoIndex = (currentPhotoIndex === workspaceData.photos.length - 1) 
                ? 0 
                : currentPhotoIndex + 1;
            updateGalleryDisplay();
        });
    }

    // --- 4. Favorite Toggle with Backend Syncing ---
    const favoriteBtn = document.getElementById('favoriteToggleBtn');
    const favoriteIcon = document.getElementById('favoriteHeartIcon');

    function updateFavoriteUI() {
        if (!favoriteBtn || !favoriteIcon) return;
        if (workspaceData.isFavorite) {
            favoriteBtn.classList.add('active');
            favoriteIcon.className = 'ph-fill ph-heart';
        } else {
            favoriteBtn.classList.remove('active');
            favoriteIcon.className = 'ph ph-heart';
        }
    }

    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', async () => {
            const token = getAuthToken();
            if (!token) {
                alert("Please log in to manage your favorite workspaces.");
                return;
            }

            const targetState = !workspaceData.isFavorite;
            const endpoint = `${API_BASE_URL}/api/favorites/${workspaceData.id}`;
            const method = targetState ? 'POST' : 'DELETE';

            try {
                const res = await fetch(endpoint, {
                    method: method,
                    headers: getHeaders(true)
                });

                if (res.ok) {
                    workspaceData.isFavorite = targetState;
                    updateFavoriteUI();
                } else {
                    const err = await res.json();
                    alert(err.message || "Could not update favorites.");
                }
            } catch (err) {
                console.error("Favorite toggle failed:", err);
            }
        });
    }

    // --- 5. Interactive Leaflet Map Setup ---
    function initMap() {
        const mapElement = document.getElementById('workspaceMap');
        if (!mapElement || typeof L === 'undefined' || !workspaceData) return;

        if (map) {
            map.remove();
        }

        map = L.map('workspaceMap', {
            zoomControl: true,
            scrollWheelZoom: false
        }).setView([workspaceData.lat, workspaceData.lng], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const priceIcon = L.divIcon({
            className: 'custom-map-pill',
            html: `<div style="background-color:#0052FF; color:#ffffff; padding:6px 12px; border-radius:20px; font-weight:700; font-size:13px; box-shadow:0 4px 10px rgba(0,82,255,0.4); white-space:nowrap;">${workspaceData.price}/hr</div>`,
            iconSize: [80, 32],
            iconAnchor: [40, 16]
        });

        L.marker([workspaceData.lat, workspaceData.lng], { icon: priceIcon })
            .addTo(map)
            .bindPopup(`<strong>${workspaceData.title}</strong><br>${workspaceData.address}`)
            .openPopup();
    }

    // --- 6. Expand Description Control ---
    const expandBtn = document.getElementById('expandDescriptionBtn');
    const textContainer = document.getElementById('aboutTextContainer');

    if (expandBtn && textContainer) {
        let expanded = false;
        expandBtn.addEventListener('click', () => {
            expanded = !expanded;
            if (expanded) {
                textContainer.style.webkitLineClamp = 'unset';
                textContainer.style.display = 'block';
                expandBtn.textContent = 'Show Less';
            } else {
                textContainer.style.webkitLineClamp = '3';
                textContainer.style.display = '-webkit-box';
                expandBtn.textContent = 'Show More';
            }
        });
    }

    // --- 7. Availability & Booking Logic ---

    // Check Availability API Endpoint: GET /api/workspaces/:id/availability
    async function checkAvailability() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceData.id}/availability`, {
                method: 'GET',
                headers: getHeaders(true)
            });
            if (!res.ok) throw new Error("Could not fetch availability status");
            return await res.json();
        } catch (err) {
            console.error("Availability check failed:", err);
            return null;
        }
    }

    // Create Booking API Endpoint: POST /api/bookings
    async function createBooking(startTime, endTime, totalAmount) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/bookings`, {
                method: 'POST',
                headers: getHeaders(true),
                body: JSON.stringify({
                    workspaceId: workspaceData.id,
                    startTime: startTime,
                    endTime: endTime,
                    totalAmount: totalAmount
                })
            });

            const responseData = await res.json();

            if (res.status === 201) {
                const booking = responseData.data?.booking || responseData.booking;
                const bookingId = booking?.id || responseData.id;

                alert(responseData.message || "Booking created successfully. Initiating payment...");

                // Initiate payment for booking
                await initiatePayment(bookingId);
            } else if (res.status === 409) {
                alert("Selected time slot is no longer available.");
            } else {
                alert(responseData.message || "Failed to create booking.");
            }
        } catch (err) {
            console.error("Create booking error:", err);
            alert("An error occurred while creating your booking.");
        }
    }

    // Initiate Payment API Endpoint: POST /api/payments/initiate
    async function initiatePayment(bookingId) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/payments/initiate`, {
                method: 'POST',
                headers: getHeaders(true),
                body: JSON.stringify({
                    bookingId: bookingId,
                    paymentMethod: "card"
                })
            });

            const paymentData = await res.json();

            if (res.ok) {
                const redirectUrl = paymentData.paymentUrl || paymentData.data?.authorization_url;
                if (redirectUrl) {
                    window.location.href = redirectUrl;
                } else {
                    window.location.href = `/checkout.html?bookingId=${bookingId}`;
                }
            } else {
                alert(paymentData.message || "Failed to initiate payment checkout.");
            }
        } catch (err) {
            console.error("Payment initiation error:", err);
            window.location.href = `/checkout.html?bookingId=${bookingId}`;
        }
    }

    // Real-Time Availability & Booking Handler
    const checkAvailabilityBtn = document.getElementById('checkAvailabilityBtn');
    if (checkAvailabilityBtn) {
        checkAvailabilityBtn.addEventListener('click', async () => {
            const token = getAuthToken();
            if (!token) {
                alert("Please log in to check availability and make a booking.");
                return;
            }

            checkAvailabilityBtn.textContent = 'Checking Live Slots...';
            checkAvailabilityBtn.disabled = true;

            const availability = await checkAvailability();
            checkAvailabilityBtn.textContent = 'Check Availability';
            checkAvailabilityBtn.disabled = false;

            // Generate booking timeframe (2 Hours starting from next hour)
            const now = new Date();
            const startTime = new Date(now.getTime() + 3600000).toISOString();
            const endTime = new Date(now.getTime() + 10800000).toISOString();
            const totalAmount = workspaceData.rawPrice * 2;

            if (confirm(`Reserve a 2-hour session at ${workspaceData.title} for ₦${totalAmount.toLocaleString()}?`)) {
                await createBooking(startTime, endTime, totalAmount);
            }
        });
    }

    // --- Run Initialization ---
    await initializeWorkspacePage();
});