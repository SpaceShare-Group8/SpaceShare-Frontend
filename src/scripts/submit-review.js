/**
 * SpaceShare — Submit Review
 * ------------------------------------------------
 * Handles:
 *   1. Star rating interaction and label updates
 *   2. Trust engine (power/internet) validation
 *   3. Form submission to POST /api/bookings/:id/review
 *   4. Loading states, errors, success feedback
 *   5. Workspace/booking data injection from URL or mock
 *
 * Backend endpoint: https://spaceshare-backend-cor9.onrender.com/api/bookings/:id/review
 * PRD section: 11.12 Ratings and Reviews
 * API contract: 16.6 Reviews & Reliability
 */

(function() {
    'use strict';

    // ----------------------------------------------
    // Configuration & DOM references
    // ----------------------------------------------

    const CONFIG = {
        BASE_URL: 'https://spaceshare-backend-cor9.onrender.com',
        REVIEW_PATH: '/api/bookings',
        // Default booking ID — in production, this comes from URL or state.
        // For demo purposes, we use a hardcoded ID from the API collection.
        // In a real app, you'd parse from URL: /submit-review.html?bookingId=...
        FALLBACK_BOOKING_ID: '32e38db9-50f7-4ffa-97c5-b9d2acc56a80',
    };

    // DOM elements
    const stars = document.querySelectorAll('#starRating i');
    const ratingLabel = document.getElementById('ratingLabel');
    const submitBtn = document.getElementById('submitReviewBtn');
    const reviewText = document.getElementById('reviewComment');
    const powerRadios = document.querySelectorAll('input[name="powerStable"]');
    const internetRadios = document.querySelectorAll('input[name="internetAsDescribed"]');

    // Workspace display elements (for dynamic update if needed)
    const workspaceNameEl = document.getElementById('workspaceName');
    const workspaceLocationEl = document.getElementById('workspaceLocation');
    const bookingDateEl = document.getElementById('bookingDate');
    const bookingTimeEl = document.getElementById('bookingTime');

    // State
    let currentRating = 0;
    let isSubmitting = false;

    // ----------------------------------------------
    // Helper: get booking ID from URL or fallback
    // ----------------------------------------------

    function getBookingIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('bookingId');
        if (id && id.trim().length > 0) {
            return id.trim();
        }
        // Fallback to the ID used in the Postman collection example
        return CONFIG.FALLBACK_BOOKING_ID;
    }

    const bookingId = getBookingIdFromUrl();

    // ----------------------------------------------
    // Inject booking ID into the submit button for debugging
    // (visible in the DOM, but not displayed)
    // ----------------------------------------------

    submitBtn.dataset.bookingId = bookingId;

    // ----------------------------------------------
    // 1. Star Rating Logic
    // ----------------------------------------------

    function updateStars(rating) {
        stars.forEach((star, index) => {
            const value = parseInt(star.dataset.value, 10);
            if (value <= rating) {
                star.classList.add('active');
                // Use filled star icon
                star.className = 'ph-fill ph-star';
            } else {
                star.classList.remove('active');
                star.className = 'ph-fill ph-star';
                // We keep the same icon class, but color is controlled by CSS active class.
                // To ensure inactive stars are grey, we rely on CSS .star-rating i (inactive color)
                // and .star-rating i.active (yellow).
            }
        });
    }

    function setRating(rating) {
        currentRating = rating;
        updateStars(rating);

        // Update label based on rating
        const labels = {
            0: 'Tap a star to rate',
            1: 'Poor — needs improvement',
            2: 'Fair — some issues',
            3: 'Good — decent experience',
            4: 'Very Good — recommended',
            5: 'Excellent — top tier!'
        };
        ratingLabel.textContent = labels[rating] || labels[0];
    }

    // Event listeners for stars (click and hover)
    stars.forEach((star) => {
        // Click to set rating
        star.addEventListener('click', function(e) {
            const rating = parseInt(this.dataset.value, 10);
            setRating(rating);
        });

        // Hover to preview
        star.addEventListener('mouseenter', function(e) {
            const rating = parseInt(this.dataset.value, 10);
            previewStars(rating);
        });

        star.addEventListener('mouseleave', function(e) {
            // Revert to current rating
            updateStars(currentRating);
        });
    });

    // Preview stars on hover (temporary visual)
    function previewStars(rating) {
        stars.forEach((star, index) => {
            const value = parseInt(star.dataset.value, 10);
            if (value <= rating) {
                star.className = 'ph-fill ph-star';
                star.style.color = '#FFC107';
            } else {
                star.className = 'ph-fill ph-star';
                star.style.color = ''; // revert to CSS
            }
        });
    }

    // Reset hover styles when mouse leaves the container
    const starContainer = document.getElementById('starRating');
    starContainer.addEventListener('mouseleave', function() {
        stars.forEach(star => {
            star.style.color = '';
        });
        updateStars(currentRating);
    });

    // Initialize stars
    setRating(0);

    // ----------------------------------------------
    // 2. Trust Engine Validation (radio groups)
    // ----------------------------------------------

    function getSelectedRadioValue(name) {
        const radio = document.querySelector(`input[name="${name}"]:checked`);
        return radio ? radio.value === 'true' : null;
    }

    function areTrustQuestionsAnswered() {
        const power = getSelectedRadioValue('powerStable');
        const internet = getSelectedRadioValue('internetAsDescribed');
        return power !== null && internet !== null;
    }

    // ----------------------------------------------
    // 3. Form Submission
    // ----------------------------------------------

    async function submitReview() {
        // Prevent double submission
        if (isSubmitting) return;

        // Validate rating
        if (currentRating === 0) {
            ratingLabel.textContent = '⚠️ Please select a star rating.';
            ratingLabel.style.color = '#E74C3C';
            setTimeout(() => {
                ratingLabel.style.color = '';
                ratingLabel.textContent = 'Tap a star to rate';
            }, 3000);
            return;
        }

        // Validate trust engine questions
        if (!areTrustQuestionsAnswered()) {
            // Highlight missing answers by flashing the trust section
            const trustSection = document.querySelector('.trust-engine-section');
            trustSection.style.borderColor = '#E74C3C';
            trustSection.style.transition = 'border-color 0.2s';
            setTimeout(() => {
                trustSection.style.borderColor = '';
            }, 3000);
            // Scroll to trust section
            trustSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        // Prepare payload
        const powerStable = getSelectedRadioValue('powerStable');
        const internetAsDescribed = getSelectedRadioValue('internetAsDescribed');
        const comment = reviewText.value.trim();

        // Build review object per API spec (POST /api/bookings/:id/review)
        const payload = {
            overallRating: currentRating,
            powerReliabilityRating: powerStable ? 5 : 1, // Simplified mapping: true=5, false=1
            internetReliabilityRating: internetAsDescribed ? 5 : 1,
            powerStable: powerStable,
            internetAsDescribed: internetAsDescribed,
            comment: comment || '',
        };

        // For the PRD trust engine, we store the boolean flags.
        // The backend will compute reliability score from these.

        // Set submitting state
        isSubmitting = true;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph-bold ph-spinner"></i> Submitting...';

        try {
            // Get auth token from localStorage (or sessionStorage) — for demo, we use a placeholder.
            // In production, the token would be stored after login.
            const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');

            // If no token, attempt to use the hostToken or seekerToken from Postman collection.
            // For demo purposes, we'll prompt the user to set a token, or use a default.
            // In a real app, the user would be logged in, and the token would be present.
            let authToken = token;
            if (!authToken) {
                // For demo, we can use a hardcoded seeker token (from the API collection)
                // In practice, you'd redirect to login.
                console.warn('No access token found. Please log in to submit a review.');
                // Try to get from session storage if set by login flow
                authToken = sessionStorage.getItem('seekerToken') || '';
                if (!authToken) {
                    // Fallback: show an error and allow user to enter token manually (for testing)
                    const userToken = prompt('Please enter your access token (Seeker token) to submit review:');
                    if (userToken && userToken.trim().length > 0) {
                        authToken = userToken.trim();
                        sessionStorage.setItem('seekerToken', authToken);
                    } else {
                        throw new Error('Authentication required. Please log in.');
                    }
                }
            }

            const url = `${CONFIG.BASE_URL}${CONFIG.REVIEW_PATH}/${bookingId}/review`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle specific error codes
                if (response.status === 409) {
                    throw new Error('You have already submitted a review for this booking.');
                } else if (response.status === 403) {
                    throw new Error('You are not authorized to review this booking.');
                } else if (response.status === 404) {
                    throw new Error('Booking not found. Please check the booking ID.');
                } else {
                    throw new Error(data.message || `Server error (${response.status})`);
                }
            }

            // Success!
            handleSuccess(data);

        } catch (error) {
            console.error('Review submission error:', error);
            handleError(error.message);
        } finally {
            isSubmitting = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Submit Review <i class="ph-bold ph-paper-plane-right"></i>';
        }
    }

    // ----------------------------------------------
    // 4. Success & Error Handlers
    // ----------------------------------------------

    function handleSuccess(data) {
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.className = 'review-success-message';
        successMsg.innerHTML = `
            <div style="
                background: #10B981;
                color: white;
                padding: 16px 24px;
                border-radius: 12px;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 12px;
                font-weight: 500;
            ">
                <i class="ph-bold ph-check-circle" style="font-size: 24px;"></i>
                <span>✅ Review submitted successfully! Thank you for helping the community.</span>
            </div>
        `;

        const submitSection = document.querySelector('.submit-section');
        submitSection.parentNode.insertBefore(successMsg, submitSection);

        // Optionally update reliability score display if present
        if (data.data && data.data.reliability) {
            const reliability = data.data.reliability;
            // You could update a score badge if one exists on the page
            console.log('Reliability score updated:', reliability);
        }

        // Disable form fields to prevent resubmission
        submitBtn.disabled = true;
        submitBtn.innerHTML = '✅ Submitted';
        stars.forEach(star => star.style.cursor = 'default');
        reviewText.disabled = true;
        document.querySelectorAll('.option-label input[type="radio"]').forEach(r => r.disabled = true);

        // Scroll to success message
        successMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function handleError(message) {
        // Show error message
        const errorMsg = document.createElement('div');
        errorMsg.className = 'review-error-message';
        errorMsg.innerHTML = `
            <div style="
                background: #EF4444;
                color: white;
                padding: 14px 20px;
                border-radius: 12px;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 12px;
                font-weight: 500;
            ">
                <i class="ph-bold ph-warning" style="font-size: 24px;"></i>
                <span>❌ ${message}</span>
            </div>
        `;

        const submitSection = document.querySelector('.submit-section');
        // Remove any existing error messages
        const oldError = document.querySelector('.review-error-message');
        if (oldError) oldError.remove();
        submitSection.parentNode.insertBefore(errorMsg, submitSection);

        // Auto-scroll to error
        errorMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Auto-dismiss after 8 seconds
        setTimeout(() => {
            if (errorMsg.parentNode) {
                errorMsg.remove();
            }
        }, 8000);
    }

    // ----------------------------------------------
    // 5. Event Binding for Submit Button
    // ----------------------------------------------

    submitBtn.addEventListener('click', function(e) {
        e.preventDefault();
        submitReview();
    });

    // Allow Enter key to submit (if focus is not on textarea)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            // Ctrl+Enter to submit from textarea
            if (document.activeElement === reviewText) {
                e.preventDefault();
                submitReview();
            }
        }
    });

    // ----------------------------------------------
    // 6. Back Button Navigation
    // ----------------------------------------------

    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Go back to previous page or booking history
            if (document.referrer) {
                window.history.back();
            } else {
                // Fallback: navigate to my-bookings.html
                window.location.href = 'my-bookings.html';
            }
        });
    }

    // ----------------------------------------------
    // 7. Demo: Populate workspace summary from URL or mock
    // (In production, data would come from a booking detail API)
    // ----------------------------------------------

    function populateWorkspaceSummary() {
        // For demo, we use static data that matches the HTML.
        // In production, you'd fetch /api/bookings/:id to get workspace details.
        // We'll keep the existing HTML as-is.
        // Optionally, you can override with URL params.
        const params = new URLSearchParams(window.location.search);
        const name = params.get('workspace');
        if (name) {
            workspaceNameEl.textContent = decodeURIComponent(name);
        }
        const location = params.get('location');
        if (location) {
            workspaceLocationEl.innerHTML = `<i class="ph-bold ph-map-pin"></i> ${decodeURIComponent(location)}`;
        }
        const date = params.get('date');
        if (date) {
            bookingDateEl.textContent = decodeURIComponent(date);
        }
        const time = params.get('time');
        if (time) {
            bookingTimeEl.textContent = decodeURIComponent(time);
        }
    }

    populateWorkspaceSummary();

    // ----------------------------------------------
    // 8. Expose for debugging (optional)
    // ----------------------------------------------

    window.__spaceshare = {
        submitReview,
        setRating,
        currentRating: () => currentRating,
        bookingId,
        getPayload: () => ({
            overallRating: currentRating,
            powerStable: getSelectedRadioValue('powerStable'),
            internetAsDescribed: getSelectedRadioValue('internetAsDescribed'),
            comment: reviewText.value.trim(),
        })
    };

    console.log(`SpaceShare Submit Review ready. Booking ID: ${bookingId}`);

})();