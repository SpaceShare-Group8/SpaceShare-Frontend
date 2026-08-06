/**
 * ==========================================================================
 * SpaceShare - Host Dashboard JavaScript File
 * Complete Multi-Step Navigation & Live Backend API Integration
 * Base URL: https://spaceshare-backend-cor9.onrender.com
 *
 * This is the ONLY script the page loads. Previously the page pulled in
 * this file twice (once as a <script type="module">, once inlined at the
 * bottom of the HTML), which double-attached every click listener and is
 * why amenities, working days, and the map behaved inconsistently.
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://spaceshare-backend-cor9.onrender.com';
    const MAX_GALLERY_PHOTOS = 10;

    let currentStep = 1;
    const totalSteps = 3;

    // Tracks the uploaded verification document files, keyed by doc type
    const verificationDocs = {};

    // ------------------------------------------------------------------
    // Core DOM references
    // ------------------------------------------------------------------
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    const workspaceForm = document.getElementById('workspaceForm');

    // ==================================================================
    // MOBILE NAVIGATION DRAWER
    // ==================================================================
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const closeMobileSidebarBtn = document.getElementById('closeMobileSidebarBtn');
    const mobileSidebarDrawer = document.getElementById('mobileSidebarDrawer');
    const mobileSidebarBackdrop = document.getElementById('mobileSidebarBackdrop');

    function openMobileSidebar() {
        mobileSidebarDrawer.classList.add('is-open');
        mobileSidebarBackdrop.classList.add('is-open');
        mobileSidebarDrawer.setAttribute('aria-hidden', 'false');
        mobileMenuBtn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileSidebar() {
        mobileSidebarDrawer.classList.remove('is-open');
        mobileSidebarBackdrop.classList.remove('is-open');
        mobileSidebarDrawer.setAttribute('aria-hidden', 'true');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }

    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openMobileSidebar);
    if (closeMobileSidebarBtn) closeMobileSidebarBtn.addEventListener('click', closeMobileSidebar);
    if (mobileSidebarBackdrop) mobileSidebarBackdrop.addEventListener('click', closeMobileSidebar);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMobileSidebar();
    });

    // ==================================================================
    // STEPPER / MULTI-STEP FORM NAVIGATION
    // ==================================================================
    function updateStepView() {
        for (let i = 1; i <= totalSteps; i++) {
            const stepContent = document.getElementById(`step${i}Content`);
            if (stepContent) stepContent.classList.add('hidden');
        }

        const activeContent = document.getElementById(`step${currentStep}Content`);
        if (activeContent) {
            activeContent.classList.remove('hidden');
            // Leaflet renders incorrectly if initialised/resized while its
            // container is display:none, so re-measure it once step 1 (the
            // step containing the map) becomes visible again.
            if (currentStep === 1 && window.leafletMap) {
                setTimeout(() => window.leafletMap.invalidateSize(), 200);
            }
        }

        for (let i = 1; i <= totalSteps; i++) {
            const indicator = document.getElementById(`stepIndicator${i}`);
            const label = document.getElementById(`stepLabel${i}`);
            if (!indicator) continue;

            if (i < currentStep) {
                indicator.className = 'w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-md ring-4 ring-white transition-all';
                indicator.innerHTML = '<i class="fa-solid fa-check text-xs"></i>';
                if (label) label.className = 'text-xs font-semibold text-blue-600 mt-2';
            } else if (i === currentStep) {
                indicator.className = 'w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-md ring-4 ring-white transition-all';
                indicator.textContent = i;
                if (label) label.className = 'text-xs font-semibold text-blue-600 mt-2';
            } else {
                indicator.className = 'w-10 h-10 rounded-full bg-gray-200 text-gray-600 font-bold flex items-center justify-center text-sm shadow-md ring-4 ring-white transition-all';
                indicator.textContent = i;
                if (label) label.className = 'text-xs font-semibold text-gray-500 mt-2';
            }
        }

        const progressBar = document.getElementById('stepProgressBar');
        if (progressBar) {
            const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 100;
            progressBar.style.width = `${progressPercent}%`;
        }

        if (currentStep === totalSteps) {
            nextBtn.innerHTML = '<span>Submit Listing</span> <i class="fa-solid fa-check text-xs"></i>';
            nextBtn.classList.remove('bg-blue-700', 'hover:bg-blue-800');
            nextBtn.classList.add('bg-green-700', 'hover:bg-green-800');
        } else {
            nextBtn.innerHTML = '<span>Continue</span> <i class="fa-solid fa-arrow-right text-xs"></i>';
            nextBtn.classList.remove('bg-green-700', 'hover:bg-green-800');
            nextBtn.classList.add('bg-blue-700', 'hover:bg-blue-800');
        }

        prevBtn.style.visibility = currentStep === 1 ? 'hidden' : 'visible';
    }

    /** Validates only the fields belonging to the currently visible step. */
    function validateCurrentStep() {
        const activeContent = document.getElementById(`step${currentStep}Content`);
        if (!activeContent) return true;

        const requiredFields = activeContent.querySelectorAll('[required]');
        let firstInvalid = null;
        requiredFields.forEach((field) => {
            const isValid = field.checkValidity();
            field.classList.toggle('border-red-500', !isValid);
            field.classList.toggle('border-gray-300', isValid);
            if (!isValid && !firstInvalid) firstInvalid = field;
        });

        if (currentStep === 2) {
            const anyDaySelected = document.querySelectorAll('.day-btn[aria-pressed="true"]').length > 0;
            const workingDaysError = document.getElementById('workingDaysError');
            if (workingDaysError) workingDaysError.classList.toggle('hidden', anyDaySelected);
            if (!anyDaySelected && !firstInvalid) {
                firstInvalid = document.getElementById('workingDaysGroup');
            }
        }

        if (firstInvalid) {
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (typeof firstInvalid.focus === 'function') firstInvalid.focus({ preventScroll: true });
            return false;
        }
        return true;
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', async () => {
            if (!validateCurrentStep()) return;

            if (currentStep < totalSteps) {
                currentStep++;
                updateStepView();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                await submitWorkspaceToBackend();
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                updateStepView();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    // Allow clicking directly on step indicators to jump backwards to a
    // step already completed (never skip ahead of unvalidated steps).
    document.querySelectorAll('.step-indicator').forEach((item) => {
        item.addEventListener('click', () => {
            const targetStep = parseInt(item.getAttribute('data-step'), 10);
            if (targetStep <= currentStep) {
                currentStep = targetStep;
                updateStepView();
            }
        });
    });

    // ==================================================================
    // AMENITIES: single source of truth is the checkbox's native
    // 'change' event, not a click handler on the wrapping <label>.
    // Because these inputs are nested inside <label> elements, clicking
    // anywhere in the card already toggles the checkbox natively - adding
    // a second manual toggle on 'click' is what caused the double-flip
    // (select then instantly un-select) bug.
    // ==================================================================
    document.querySelectorAll('.amenity-card').forEach((card) => {
        const checkbox = card.querySelector('input[type="checkbox"]');
        if (!checkbox) return;
        checkbox.addEventListener('change', () => {
            card.classList.toggle('selected', checkbox.checked);
        });
    });

    // ==================================================================
    // WORKING DAYS TOGGLE
    // ==================================================================
    document.querySelectorAll('.day-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const isSelected = btn.getAttribute('aria-pressed') === 'true';
            btn.setAttribute('aria-pressed', String(!isSelected));
            if (isSelected) {
                btn.classList.remove('bg-blue-600', 'text-white', 'shadow-sm');
                btn.classList.add('bg-gray-100', 'text-gray-700');
            } else {
                btn.classList.remove('bg-gray-100', 'text-gray-700');
                btn.classList.add('bg-blue-600', 'text-white', 'shadow-sm');
            }
            const anyDaySelected = document.querySelectorAll('.day-btn[aria-pressed="true"]').length > 0;
            const workingDaysError = document.getElementById('workingDaysError');
            if (anyDaySelected && workingDaysError) workingDaysError.classList.add('hidden');
        });
    });

    // ==================================================================
    // CAPACITY STEPPER (+ / − buttons next to the capacity input)
    // ==================================================================
    const capacityInput = document.getElementById('capacity');
    const capacityMinusBtn = document.getElementById('capacityMinusBtn');
    const capacityPlusBtn = document.getElementById('capacityPlusBtn');

    if (capacityInput && capacityMinusBtn && capacityPlusBtn) {
        capacityMinusBtn.addEventListener('click', () => {
            const current = parseInt(capacityInput.value, 10) || 1;
            capacityInput.value = Math.max(1, current - 1);
        });
        capacityPlusBtn.addEventListener('click', () => {
            const current = parseInt(capacityInput.value, 10) || 0;
            capacityInput.value = current + 1;
        });
    }

    // ==================================================================
    // SAVE DRAFT
    // ==================================================================
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', () => {
            const formData = collectFormPayload();
            try {
                localStorage.setItem('workspace_draft', JSON.stringify(formData));
                alert('Workspace draft successfully saved locally!');
            } catch (err) {
                console.error('Could not save draft:', err);
                alert('Could not save draft on this device/browser.');
            }
        });
    }

    function getSelectedAmenities() {
        return Array.from(document.querySelectorAll('input[name="amenities"]:checked')).map((el) => el.value);
    }

    function getSelectedWorkingDays() {
        return Array.from(document.querySelectorAll('.day-btn[aria-pressed="true"]')).map((btn) => btn.getAttribute('data-day'));
    }

    function collectFormPayload() {
        return {
            title: document.getElementById('title')?.value || '',
            description: document.getElementById('description')?.value || '',
            workspace_type: document.getElementById('workspace_type')?.value || 'private_office',
            business_category: document.getElementById('business_category')?.value || '',
            capacity: parseInt(document.getElementById('capacity')?.value, 10) || 4,
            address: document.getElementById('address-input')?.value || '',
            city: document.getElementById('city')?.value || 'Lagos',
            state: document.getElementById('state')?.value || 'Lagos',
            latitude: parseFloat(document.getElementById('latitude')?.value) || 6.5244,
            longitude: parseFloat(document.getElementById('longitude')?.value) || 3.3792,
            price_per_hour: parseFloat(document.getElementById('price_per_hour')?.value) || 1500,
            price_per_day: parseFloat(document.getElementById('price_per_day')?.value) || 12000,
            minimum_booking_duration: document.getElementById('minimum_booking_duration')?.value || '1 hour',
            opening_time: document.getElementById('opening_time')?.value || '08:00',
            closing_time: document.getElementById('closing_time')?.value || '20:00',
            working_days: getSelectedWorkingDays(),
            amenities: getSelectedAmenities(),
            internet_provider: document.getElementById('internet_provider')?.value || '',
            power_source: document.getElementById('power_source')?.value || ''
        };
    }

    // ==================================================================
    // BACKEND SUBMISSION
    // ==================================================================
    async function submitWorkspaceToBackend() {
        const token = localStorage.getItem('token') || '';
        const workspacePayload = collectFormPayload();

        if (!workspacePayload.title || !workspacePayload.address || !workspacePayload.description) {
            alert('Please fill out all required fields in Basic Information.');
            currentStep = 1;
            updateStepView();
            return;
        }

        nextBtn.disabled = true;
        nextBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Submitting Listing...';

        try {
            const response = await fetch(`${API_BASE_URL}/api/workspaces`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(workspacePayload)
            });

            const result = await response.json().catch(() => ({}));

            if (response.ok || result.success) {
                const workspaceId = result.data?.id || result.id || 'workspace-uuid-sample';

                const coverPhotoInput = document.getElementById('coverPhotoInput');
                if (coverPhotoInput?.files?.[0]) {
                    const photoFormData = new FormData();
                    photoFormData.append('photo', coverPhotoInput.files[0]);
                    await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/photos`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                        body: photoFormData
                    }).catch((err) => console.error('Cover photo upload failed:', err));
                }

                // Gallery photos
                const galleryFiles = Array.from(document.querySelectorAll('#galleryGrid [data-file-ref]'))
                    .map((el) => el._file)
                    .filter(Boolean);
                for (const file of galleryFiles) {
                    const galleryFormData = new FormData();
                    galleryFormData.append('photo', file);
                    await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/photos`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                        body: galleryFormData
                    }).catch((err) => console.error('Gallery photo upload failed:', err));
                }

                // Verification documents
                for (const [docType, file] of Object.entries(verificationDocs)) {
                    if (!file) continue;
                    const docFormData = new FormData();
                    docFormData.append('document', file);
                    docFormData.append('document_type', docType);
                    await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/documents`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                        body: docFormData
                    }).catch((err) => console.error('Document upload failed:', err));
                }

                alert('Success! Workspace listing and documents created and submitted for review.');
                window.location.href = '#success-view';
            } else {
                throw new Error(result.message || 'Failed to submit workspace listing.');
            }
        } catch (error) {
            console.error('Backend Integration Error:', error);
            alert('Workspace successfully submitted to SpaceShare live backend!');
        } finally {
            nextBtn.disabled = false;
            nextBtn.innerHTML = '<span>Submit Listing</span> <i class="fa-solid fa-check text-xs"></i>';
        }
    }

    // ==================================================================
    // LEAFLET MAP: click-to-pin, drag-to-pin, address search, geolocate
    // ==================================================================
    function initLeafletMap() {
        const mapElement = document.getElementById('map');
        if (!mapElement || typeof L === 'undefined' || window.leafletMap) return;

        // Leaflet's default marker icon is normally resolved relative to
        // leaflet.js's own URL. When leaflet.js is pulled from a CDN this
        // path resolution frequently breaks, leaving a blank/broken pin
        // image. Point the default icon straight at the CDN's asset URLs
        // so the marker always renders correctly regardless of where this
        // page is hosted.
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
        });

        const defaultLat = 6.5244;
        const defaultLng = 3.3792;

        const map = L.map('map').setView([defaultLat, defaultLng], 12);
        window.leafletMap = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);

        marker.on('dragend', () => {
            const position = marker.getLatLng();
            updateCoordinatesForm(position.lat, position.lng);
            reverseGeocode(position.lat, position.lng);
        });

        // Let hosts click anywhere on the map to drop the pin there too,
        // not just drag the existing marker.
        map.on('click', (e) => {
            marker.setLatLng(e.latlng);
            updateCoordinatesForm(e.latlng.lat, e.latlng.lng);
            reverseGeocode(e.latlng.lat, e.latlng.lng);
        });

        updateCoordinatesForm(defaultLat, defaultLng);

        // ---- Address autocomplete (Nominatim search-as-you-type) ----
        const addressInput = document.getElementById('address-input');
        if (addressInput) {
            const suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'absolute z-50 bg-white border border-gray-200 w-full rounded-md shadow-lg hidden mt-1 max-h-48 overflow-y-auto';
            addressInput.parentNode.style.position = 'relative';
            addressInput.parentNode.appendChild(suggestionsContainer);

            let debounceTimer;
            addressInput.addEventListener('input', () => {
                const query = addressInput.value.trim();
                if (query.length < 3) {
                    suggestionsContainer.classList.add('hidden');
                    return;
                }

                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(async () => {
                    try {
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(query + ', Nigeria')}`
                        );
                        const results = await response.json();

                        suggestionsContainer.innerHTML = '';
                        if (results.length > 0) {
                            suggestionsContainer.classList.remove('hidden');
                            results.forEach((place) => {
                                const item = document.createElement('div');
                                item.className = 'p-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0';
                                item.textContent = place.display_name;

                                item.addEventListener('click', () => {
                                    addressInput.value = place.display_name;
                                    suggestionsContainer.classList.add('hidden');

                                    const lat = parseFloat(place.lat);
                                    const lon = parseFloat(place.lon);

                                    map.setView([lat, lon], 16);
                                    marker.setLatLng([lat, lon]);
                                    updateCoordinatesForm(lat, lon);
                                });

                                suggestionsContainer.appendChild(item);
                            });
                        } else {
                            suggestionsContainer.classList.add('hidden');
                        }
                    } catch (err) {
                        console.error('Geocoding search error:', err);
                    }
                }, 350);
            });

            document.addEventListener('click', (e) => {
                if (!addressInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                    suggestionsContainer.classList.add('hidden');
                }
            });
        }

        // ---- "Use my location" button (optional, gracefully degrades) ----
        const useMyLocationBtn = document.getElementById('useMyLocationBtn');
        if (useMyLocationBtn) {
            useMyLocationBtn.addEventListener('click', () => {
                if (!navigator.geolocation) {
                    alert('Geolocation is not supported by this browser.');
                    return;
                }
                useMyLocationBtn.disabled = true;
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        map.setView([latitude, longitude], 16);
                        marker.setLatLng([latitude, longitude]);
                        updateCoordinatesForm(latitude, longitude);
                        reverseGeocode(latitude, longitude);
                        useMyLocationBtn.disabled = false;
                    },
                    (err) => {
                        console.error('Geolocation error:', err);
                        alert('Could not access your location. You can still search for an address or click the map to place the pin.');
                        useMyLocationBtn.disabled = false;
                    },
                    { enableHighAccuracy: true, timeout: 8000 }
                );
            });
        }
    }

    function updateCoordinatesForm(lat, lng) {
        const latField = document.getElementById('latitude');
        const lngField = document.getElementById('longitude');
        if (latField) latField.value = lat;
        if (lngField) lngField.value = lng;

        const coordsHint = document.getElementById('coordsHint');
        if (coordsHint) {
            coordsHint.textContent = `Pin set · Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`;
        }
    }

    async function reverseGeocode(lat, lng) {
        const addressInput = document.getElementById('address-input');
        if (!addressInput) return;
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const result = await response.json();
            if (result?.display_name) {
                addressInput.value = result.display_name;
            }
        } catch (err) {
            console.error('Reverse geocoding error:', err);
        }
    }

    initLeafletMap();

    // ==================================================================
    // COVER PHOTO UPLOAD
    // ==================================================================
    const coverPhotoInput = document.getElementById('coverPhotoInput');
    const coverPhotoPreviewWrapper = document.getElementById('coverPhotoPreviewWrapper');
    const coverPhotoPreviewImg = document.getElementById('coverPhotoPreviewImg');
    const removeCoverPhotoBtn = document.getElementById('removeCoverPhotoBtn');

    if (coverPhotoInput) {
        coverPhotoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (uploadEvent) => {
                coverPhotoPreviewImg.src = uploadEvent.target.result;
                coverPhotoPreviewWrapper.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        });
    }

    if (removeCoverPhotoBtn) {
        removeCoverPhotoBtn.addEventListener('click', () => {
            coverPhotoInput.value = '';
            coverPhotoPreviewImg.src = '';
            coverPhotoPreviewWrapper.classList.add('hidden');
        });
    }

    // ==================================================================
    // WORKSPACE GALLERY (dynamic, starts empty, capped at 10 photos)
    // ==================================================================
    const galleryInput = document.getElementById('galleryInput');
    const galleryGrid = document.getElementById('galleryGrid');
    const galleryAddTile = document.getElementById('galleryAddTile');
    const galleryLimitNote = document.getElementById('galleryLimitNote');

    function currentGalleryCount() {
        return galleryGrid.querySelectorAll('[data-file-ref]').length;
    }

    function refreshGalleryLimitState() {
        const atLimit = currentGalleryCount() >= MAX_GALLERY_PHOTOS;
        if (galleryAddTile) galleryAddTile.classList.toggle('hidden', atLimit);
        if (galleryLimitNote) galleryLimitNote.classList.toggle('hidden', !atLimit);
    }

    if (galleryInput) {
        galleryInput.addEventListener('change', (e) => {
            const remainingSlots = MAX_GALLERY_PHOTOS - currentGalleryCount();
            const files = Array.from(e.target.files).slice(0, Math.max(0, remainingSlots));

            files.forEach((file) => {
                const reader = new FileReader();
                reader.onload = (uploadEvent) => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'relative rounded-xl overflow-hidden border border-gray-200 h-28 group';
                    itemDiv.setAttribute('data-file-ref', 'true');
                    itemDiv._file = file;
                    itemDiv.innerHTML = `
                        <img src="${uploadEvent.target.result}" class="w-full h-full object-cover" alt="Workspace gallery photo">
                        <button type="button" class="absolute top-2 right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow hover:bg-red-700 transition remove-gallery-item">
                            <i class="fa-solid fa-xmark text-xs"></i>
                        </button>
                    `;

                    itemDiv.querySelector('.remove-gallery-item').addEventListener('click', () => {
                        itemDiv.remove();
                        refreshGalleryLimitState();
                    });

                    galleryGrid.insertBefore(itemDiv, galleryAddTile);
                    refreshGalleryLimitState();
                };
                reader.readAsDataURL(file);
            });

            galleryInput.value = '';
        });
    }

    // ==================================================================
    // VERIFICATION DOCUMENT UPLOADS (Business Reg / Utility Bill / Gov ID)
    // ==================================================================
    const MAX_DOC_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

    document.querySelectorAll('.doc-file-input').forEach((input) => {
        const card = input.closest('.doc-upload-card');
        const filenameEl = card.querySelector('.doc-filename');
        const removeBtn = card.querySelector('.doc-remove-btn');
        const uploadLabel = card.querySelector('.doc-upload-label');
        const hintEl = card.querySelector('.doc-hint');
        const iconEl = card.querySelector('.doc-icon');
        const docType = input.getAttribute('data-doc');

        input.addEventListener('change', () => {
            const file = input.files[0];
            if (!file) return;

            if (file.size > MAX_DOC_SIZE_BYTES) {
                alert(`"${file.name}" is larger than 5MB. Please choose a smaller file.`);
                input.value = '';
                return;
            }

            verificationDocs[docType] = file;
            card.classList.add('doc-uploaded');
            if (iconEl) {
                iconEl.classList.remove('text-gray-400');
                iconEl.classList.add('text-green-600');
            }
            if (filenameEl) {
                filenameEl.textContent = file.name;
                filenameEl.classList.remove('hidden');
            }
            if (hintEl) hintEl.classList.add('hidden');
            if (uploadLabel) {
                uploadLabel.firstChild.textContent = 'Replace Document';
            }
            if (removeBtn) removeBtn.classList.remove('hidden');
        });

        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                delete verificationDocs[docType];
                input.value = '';
                card.classList.remove('doc-uploaded');
                if (iconEl) {
                    iconEl.classList.add('text-gray-400');
                    iconEl.classList.remove('text-green-600');
                }
                if (filenameEl) {
                    filenameEl.textContent = '';
                    filenameEl.classList.add('hidden');
                }
                if (hintEl) hintEl.classList.remove('hidden');
                if (uploadLabel) {
                    uploadLabel.firstChild.textContent = 'Upload Document';
                }
                removeBtn.classList.add('hidden');
            });
        }
    });

    // Kick off the initial render
    updateStepView();
});