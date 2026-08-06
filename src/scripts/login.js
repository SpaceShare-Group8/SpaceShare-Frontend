/* ==========================================================================
   SPACESHARE — SIGN IN PAGE LOGIC (login.js)
   Fully integrated with SpaceShare Backend API
   Handles dynamic environments, token storage, and error states.
   ========================================================================== */

(function() {
    'use strict';

    // ================================================================
    // 1. CONFIGURATION (Dynamic Environment Detection)
    // ================================================================
    
    // Automatically switches between localhost and production
    const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000'
        : 'https://spaceshare-backend-cor9.onrender.com';
    
    const LOGIN_ENDPOINT = `${API_BASE_URL}/api/auth/login`;
    
    // ================================================================
    // 2. DOM REFERENCES
    // ================================================================
    
    const DOM = {
        form: document.getElementById('signinForm'),
        email: document.getElementById('email'),
        password: document.getElementById('password'),
        emailError: document.getElementById('emailError'),
        passwordError: document.getElementById('passwordError'),
        submitBtn: document.getElementById('loginBtn'),
        togglePassword: document.querySelector('.toggle-visibility')
    };

    // ================================================================
    // 3. STATE MANAGEMENT
    // ================================================================
    
    let isSubmitting = false;

    // ================================================================
    // 4. UI HELPER FUNCTIONS
    // ================================================================

    /**
     * Clears all visible errors from the UI
     */
    function clearAllErrors() {
        DOM.emailError.textContent = '';
        DOM.emailError.classList.remove('visible');
        DOM.passwordError.textContent = '';
        DOM.passwordError.classList.remove('visible');
        DOM.email.closest('.field').classList.remove('has-error');
        DOM.password.closest('.field').classList.remove('has-error');
    }

    /**
     * Shows an inline error message under a specific input
     */
    function showFieldError(element, message) {
        const fieldWrapper = element.closest('.field');
        let errorElement;
        
        // Find the corresponding error container
        if (element.id === 'email') {
            errorElement = DOM.emailError;
        } else if (element.id === 'password') {
            errorElement = DOM.passwordError;
        }

        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('visible');
            fieldWrapper.classList.add('has-error');
        }
        
        // Focus the invalid field
        element.focus();
    }

    /**
     * Toggle the submit button loading state
     */
    function setLoading(isLoading) {
        isSubmitting = isLoading;
        DOM.submitBtn.disabled = isLoading;
        DOM.submitBtn.classList.toggle('is-loading', isLoading);
    }

    /**
     * Enable or disable the submit button based on form validity
     */
    function updateButtonState() {
        const emailValue = DOM.email.value.trim();
        const passwordValue = DOM.password.value.trim();
        const isValid = emailValue.length > 0 && passwordValue.length > 0;
        
        DOM.submitBtn.disabled = !isValid;
    }

    // ================================================================
    // 5. VALIDATION ENGINE
    // ================================================================

    /**
     * Validates the email format
     */
    function isValidEmail(email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    }

    /**
     * Validates the entire form before submission
     */
    function validateForm() {
        let isValid = true;
        const emailValue = DOM.email.value.trim();
        const passwordValue = DOM.password.value.trim();

        // Reset errors
        clearAllErrors();

        // Validate Email
        if (!emailValue) {
            showFieldError(DOM.email, 'Email address is required.');
            isValid = false;
        } else if (!isValidEmail(emailValue)) {
            showFieldError(DOM.email, 'Please enter a valid email address.');
            isValid = false;
        }

        // Validate Password
        if (!passwordValue) {
            showFieldError(DOM.password, 'Password is required.');
            isValid = false;
        }

        return isValid;
    }

    // ================================================================
    // 6. API INTERACTION
    // ================================================================

    /**
     * Sends the login request to the backend
     */
    async function submitLogin(email, password) {
        const response = await fetch(LOGIN_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        return { ok: response.ok, status: response.status, data };
    }

    /**
     * Handles the successful login response
     */
    function handleLoginSuccess(data) {
        // Extract tokens from backend response
        const accessToken = data.accessToken || data.access_token || data.token;
        const refreshToken = data.refreshToken || data.refresh_token;

        if (!accessToken) {
            throw new Error('Authentication failed: No access token received.');
        }

        // Store tokens securely in localStorage
        localStorage.setItem('access_token', accessToken);
        if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
        }

        // Store user data if available
        if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
        }

        console.log('✅ Login successful. Tokens stored.');
    }

    // ================================================================
    // 7. FORM SUBMISSION HANDLER
    // ================================================================

    async function handleSubmit(event) {
        event.preventDefault();
        
        // Prevent double submission
        if (isSubmitting) return;

        // Run client-side validation
        if (!validateForm()) return;

        // Start loading state
        setLoading(true);

        const email = DOM.email.value.trim();
        const password = DOM.password.value.trim();

        try {
            // Call the backend
            const result = await submitLogin(email, password);

            if (!result.ok) {
                // Handle specific HTTP errors
                let message = result.data.message || 'Invalid email or password.';
                
                // Map specific backend error codes to user-friendly messages
                if (result.status === 400) {
                    message = 'Please check your email and password.';
                } else if (result.status === 401) {
                    message = 'Invalid credentials. Please try again.';
                } else if (result.status === 403) {
                    message = 'Your account is not verified. Please check your email for the OTP.';
                } else if (result.status === 404) {
                    message = 'Account not found. Please sign up first.';
                } else if (result.status >= 500) {
                    message = 'Server error. Please try again later.';
                }

                // Show error on the password field (common UX pattern)
                showFieldError(DOM.password, message);
                setLoading(false);
                return;
            }

            // Success!
            handleLoginSuccess(result.data);
            
            // Redirect to the dashboard/home page
            window.location.href = 'seeker-dashboard.html';

        } catch (error) {
            // Handle network errors (offline, DNS failure, etc.)
            console.error('❌ Login error:', error);
            
            let message = 'Unable to connect to the server. Please check your internet connection.';
            
            // Specific network error handling
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                message = 'Network error. Please check your connection and try again.';
            }

            showFieldError(DOM.password, message);
            setLoading(false);
        }
    }

    // ================================================================
    // 8. EVENT LISTENERS
    // ================================================================

    // Form submission
    DOM.form.addEventListener('submit', handleSubmit);

    // Real-time button enable/disable and error clearing
    function handleInputChange() {
        clearAllErrors();
        updateButtonState();
    }

    DOM.email.addEventListener('input', handleInputChange);
    DOM.password.addEventListener('input', handleInputChange);

    // Password toggle visibility
    if (DOM.togglePassword) {
        DOM.togglePassword.addEventListener('click', function() {
            const input = document.getElementById(this.getAttribute('data-target'));
            if (!input) return;
            
            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            
            // Toggle icons
            const eyeIcon = this.querySelector('.icon-eye');
            const eyeOffIcon = this.querySelector('.icon-eye-off');
            
            if (eyeIcon && eyeOffIcon) {
                eyeIcon.style.display = isHidden ? 'none' : 'block';
                eyeOffIcon.style.display = isHidden ? 'block' : 'none';
            }
            
            // Accessibility
            this.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
            this.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
        });
    }

    // ================================================================
    // 9. INITIALIZATION
    // ================================================================

    document.addEventListener('DOMContentLoaded', () => {
        console.log('🚀 Login Page Initialized');
        console.log(`🌐 API Endpoint: ${LOGIN_ENDPOINT}`);
        
        // Auto-focus email field on load for better UX
        DOM.email.focus();

        // Ensure button starts disabled
        DOM.submitBtn.disabled = true;
    });

})();