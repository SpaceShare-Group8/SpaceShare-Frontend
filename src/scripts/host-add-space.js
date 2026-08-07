/**
 * ==========================================================================
 * SpaceShare - Host Add Workspace
 * Complete Functional Implementation - AUTHENTICATED VERSION
 * Uses the logged-in host's token to create workspaces
 * API Base: https://spaceshare-backend-cor9.onrender.com
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // ============================================================
    // CONFIGURATION
    // ============================================================
    const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000'
        : 'https://spaceshare-backend-cor9.onrender.com';
    
    const MAX_GALLERY_PHOTOS = 10;

    const STORAGE_KEYS = {
        ACCESS_TOKEN: 'spaceshare:accessToken',
        REFRESH_TOKEN: 'spaceshare:refreshToken',
        USER_DATA: 'spaceshare:user',
        USER_ROLE: 'spaceshare:userRole'
    };

    // ============================================================
    // DOM REFERENCES
    // ============================================================
    const form = document.getElementById('workspaceForm');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    
    // Step containers
    const step1Content = document.getElementById('step1Content');
    const step2Content = document.getElementById('step2Content');
    const step3Content = document.getElementById('step3Content');
    
    // Step indicators
    const stepIndicator1 = document.getElementById('stepIndicator1');
    const stepIndicator2 = document.getElementById('stepIndicator2');
    const stepIndicator3 = document.getElementById('stepIndicator3');
    const stepLabel1 = document.getElementById('stepLabel1');
    const stepLabel2 = document.getElementById('stepLabel2');
    const stepLabel3 = document.getElementById('stepLabel3');
    const progressBar = document.getElementById('stepProgressBar');

    // Form fields
    const titleInput = document.getElementById('title');
    const descriptionInput = document.getElementById('description');
    const workspaceTypeSelect = document.getElementById('workspace_type');
    const addressInput = document.getElementById('address-input');
    const citySelect = document.getElementById('city');
    const stateSelect = document.getElementById('state');
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    const capacityInput = document.getElementById('capacity');
    const pricePerHourInput = document.getElementById('price_per_hour');
    const pricePerDayInput = document.getElementById('price_per_day');
    const openingTimeInput = document.getElementById('opening_time');
    const closingTimeInput = document.getElementById('closing_time');
    const internetProviderSelect = document.getElementById('internet_provider');
    const powerSourceSelect = document.getElementById('power_source');
    const termsCheck = document.getElementById('termsCheck');
    const coverPhotoInput = document.getElementById('coverPhotoInput');
    const galleryInput = document.getElementById('galleryInput');
    const galleryGrid = document.getElementById('galleryGrid');
    const galleryAddTile = document.getElementById('galleryAddTile');

    // ============================================================
    // STATE
    // ============================================================
    let currentStep = 1;
    const totalSteps = 3;
    let uploadedGalleryFiles = [];
    let verificationDocs = {};
    let currentUser = null;

    // ============================================================
    // AUTHENTICATION HELPERS
    // ============================================================
    
    function getAccessToken() {
        return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
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
        console.warn('⚠️ User is not a host. Redirecting to seeker dashboard...');
        window.location.href = 'seeker-dashboard.html';
    }

    // ============================================================
    // API HELPERS
    // ============================================================
    
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

    // ============================================================
    // FETCH CURRENT USER
    // ============================================================
    
    async function fetchCurrentUser() {
        try {
            const result = await apiRequest('/api/auth/me');
            return result.data || result;
        } catch (error) {
            console.error('❌ Failed to fetch user:', error);
            throw error;
        }
    }

    // ============================================================
    // TOAST NOTIFICATION
    // ============================================================
    
    function showToast(message, type = 'success') {
        // Remove existing toast
        const existing = document.querySelector('.toast-notification');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            border-radius: 12px;
            color: white;
            font-weight: 500;
            z-index: 9999;
            max-width: 400px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#F59E0B'};
            animation: slideIn 0.3s ease;
            font-family: 'Inter', sans-serif;
            transform: translateX(100px);
            opacity: 0;
            transition: transform 0.3s ease, opacity 0.3s ease;
        `;
        toast.innerHTML = `
            <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}" style="margin-right: 10px;"></i>
            ${message}
        `;
        document.body.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        });
        
        setTimeout(() => {
            toast.style.transform = 'translateX(100px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    // ============================================================
    // STEPPER NAVIGATION
    // ============================================================
    
    function updateStepView() {
        // Hide all steps
        [step1Content, step2Content, step3Content].forEach(el => {
            if (el) el.classList.add('hidden');
        });

        // Show current step
        const activeStep = document.getElementById(`step${currentStep}Content`);
        if (activeStep) {
            activeStep.classList.remove('hidden');
            
            // Re-initialize map if on step 1
            if (currentStep === 1 && window.leafletMap) {
                setTimeout(() => window.leafletMap.invalidateSize(), 300);
            }
        }

        // Update indicators
        for (let i = 1; i <= totalSteps; i++) {
            const indicator = document.getElementById(`stepIndicator${i}`);
            const label = document.getElementById(`stepLabel${i}`);
            
            if (!indicator) continue;

            if (i < currentStep) {
                indicator.className = 'w-10 h-10 rounded-full bg-green-600 text-white font-bold flex items-center justify-center text-sm shadow-md ring-4 ring-white transition-all';
                indicator.innerHTML = '<i class="fa-solid fa-check text-xs"></i>';
                if (label) label.className = 'text-xs font-semibold text-green-600 mt-2';
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

        // Update progress bar
        if (progressBar) {
            const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
            progressBar.style.width = `${progress}%`;
        }

        // Update buttons
        if (nextBtn) {
            if (currentStep === totalSteps) {
                nextBtn.innerHTML = '<i class="fa-solid fa-check-circle mr-2"></i> Publish Workspace';
                nextBtn.className = 'px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium text-sm transition shadow-sm flex items-center space-x-2';
            } else {
                nextBtn.innerHTML = '<span>Continue</span> <i class="fa-solid fa-arrow-right text-xs"></i>';
                nextBtn.className = 'px-8 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-medium text-sm transition shadow-sm flex items-center space-x-2';
            }
        }

        if (prevBtn) {
            prevBtn.style.visibility = currentStep === 1 ? 'hidden' : 'visible';
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function validateStep(step) {
        const stepContent = document.getElementById(`step${step}Content`);
        if (!stepContent) return true;

        const requiredFields = stepContent.querySelectorAll('[required]');
        let isValid = true;
        let firstInvalid = null;

        requiredFields.forEach(field => {
            const fieldIsValid = field.checkValidity();
            field.classList.toggle('border-red-500', !fieldIsValid);
            field.classList.toggle('border-gray-300', fieldIsValid);
            
            if (!fieldIsValid && !firstInvalid) {
                firstInvalid = field;
            }
            isValid = isValid && fieldIsValid;
        });

        // Step 2: Check working days
        if (step === 2) {
            const selectedDays = document.querySelectorAll('.day-btn[aria-pressed="true"]');
            const workingDaysError = document.getElementById('workingDaysError');
            
            if (selectedDays.length === 0) {
                if (workingDaysError) workingDaysError.classList.remove('hidden');
                isValid = false;
                if (!firstInvalid) firstInvalid = document.getElementById('workingDaysGroup');
            } else {
                if (workingDaysError) workingDaysError.classList.add('hidden');
            }
        }

        // Step 3: Check cover photo
        if (step === 3) {
            const coverPhotoWrapper = document.getElementById('coverPhotoPreviewWrapper');
            if (coverPhotoWrapper && coverPhotoWrapper.classList.contains('hidden')) {
                showToast('Please upload a cover photo for your workspace', 'error');
                isValid = false;
                if (!firstInvalid) firstInvalid = document.getElementById('coverPhotoContainer');
            }

            if (!termsCheck || !termsCheck.checked) {
                showToast('Please agree to the Terms & Conditions', 'error');
                isValid = false;
                if (!firstInvalid) firstInvalid = termsCheck;
            }
        }

        if (!isValid && firstInvalid) {
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (typeof firstInvalid.focus === 'function') {
                firstInvalid.focus({ preventScroll: true });
            }
        }

        return isValid;
    }

    // ============================================================
    // NEXT / PREVIOUS BUTTONS
    // ============================================================
    
    if (nextBtn) {
        nextBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (!validateStep(currentStep)) return;

            if (currentStep < totalSteps) {
                currentStep++;
                updateStepView();
            } else {
                await submitWorkspace();
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                updateStepView();
            }
        });
    }

    // Click on step indicators
    document.querySelectorAll('.step-indicator').forEach(el => {
        el.addEventListener('click', () => {
            const target = parseInt(el.dataset.step, 10);
            if (target <= currentStep) {
                currentStep = target;
                updateStepView();
            }
        });
    });

    // ============================================================
    // COLLECT FORM DATA
    // ============================================================
    
    function getSelectedAmenities() {
        return Array.from(document.querySelectorAll('input[name="amenities"]:checked'))
            .map(el => el.value);
    }

    function getSelectedWorkingDays() {
        return Array.from(document.querySelectorAll('.day-btn[aria-pressed="true"]'))
            .map(btn => btn.dataset.day);
    }

    function collectFormData() {
        return {
            title: titleInput?.value?.trim() || '',
            description: descriptionInput?.value?.trim() || '',
            workspace_type: workspaceTypeSelect?.value || 'private_office',
            capacity: parseInt(capacityInput?.value) || 1,
            address: addressInput?.value?.trim() || '',
            city: citySelect?.value || 'Lagos',
            state: stateSelect?.value || 'Lagos',
            latitude: parseFloat(latitudeInput?.value) || 6.5244,
            longitude: parseFloat(longitudeInput?.value) || 3.3792,
            amenities: getSelectedAmenities(),
            working_days: getSelectedWorkingDays(),
            price_per_hour: parseFloat(pricePerHourInput?.value) || 0,
            price_per_day: parseFloat(pricePerDayInput?.value) || 0,
            opening_time: openingTimeInput?.value || '08:00',
            closing_time: closingTimeInput?.value || '20:00',
            internet_provider: internetProviderSelect?.value || '',
            power_source: powerSourceSelect?.value || ''
        };
    }

    // ============================================================
    // SUBMIT WORKSPACE TO BACKEND
    // ============================================================
    
    async function submitWorkspace() {
        const token = getAccessToken();
        
        if (!token) {
            showToast('Please login to create a workspace', 'error');
            redirectToLogin();
            return;
        }

        const workspaceData = collectFormData();

        // Validate required fields
        if (!workspaceData.title) {
            showToast('Please enter a workspace name', 'error');
            currentStep = 1;
            updateStepView();
            return;
        }

        if (!workspaceData.address) {
            showToast('Please enter an address', 'error');
            currentStep = 1;
            updateStepView();
            return;
        }

        if (!workspaceData.description) {
            showToast('Please enter a description', 'error');
            currentStep = 1;
            updateStepView();
            return;
        }

        if (workspaceData.working_days.length === 0) {
            showToast('Please select at least one working day', 'error');
            currentStep = 2;
            updateStepView();
            return;
        }

        // Disable submit button
        if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Creating Workspace...';
        }

        try {
            console.log('📤 Submitting workspace data:', workspaceData);
            console.log('🔑 Using token:', token.substring(0, 20) + '...');

            // 1. Create workspace
            const response = await fetch(`${API_BASE_URL}/api/workspaces`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(workspaceData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to create workspace');
            }

            const workspaceId = result.data?.id || result.id;
            console.log('✅ Workspace created with ID:', workspaceId);
            showToast('Workspace created! Uploading photos...', 'success');

            // 2. Upload cover photo
            if (coverPhotoInput?.files?.[0]) {
                await uploadPhoto(workspaceId, coverPhotoInput.files[0], token);
            }

            // 3. Upload gallery photos
            if (uploadedGalleryFiles.length > 0) {
                for (const file of uploadedGalleryFiles) {
                    await uploadPhoto(workspaceId, file, token);
                }
            }

            // 4. Upload verification documents
            for (const [docType, file] of Object.entries(verificationDocs)) {
                if (file) {
                    await uploadDocument(workspaceId, file, docType, token);
                }
            }

            showToast('🎉 Workspace created successfully! It will appear in the frontend.', 'success');
            
            // Reset form or redirect to host dashboard
            setTimeout(() => {
                window.location.href = 'host-dashboard.html';
            }, 3000);

        } catch (error) {
            console.error('❌ Error creating workspace:', error);
            showToast(error.message || 'Failed to create workspace. Please try again.', 'error');
            
            if (nextBtn) {
                nextBtn.disabled = false;
                nextBtn.innerHTML = '<span>Submit Listing</span> <i class="fa-solid fa-check text-xs"></i>';
            }
        }
    }

    // ============================================================
    // PHOTO UPLOAD HELPERS
    // ============================================================
    
    async function uploadPhoto(workspaceId, file, token) {
        const formData = new FormData();
        formData.append('photo', file);

        try {
            const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/photos`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Photo upload failed');
            }

            console.log('📸 Photo uploaded successfully');
            return await response.json();
        } catch (error) {
            console.error('Photo upload error:', error);
            throw error;
        }
    }

    async function uploadDocument(workspaceId, file, docType, token) {
        const formData = new FormData();
        formData.append('document', file);
        formData.append('document_type', docType);

        try {
            const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/documents`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Document upload failed');
            }

            console.log(`📄 ${docType} uploaded successfully`);
            return await response.json();
        } catch (error) {
            console.error('Document upload error:', error);
            throw error;
        }
    }

    // ============================================================
    // AMENITY CARDS - TOGGLE
    // ============================================================
    
    document.querySelectorAll('.amenity-card').forEach(card => {
        const checkbox = card.querySelector('input[type="checkbox"]');
        if (!checkbox) return;

        checkbox.addEventListener('change', () => {
            card.classList.toggle('selected', checkbox.checked);
        });
    });

    // ============================================================
    // WORKING DAYS TOGGLE
    // ============================================================
    
    document.querySelectorAll('.day-btn').forEach(btn => {
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
            
            // Update error state
            const workingDaysError = document.getElementById('workingDaysError');
            const selectedDays = document.querySelectorAll('.day-btn[aria-pressed="true"]');
            if (workingDaysError) {
                workingDaysError.classList.toggle('hidden', selectedDays.length > 0);
            }
        });
    });

    // ============================================================
    // CAPACITY STEPPER
    // ============================================================
    
    const capacityMinusBtn = document.getElementById('capacityMinusBtn');
    const capacityPlusBtn = document.getElementById('capacityPlusBtn');

    if (capacityMinusBtn) {
        capacityMinusBtn.addEventListener('click', () => {
            const val = parseInt(capacityInput?.value) || 1;
            if (val > 1) {
                capacityInput.value = val - 1;
            }
        });
    }

    if (capacityPlusBtn) {
        capacityPlusBtn.addEventListener('click', () => {
            const val = parseInt(capacityInput?.value) || 0;
            capacityInput.value = val + 1;
        });
    }

    // ============================================================
    // COVER PHOTO UPLOAD
    // ============================================================
    
    const coverPhotoPreviewWrapper = document.getElementById('coverPhotoPreviewWrapper');
    const coverPhotoPreviewImg = document.getElementById('coverPhotoPreviewImg');
    const removeCoverPhotoBtn = document.getElementById('removeCoverPhotoBtn');

    if (coverPhotoInput) {
        coverPhotoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                coverPhotoPreviewImg.src = event.target.result;
                coverPhotoPreviewWrapper.classList.remove('hidden');
                showToast('Cover photo uploaded successfully', 'success');
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

    // ============================================================
    // GALLERY PHOTOS UPLOAD
    // ============================================================
    
    if (galleryInput) {
        galleryInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            const remainingSlots = MAX_GALLERY_PHOTOS - uploadedGalleryFiles.length;
            
            if (remainingSlots <= 0) {
                showToast('Maximum 10 gallery photos allowed', 'error');
                galleryInput.value = '';
                return;
            }

            const filesToUpload = files.slice(0, remainingSlots);
            
            filesToUpload.forEach(file => {
                uploadedGalleryFiles.push(file);
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'relative rounded-xl overflow-hidden border border-gray-200 h-28 group';
                    itemDiv.innerHTML = `
                        <img src="${event.target.result}" class="w-full h-full object-cover" alt="Gallery photo">
                        <button type="button" class="absolute top-2 right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow hover:bg-red-700 transition remove-gallery-item">
                            <i class="fa-solid fa-xmark text-xs"></i>
                        </button>
                    `;

                    const removeBtn = itemDiv.querySelector('.remove-gallery-item');
                    removeBtn.addEventListener('click', () => {
                        const index = uploadedGalleryFiles.indexOf(file);
                        if (index > -1) {
                            uploadedGalleryFiles.splice(index, 1);
                        }
                        itemDiv.remove();
                        updateGalleryUI();
                    });

                    galleryGrid.insertBefore(itemDiv, galleryAddTile);
                    updateGalleryUI();
                };
                reader.readAsDataURL(file);
            });

            galleryInput.value = '';
        });
    }

    function updateGalleryUI() {
        const atLimit = uploadedGalleryFiles.length >= MAX_GALLERY_PHOTOS;
        if (galleryAddTile) {
            galleryAddTile.style.display = atLimit ? 'none' : 'flex';
        }
        const limitNote = document.getElementById('galleryLimitNote');
        if (limitNote) {
            limitNote.classList.toggle('hidden', !atLimit);
        }
    }

    // ============================================================
    // VERIFICATION DOCUMENTS
    // ============================================================
    
    document.querySelectorAll('.doc-file-input').forEach(input => {
        const card = input.closest('.doc-upload-card');
        const docType = input.dataset.doc;
        const filenameEl = card.querySelector('.doc-filename');
        const removeBtn = card.querySelector('.doc-remove-btn');
        const iconEl = card.querySelector('.doc-icon');

        input.addEventListener('change', () => {
            const file = input.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                showToast('File size must be less than 5MB', 'error');
                input.value = '';
                return;
            }

            verificationDocs[docType] = file;
            
            if (filenameEl) {
                filenameEl.textContent = file.name;
                filenameEl.classList.remove('hidden');
            }
            if (removeBtn) removeBtn.classList.remove('hidden');
            if (iconEl) {
                iconEl.classList.remove('text-gray-400');
                iconEl.classList.add('text-green-600');
            }
            
            showToast(`${docType.replace('_', ' ')} uploaded successfully`, 'success');
        });

        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                delete verificationDocs[docType];
                input.value = '';
                
                if (filenameEl) {
                    filenameEl.textContent = '';
                    filenameEl.classList.add('hidden');
                }
                if (removeBtn) removeBtn.classList.add('hidden');
                if (iconEl) {
                    iconEl.classList.add('text-gray-400');
                    iconEl.classList.remove('text-green-600');
                }
            });
        }
    });

    // ============================================================
    // SAVE DRAFT (Local Storage)
    // ============================================================
    
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', () => {
            const data = collectFormData();
            try {
                localStorage.setItem('workspace_draft', JSON.stringify(data));
                showToast('Draft saved successfully!', 'success');
            } catch (error) {
                showToast('Could not save draft', 'error');
            }
        });
    }

    // ============================================================
    // LEAFLET MAP
    // ============================================================
    
    function initLeafletMap() {
        const mapElement = document.getElementById('map');
        if (!mapElement || typeof L === 'undefined' || window.leafletMap) return;

        // Fix Leaflet marker icons
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
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        const marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);

        marker.on('dragend', () => {
            const pos = marker.getLatLng();
            updateCoordinates(pos.lat, pos.lng);
            reverseGeocode(pos.lat, pos.lng);
        });

        map.on('click', (e) => {
            marker.setLatLng(e.latlng);
            updateCoordinates(e.latlng.lat, e.latlng.lng);
            reverseGeocode(e.latlng.lat, e.latlng.lng);
        });

        updateCoordinates(defaultLat, defaultLng);

        // Address autocomplete
        if (addressInput) {
            let debounceTimer;
            const suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'absolute z-50 bg-white border border-gray-200 w-full rounded-md shadow-lg hidden mt-1 max-h-48 overflow-y-auto';
            addressInput.parentNode.style.position = 'relative';
            addressInput.parentNode.appendChild(suggestionsContainer);

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
                            results.forEach(place => {
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
                                    updateCoordinates(lat, lon);
                                });

                                suggestionsContainer.appendChild(item);
                            });
                        } else {
                            suggestionsContainer.classList.add('hidden');
                        }
                    } catch (error) {
                        console.error('Geocoding error:', error);
                    }
                }, 400);
            });

            document.addEventListener('click', (e) => {
                if (!addressInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                    suggestionsContainer.classList.add('hidden');
                }
            });
        }

        // Use my location
        const useMyLocationBtn = document.getElementById('useMyLocationBtn');
        if (useMyLocationBtn) {
            useMyLocationBtn.addEventListener('click', () => {
                if (!navigator.geolocation) {
                    showToast('Geolocation is not supported by your browser', 'error');
                    return;
                }

                useMyLocationBtn.disabled = true;
                useMyLocationBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        map.setView([latitude, longitude], 16);
                        marker.setLatLng([latitude, longitude]);
                        updateCoordinates(latitude, longitude);
                        reverseGeocode(latitude, longitude);
                        useMyLocationBtn.disabled = false;
                        useMyLocationBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Use my location';
                    },
                    (error) => {
                        console.error('Geolocation error:', error);
                        showToast('Could not get your location. Please enter an address.', 'error');
                        useMyLocationBtn.disabled = false;
                        useMyLocationBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Use my location';
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            });
        }
    }

    function updateCoordinates(lat, lng) {
        if (latitudeInput) latitudeInput.value = lat;
        if (longitudeInput) longitudeInput.value = lng;
        
        const coordsHint = document.getElementById('coordsHint');
        if (coordsHint) {
            coordsHint.textContent = `📍 Pin set · Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`;
        }
    }

    async function reverseGeocode(lat, lng) {
        if (!addressInput) return;
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const result = await response.json();
            if (result?.display_name) {
                addressInput.value = result.display_name;
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
        }
    }

    // ============================================================
    // MOBILE SIDEBAR
    // ============================================================
    
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const closeMobileSidebarBtn = document.getElementById('closeMobileSidebarBtn');
    const mobileSidebarDrawer = document.getElementById('mobileSidebarDrawer');
    const mobileSidebarBackdrop = document.getElementById('mobileSidebarBackdrop');

    function openMobileSidebar() {
        if (mobileSidebarDrawer) mobileSidebarDrawer.classList.add('is-open');
        if (mobileSidebarBackdrop) mobileSidebarBackdrop.classList.add('is-open');
        if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileSidebar() {
        if (mobileSidebarDrawer) mobileSidebarDrawer.classList.remove('is-open');
        if (mobileSidebarBackdrop) mobileSidebarBackdrop.classList.remove('is-open');
        if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }

    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openMobileSidebar);
    if (closeMobileSidebarBtn) closeMobileSidebarBtn.addEventListener('click', closeMobileSidebar);
    if (mobileSidebarBackdrop) mobileSidebarBackdrop.addEventListener('click', closeMobileSidebar);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMobileSidebar();
    });

    // ============================================================
    // INITIALIZATION
    // ============================================================
    
    async function init() {
        console.log('🚀 SpaceShare Host Add Workspace (Authenticated)');
        console.log(`📍 API Base: ${API_BASE_URL}`);

        // Check authentication
        if (!isAuthenticated()) {
            showToast('Please login to create a workspace', 'error');
            redirectToLogin();
            return;
        }

        // Check role
        const role = getUserRole();
        if (role !== 'host