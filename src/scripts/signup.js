/* ================================================================
   SPACESHARE — SIGNUP PAGE LOGIC
   Full API Integration with Live Backend
   Backend: https://spaceshare-backend-cor9.onrender.com
   Endpoint: POST /api/auth/register
   ================================================================ */

// ================================================================
// CONFIGURATION
// ================================================================

const API_BASE_URL = 'https://spaceshare-backend-cor9.onrender.com';
const STORAGE_KEYS = {
    ACCESS_TOKEN: 'spaceshare_access_token',
    REFRESH_TOKEN: 'spaceshare_refresh_token',
    USER: 'spaceshare_user',
    SELECTED_ROLE: 'spaceshare:selectedRole'
};

// ================================================================
// DOM REFS
// ================================================================

const DOM = {
    form: document.getElementById('signupForm'),
    fullName: document.getElementById('full_name'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone'),
    password: document.getElementById('password'),
    confirmPassword: document.getElementById('confirm_password'),
    terms: document.getElementById('terms'),
    submitBtn: document.getElementById('submitBtn'),
    formAlert: document.getElementById('formAlert'),
    togglePassword: document.getElementById('togglePassword'),
    googleBtn: document.getElementById('googleBtn'),
    appleBtn: document.getElementById('appleBtn'),
    // Password hint elements
    hintLength: document.getElementById('hintLength'),
    hintUppercase: document.getElementById('hintUppercase'),
    hintNumber: document.getElementById('hintNumber'),
};

// ================================================================
// API FUNCTIONS
// ================================================================

/**
 * Register a new user
 * POST /api/auth/register
 * 
 * @param {Object} payload - Registration data
 * @param {string} payload.full_name - User's full name (3-150 chars)
 * @param {string} [payload.email] - User's email (optional if phone provided)
 * @param {string} [payload.phone] - User's phone (optional if email provided)
 * @param {string} payload.password - Password (min 8 chars)
 * @param {string} [payload.role] - User role: "seeker" | "host" | "corporate_admin"
 * @returns {Promise<Object>} API response
 */
async function registerUser(payload) {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        // Handle validation errors from backend
        if (data.errors && Array.isArray(data.errors)) {
            const errorMessages = data.errors.map(err => err.message || err).join('. ');
            throw new Error(errorMessages || data.message || 'Registration failed');
        }
        throw new Error(data.message || `Registration failed (${response.status})`);
    }

    return data;
}

/**
 * Login after successful registration
 * POST /api/auth/login
 * 
 * @param {Object} payload - Login credentials
 * @param {string} [payload.email] - User's email
 * @param {string} [payload.phone] - User's phone
 * @param {string} payload.password - User's password
 * @returns {Promise<Object>} API response with tokens
 */
async function loginUser(payload) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || `Login failed (${response.status})`);
    }

    return data;
}

// ================================================================
// AUTH HELPERS
// ================================================================

/**
 * Extract authentication data from response
 * Supports multiple response formats from backend
 */
function extractAuthData(response) {
    const accessToken = 
        response.accessToken ??
        response.token ??
        response.data?.accessToken ??
        response.data?.token ??
        response.data?.tokens?.accessToken ??
        null;

    const refreshToken = 
        response.refreshToken ??
        response.data?.refreshToken ??
        response.data?.tokens?.refreshToken ??
        null;

    const user = 
        response.user ??
        response.data?.user ??
        response.data ??
        null;

    return { accessToken, refreshToken, user };
}

/**
 * Store session data in localStorage
 */
function storeSession({ accessToken, refreshToken, user }) {
    if (accessToken) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    }
    if (refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
    if (user) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }
}

/**
 * Save selected role for later use
 */
function saveSelectedRole(role) {
    if (!['seeker', 'host', 'corporate_admin'].includes(role)) {
        throw new Error(`Invalid role: ${role}`);
    }
    localStorage.setItem(STORAGE_KEYS.SELECTED_ROLE, role);
}

// ================================================================
// UI HELPERS
// ================================================================

/**
 * Set field error message
 */
function setFieldError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const errorEl = document.getElementById(`${fieldId}Error`);
    const wrapper = input?.closest('.input-wrapper');
    
    if (input) {
        input.setAttribute('aria-invalid', message ? 'true' : 'false');
    }
    
    if (wrapper) {
        wrapper.classList.toggle('has-error', !!message);
    }
    
    if (errorEl) {
        errorEl.textContent = message || '';
        errorEl.style.display = message ? 'block' : 'none';
    }
}

/**
 * Clear all form errors
 */
function clearErrors() {
    ['full_name', 'email', 'phone', 'password', 'confirm_password', 'terms'].forEach((id) => {
        setFieldError(id, '');
    });
    hideFormAlert();
}

/**
 * Show form alert message
 */
function showFormAlert(message, isSuccess = false) {
    DOM.formAlert.textContent = message;
    DOM.formAlert.hidden = false;
    DOM.formAlert.className = isSuccess ? 'alert-success' : 'alert-error';
}

/**
 * Hide form alert
 */
function hideFormAlert() {
    DOM.formAlert.hidden = true;
    DOM.formAlert.textContent = '';
    DOM.formAlert.className = '';
}

/**
 * Set loading state on submit button
 */
function setLoading(isLoading) {
    DOM.submitBtn.disabled = isLoading;
    DOM.submitBtn.dataset.loading = String(isLoading);
    
    const label = DOM.submitBtn.querySelector('.btn-label');
    const spinner = DOM.submitBtn.querySelector('.btn-spinner');
    
    if (label) {
        label.textContent = isLoading ? 'Creating account...' : 'Create Account';
    }
    
    if (spinner) {
        spinner.hidden = !isLoading;
    }
    
    DOM.submitBtn.style.opacity = isLoading ? '0.7' : '1';
}

/**
 * Validate email format
 */
function looksLikeEmail(value) {
    return /\S+@\S+\.\S+/.test(value);
}

/**
 * Validate Nigerian phone number
 * Formats: 08012345678, +2348012345678, 2348012345678
 */
function isValidPhone(value) {
    const cleaned = value.replace(/\s/g, '');
    return /^(\+?234|0)[789][01]\d{8}$/.test(cleaned);
}

// ================================================================
// PASSWORD STRENGTH INDICATORS
// ================================================================

/**
 * Update password strength indicators
 */
function updatePasswordStrength(password) {
    const hasLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    // Update hint dots
    if (DOM.hintLength) {
        DOM.hintLength.classList.toggle('is-valid', hasLength);
    }
    if (DOM.hintUppercase) {
        DOM.hintUppercase.classList.toggle('is-valid', hasUppercase);
    }
    if (DOM.hintNumber) {
        DOM.hintNumber.classList.toggle('is-valid', hasNumber);
    }

    return { hasLength, hasUppercase, hasNumber };
}

// ================================================================
// REAL-TIME VALIDATION
// ================================================================

/**
 * Validate email on blur
 */
DOM.email.addEventListener('blur', () => {
    const email = DOM.email.value.trim();
    if (email && !looksLikeEmail(email)) {
        setFieldError('email', 'Enter a valid email address.');
    } else {
        setFieldError('email', '');
    }
});

/**
 * Validate phone on blur
 */
DOM.phone.addEventListener('blur', () => {
    const phone = DOM.phone.value.trim();
    if (phone && !isValidPhone(phone)) {
        setFieldError('phone', 'Enter a valid Nigerian phone number (e.g., 08012345678).');
    } else {
        setFieldError('phone', '');
    }
});

/**
 * Validate password on input (real-time)
 */
DOM.password.addEventListener('input', () => {
    const password = DOM.password.value;
    updatePasswordStrength(password);
    
    if (password && password.length < 8) {
        setFieldError('password', 'Password must be at least 8 characters.');
    } else {
        setFieldError('password', '');
    }
});

DOM.password.addEventListener('blur', () => {
    const password = DOM.password.value;
    if (password && password.length < 8) {
        setFieldError('password', 'Password must be at least 8 characters.');
    } else {
        setFieldError('password', '');
    }
});

/**
 * Validate confirm password on input
 */
DOM.confirmPassword.addEventListener('input', () => {
    const password = DOM.password.value;
    const confirm = DOM.confirmPassword.value;
    if (confirm && confirm !== password) {
        setFieldError('confirm_password', "Passwords don't match.");
    } else {
        setFieldError('confirm_password', '');
    }
});

// ================================================================
// PASSWORD VISIBILITY TOGGLE
// ================================================================

DOM.togglePassword.addEventListener('click', () => {
    const isHidden = DOM.password.type === 'password';
    DOM.password.type = isHidden ? 'text' : 'password';
    DOM.togglePassword.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    
    const icon = DOM.togglePassword.querySelector('i');
    if (icon) {
        icon.className = isHidden ? 'ph-fill ph-eye-slash' : 'ph-fill ph-eye';
    }
});

// ================================================================
// SOCIAL BUTTONS (Placeholder)
// ================================================================

DOM.googleBtn.addEventListener('click', () => {
    showFormAlert('Google sign-in coming soon! 🚀', false);
});

DOM.appleBtn.addEventListener('click', () => {
    showFormAlert('Apple sign-in coming soon! 🚀', false);
});

// ================================================================
// FORM SUBMISSION
// ================================================================

DOM.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors();

    // --- Get Values ---
    const fullName = DOM.fullName.value.trim();
    const email = DOM.email.value.trim();
    const phone = DOM.phone.value.trim();
    const password = DOM.password.value;
    const confirmPassword = DOM.confirmPassword.value;
    const termsChecked = DOM.terms.checked;
    const role = 'seeker'; // Default role, can be changed by role selection later

    // --- Validation ---
    let hasError = false;

    // Full name validation
    if (!fullName) {
        setFieldError('full_name', 'Enter your full name.');
        hasError = true;
    } else if (fullName.length < 3) {
        setFieldError('full_name', 'Name must be at least 3 characters.');
        hasError = true;
    } else if (fullName.length > 150) {
        setFieldError('full_name', 'Name must be less than 150 characters.');
        hasError = true;
    }

    // Email or phone validation (at least one required)
    if (!email && !phone) {
        setFieldError('email', 'Enter an email or a phone number.');
        hasError = true;
    } else if (email && !looksLikeEmail(email)) {
        setFieldError('email', 'Enter a valid email address.');
        hasError = true;
    } else if (phone && !isValidPhone(phone)) {
        setFieldError('phone', 'Enter a valid Nigerian phone number.');
        hasError = true;
    }

    // Password validation
    if (!password) {
        setFieldError('password', 'Create a password.');
        hasError = true;
    } else if (password.length < 8) {
        setFieldError('password', 'Password must be at least 8 characters.');
        hasError = true;
    }

    // Confirm password validation
    if (confirmPassword !== password) {
        setFieldError('confirm_password', "Passwords don't match.");
        hasError = true;
    }

    // Terms validation
    if (!termsChecked) {
        setFieldError('terms', 'You need to accept the terms to continue.');
        hasError = true;
    }

    if (hasError) {
        // Scroll to first error
        const firstError = document.querySelector('[aria-invalid="true"]');
        if (firstError) {
            firstError.focus();
            firstError.closest('.form-group')?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
        return;
    }

    // --- Build Payload ---
    const payload = {
        full_name: fullName,
        password: password,
        role: role
    };

    if (email) payload.email = email;
    if (phone) payload.phone = phone;

    console.log('📝 Registration payload:', { ...payload, password: '***' });
    console.log(`🔗 API Endpoint: ${API_BASE_URL}/api/auth/register`);

    // --- Submit ---
    setLoading(true);
    hideFormAlert();

    try {
        // Step 1: Register the user
        const registerResponse = await registerUser(payload);
        console.log('✅ Registration successful:', registerResponse);

        // Step 2: Save role for role selection screen
        try {
            saveSelectedRole(role);
            console.log(`💾 Role saved: ${role}`);
        } catch (roleError) {
            console.warn('Role save warning:', roleError);
        }

        // Step 3: Check if we got tokens back (auto-login)
        const authData = extractAuthData(registerResponse);

        if (authData.accessToken) {
            // Auto-login successful
            storeSession(authData);
            showFormAlert('Account created successfully! 🎉', true);
            
            // Redirect to role selection (per PRD flow)
            setTimeout(() => {
                window.location.href = 'role_main_selection.html';
            }, 1500);
            return;
        }

        // Step 4: Try auto-login with email/phone
        const loginIdentifier = email || phone;
        if (loginIdentifier) {
            try {
                console.log('🔄 Attempting auto-login...');
                const loginResponse = await loginUser({
                    [email ? 'email' : 'phone']: loginIdentifier,
                    password: password
                });

                const loginAuthData = extractAuthData(loginResponse);
                if (loginAuthData.accessToken) {
                    storeSession(loginAuthData);
                    showFormAlert('Account created and logged in! 🎉', true);
                    
                    setTimeout(() => {
                        window.location.href = 'role_main_selection.html';
                    }, 1500);
                    return;
                }
            } catch (loginError) {
                console.warn('Auto-login failed, proceeding to role selection:', loginError);
            }
        }

        // Step 5: Redirect to role selection (per PRD flow)
        showFormAlert('Account created! Choose your role to continue. ✅', true);
        setTimeout(() => {
            window.location.href = 'role_main_selection.html';
        }, 2000);

    } catch (error) {
        console.error('❌ Registration error:', error);
        
        // Handle specific error messages
        let errorMessage = error.message || 'Something went wrong. Please try again.';
        
        // Check for duplicate email/phone
        if (errorMessage.toLowerCase().includes('email') && 
            (errorMessage.toLowerCase().includes('exist') || errorMessage.toLowerCase().includes('already'))) {
            errorMessage = 'This email is already registered. Please use a different email or login.';
        } else if (errorMessage.toLowerCase().includes('phone') && 
                   (errorMessage.toLowerCase().includes('exist') || errorMessage.toLowerCase().includes('already'))) {
            errorMessage = 'This phone number is already registered. Please use a different number or login.';
        } else if (errorMessage.toLowerCase().includes('validation')) {
            errorMessage = 'Please check your information and try again.';
        } else if (errorMessage.toLowerCase().includes('network')) {
            errorMessage = 'Network error. Please check your connection and try again.';
        }
        
        showFormAlert(errorMessage);
    } finally {
        // Only reset if not already redirecting
        if (!DOM.submitBtn.disabled) {
            setLoading(false);
        }
    }
});

// ================================================================
// KEYBOARD SHORTCUTS
// ================================================================

// Enter key on terms checkbox triggers form submission
DOM.terms.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        DOM.form.dispatchEvent(new Event('submit'));
    }
});

// ================================================================
// URL PARAMETER HANDLING
// ================================================================

/**
 * Pre-fill fields from URL parameters
 */
function handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    const emailParam = urlParams.get('email');
    if (emailParam) {
        DOM.email.value = emailParam;
    }
    
    const roleParam = urlParams.get('role');
    if (roleParam && ['seeker', 'host', 'corporate_admin'].includes(roleParam)) {
        try {
            saveSelectedRole(roleParam);
        } catch (e) {
            // Ignore
        }
    }
}

// ================================================================
// INITIALIZATION
// ================================================================

/**
 * Initialize the signup page
 */
function init() {
    console.log('🚀 SpaceShare — Sign Up page initializing...');
    console.log(`📍 API Base URL: ${API_BASE_URL}`);
    console.log('📋 Endpoint: POST /api/auth/register');

    // Handle URL parameters
    handleUrlParams();

    // Update password strength on initial load (if password has value)
    if (DOM.password.value) {
        updatePasswordStrength(DOM.password.value);
    }

    // Log for debugging
    console.log('✅ Sign Up page ready');
    console.log('🔑 Role: seeker (default, can be changed in role selection)');
}

// Run initialization when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// ================================================================
// EXPOSE FOR TESTING (Development Only)
// ================================================================

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.__signup = {
        API_BASE_URL,
        registerUser,
        loginUser,
        saveSelectedRole,
        getSelectedRole: () => localStorage.getItem(STORAGE_KEYS.SELECTED_ROLE),
        DOM: {
            form: DOM.form,
            fullName: DOM.fullName,
            email: DOM.email,
            phone: DOM.phone,
            password: DOM.password,
            confirmPassword: DOM.confirmPassword,
        },
        getPayload: () => ({
            full_name: DOM.fullName.value.trim(),
            email: DOM.email.value.trim(),
            phone: DOM.phone.value.trim(),
            password: DOM.password.value,
            role: 'seeker'
        }),
        validateForm: () => {
            const errors = [];
            if (!DOM.fullName.value.trim()) errors.push('Full name required');
            if (!DOM.email.value.trim() && !DOM.phone.value.trim()) errors.push('Email or phone required');
            if (DOM.password.value.length < 8) errors.push('Password must be 8+ chars');
            if (DOM.confirmPassword.value !== DOM.password.value) errors.push('Passwords do not match');
            return errors;
        }
    };
    console.log('💻 Debug: window.__signup available for testing');
}