/* ================================================================
   SPACESHARE — SIGNUP PAGE LOGIC (`signup.js`)
   Fully integrated with SpaceShare Backend API
   Redirects to OTP verification after successful registration
   ================================================================ */

// ================================================================
// CONFIGURATION
// ================================================================

/**
 * API Base URL - Automatically detects environment
 * - Localhost: uses local server (port 5000)
 * - Production: uses Render backend
 */
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://spaceshare-backend-cor9.onrender.com';

console.log('🔗 API Base URL:', API_BASE_URL);

const STORAGE_KEYS = {
    SELECTED_ROLE: 'spaceshare_selected_role', // ✅ Matches role-selection.js
    VERIFY_EMAIL: 'spaceshare:verifyEmail',
    USER_ROLE: 'spaceshare:userRole' // ✅ Store role for dashboard redirection
};

// ================================================================
// DOM REFERENCES
// ================================================================

const DOM = {
    // Forms & Cards
    signupForm: document.getElementById('signup-form'),
    verificationCard: document.getElementById('verification-pending-card'),
    signupFormContainer: document.getElementById('signup-form-container'),
    
    // Header & Indicators
    roleIndicator: document.getElementById('roleIndicator'),
    sentEmailDisplay: document.getElementById('sent-email-display'),
    formAlert: document.getElementById('form-alert'),

    // Input Fields
    fullNameInput: document.getElementById('fullName'),
    emailInput: document.getElementById('email'),
    phoneInput: document.getElementById('phone'),
    passwordInput: document.getElementById('password'),
    confirmPasswordInput: document.getElementById('confirmPassword'),

    // Password Toggles
    togglePassword: document.getElementById('togglePassword'),
    toggleConfirmPassword: document.getElementById('toggleConfirmPassword'),

    // Real-time Password Badges
    hintLength: document.getElementById('hintLength'),
    hintUppercase: document.getElementById('hintUppercase'),
    hintNumber: document.getElementById('hintNumber'),

    // Password Match Status Line
    passwordMatchMessage: document.getElementById('passwordMatchMessage'),

    // Buttons
    submitBtn: document.getElementById('submitBtn'),
    resendBtn: document.getElementById('resend-btn'),
    googleBtn: document.getElementById('googleBtn'),
    appleBtn: document.getElementById('appleBtn'),
    termsCheckbox: document.getElementById('terms')
};

// ================================================================
// STATE
// ================================================================

let resendTimer = null;
let countdownSeconds = 60;
let userEmailForVerification = '';
let isSubmitting = false;
let selectedRole = 'seeker'; // Default to seeker

// ================================================================
// UI HELPERS
// ================================================================

/**
 * Display alert message
 */
function showAlert(message, isSuccess = false) {
    if (!DOM.formAlert) return;
    DOM.formAlert.textContent = message;
    DOM.formAlert.hidden = false;
    DOM.formAlert.className = `form-alert ${isSuccess ? 'alert-success' : 'alert-error'}`;
}

/**
 * Hide alert
 */
function hideAlert() {
    if (!DOM.formAlert) return;
    DOM.formAlert.hidden = true;
    DOM.formAlert.textContent = '';
    DOM.formAlert.className = 'form-alert';
}

/**
 * Set loading state on submit button
 */
function setLoading(isLoading) {
    if (!DOM.submitBtn) return;
    
    DOM.submitBtn.disabled = isLoading;
    const label = DOM.submitBtn.querySelector('.btn-label') || DOM.submitBtn;
    const spinner = DOM.submitBtn.querySelector('.btn-spinner');

    if (isLoading) {
        label.dataset.originalText = label.textContent;
        label.textContent = 'Creating account...';
        if (spinner) spinner.hidden = false;
    } else {
        label.textContent = label.dataset.originalText || 'Create Account';
        if (spinner) spinner.hidden = true;
    }
}

/**
 * Format role name for display
 */
function formatRoleName(role) {
    switch (role?.toLowerCase()) {
        case 'host': return 'Host';
        case 'seeker': return 'Workspace Seeker';
        case 'corporate_admin': return 'Corporate Admin';
        case 'admin': return 'Platform Admin';
        default: return 'Workspace Seeker';
    }
}

/**
 * Get the dashboard URL based on user role
 */
function getDashboardUrl(role) {
    switch (role?.toLowerCase()) {
        case 'host':
            return 'host-dashboard.html';
        case 'corporate_admin':
            return 'corporate-dashboard.html';
        case 'admin':
            return 'admin-dashboard.html';
        case 'seeker':
        default:
            return 'seeker-dashboard.html';
    }
}

// ================================================================
// PASSWORD FUNCTIONS
// ================================================================

/**
 * Toggle password visibility (exposed globally for inline HTML)
 */
window.togglePasswordVisibility = function(inputId, iconId) {
    const inputEl = document.getElementById(inputId);
    const iconEl = document.getElementById(iconId);
    if (!inputEl) return;

    if (inputEl.type === 'password') {
        inputEl.type = 'text';
        if (iconEl) iconEl.className = 'ph ph-eye-slash';
    } else {
        inputEl.type = 'password';
        if (iconEl) iconEl.className = 'ph ph-eye';
    }
};

/**
 * Handle password input validation (exposed globally for inline HTML)
 */
window.handlePasswordInput = function(password) {
    const hasLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (DOM.hintLength) {
        DOM.hintLength.classList.toggle('valid', hasLength);
    }
    if (DOM.hintUppercase) {
        DOM.hintUppercase.classList.toggle('valid', hasUppercase);
    }
    if (DOM.hintNumber) {
        DOM.hintNumber.classList.toggle('valid', hasNumber);
    }

    window.handleConfirmPasswordInput();
};

/**
 * Handle confirm password validation (exposed globally for inline HTML)
 */
window.handleConfirmPasswordInput = function() {
    if (!DOM.passwordInput || !DOM.confirmPasswordInput || !DOM.passwordMatchMessage) return;

    const password = DOM.passwordInput.value;
    const confirmPassword = DOM.confirmPasswordInput.value;

    if (!confirmPassword) {
        DOM.passwordMatchMessage.textContent = '';
        DOM.passwordMatchMessage.className = 'match-indicator';
        return;
    }

    if (password === confirmPassword) {
        DOM.passwordMatchMessage.textContent = '✓ Passwords match';
        DOM.passwordMatchMessage.className = 'match-indicator match-success';
    } else {
        DOM.passwordMatchMessage.textContent = '✗ Passwords do not match';
        DOM.passwordMatchMessage.className = 'match-indicator match-error';
    }
};

/**
 * Validate password requirements
 */
function validatePasswordRequirements(password) {
    const hasLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (DOM.hintLength) {
        DOM.hintLength.classList.toggle('valid', hasLength);
    }
    if (DOM.hintUppercase) {
        DOM.hintUppercase.classList.toggle('valid', hasUppercase);
    }
    if (DOM.hintNumber) {
        DOM.hintNumber.classList.toggle('valid', hasNumber);
    }

    return hasLength && hasUppercase && hasNumber;
}

// ================================================================
// COUNTDOWN TIMER
// ================================================================

/**
 * Start 60-second resend cooldown
 */
function startResendCountdown() {
    if (!DOM.resendBtn) return;
    
    clearInterval(resendTimer);
    countdownSeconds = 60;
    DOM.resendBtn.disabled = true;

    const label = DOM.resendBtn.querySelector('.resend-label') || DOM.resendBtn;
    const timerDisplay = DOM.resendBtn.querySelector('#resend-timer');

    resendTimer = setInterval(() => {
        countdownSeconds--;
        
        if (timerDisplay) {
            timerDisplay.hidden = false;
            timerDisplay.textContent = `(${countdownSeconds}s)`;
        } else {
            label.textContent = `Resend Email (${countdownSeconds}s)`;
        }
        
        if (countdownSeconds <= 0) {
            clearInterval(resendTimer);
            DOM.resendBtn.disabled = false;
            label.textContent = 'Resend Verification Email';
            if (timerDisplay) timerDisplay.hidden = true;
        }
    }, 1000);
}

// ================================================================
// REDIRECT TO OTP PAGE
// ================================================================

/**
 * Redirect to OTP verification page
 * Stores the user's role so OTP page knows where to redirect after verification
 */
function redirectToOTP(email, role) {
    // Store email for OTP verification
    localStorage.setItem(STORAGE_KEYS.VERIFY_EMAIL, email);
    // Store role for dashboard redirection after OTP
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
    
    console.log('🔐 Redirecting to OTP verification for:', email);
    console.log('📌 Role:', role);
    
    // Redirect to OTP page
    window.location.href = 'otp.html';
}

// ================================================================
// API CALLS
// ================================================================

/**
 * Register a new user
 * POST /api/auth/register
 * This sends the OTP code via email
 */
async function registerUser(payload) {
    console.log('📤 Sending registration request to:', `${API_BASE_URL}/api/auth/register`);
    console.log('📦 Payload:', { ...payload, password: '***' });

    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('📥 Response status:', response.status);
    console.log('📥 Response data:', data);

    if (!response.ok) {
        throw new Error(data.message || `Registration failed (${response.status})`);
    }

    return data;
}

/**
 * Resend verification/OTP email
 * POST /api/auth/resend-otp
 */
async function resendOTPEmail(email) {
    console.log('📤 Sending resend OTP request to:', `${API_BASE_URL}/api/auth/resend-otp`);

    const response = await fetch(`${API_BASE_URL}/api/auth/resend-otp`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ email })
    });

    const data = await response.json();
    console.log('📥 Resend OTP response:', data);

    if (!response.ok) {
        throw new Error(data.message || `Failed to resend OTP (${response.status})`);
    }

    return data;
}

// ================================================================
// EVENT HANDLERS
// ================================================================

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) return;
    
    hideAlert();

    // Get form values
    const fullName = DOM.fullNameInput?.value.trim() || '';
    const email = DOM.emailInput?.value.trim() || '';
    const phone = DOM.phoneInput?.value.trim() || '';
    const password = DOM.passwordInput?.value || '';
    const confirmPassword = DOM.confirmPasswordInput?.value || '';
    const termsAccepted = DOM.termsCheckbox?.checked || false;

    // Get selected role from localStorage (set during role selection)
    selectedRole = localStorage.getItem(STORAGE_KEYS.SELECTED_ROLE) || 'seeker';

    // ================================================================
    // VALIDATION
    // ================================================================

    // Validate: Full Name
    if (!fullName || fullName.length < 2) {
        showAlert('Please enter your full name.');
        DOM.fullNameInput?.focus();
        return;
    }

    // Validate: Email or Phone
    if (!email && !phone) {
        showAlert('Please provide either an email address or phone number.');
        return;
    }

    // Validate: Email format
    if (email && !email.includes('@')) {
        showAlert('Please enter a valid email address.');
        DOM.emailInput?.focus();
        return;
    }

    // Validate: Phone format (basic)
    if (phone && !/^[0-9+\-\s()]{7,15}$/.test(phone)) {
        showAlert('Please enter a valid phone number.');
        DOM.phoneInput?.focus();
        return;
    }

    // Validate: Password
    if (!validatePasswordRequirements(password)) {
        showAlert('Password must have 8+ characters, 1 uppercase letter, and 1 number.');
        DOM.passwordInput?.focus();
        return;
    }

    // Validate: Password Match
    if (password !== confirmPassword) {
        showAlert('Passwords do not match.');
        DOM.confirmPasswordInput?.focus();
        return;
    }

    // Validate: Terms
    if (!termsAccepted) {
        showAlert('Please agree to the Terms of Service and Privacy Policy.');
        return;
    }

    // ================================================================
    // SUBMIT
    // ================================================================

    isSubmitting = true;
    setLoading(true);

    try {
        const payload = {
            full_name: fullName,
            email: email || undefined,
            phone: phone || undefined,
            password: password,
            role: selectedRole
        };

        const result = await registerUser(payload);
        
        // Save email for OTP verification
        userEmailForVerification = email;

        console.log('✅ Registration successful! Redirecting to OTP...');
        console.log('📌 User role:', selectedRole);

        // Show success message briefly before redirect
        showAlert('Account created! Sending verification code...', true);

        // Store role for dashboard redirection
        localStorage.setItem(STORAGE_KEYS.USER_ROLE, selectedRole);

        // Redirect to OTP page after a short delay
        setTimeout(() => {
            redirectToOTP(email, selectedRole);
        }, 1500);

    } catch (error) {
        console.error('❌ Registration error:', error);
        showAlert(error.message || 'Registration failed. Please try again.');
        isSubmitting = false;
        setLoading(false);
    }
}

/**
 * Handle resend verification - now sends OTP
 */
async function handleResendVerification() {
    if (!userEmailForVerification) {
        showAlert('No email address found. Please try registering again.');
        return;
    }
    
    hideAlert();

    try {
        await resendOTPEmail(userEmailForVerification);
        showAlert('New OTP code sent! Please check your email.', true);
        startResendCountdown();

    } catch (error) {
        console.error('❌ Resend error:', error);
        showAlert(error.message || 'Unable to resend OTP. Please try again later.');
    }
}

// ================================================================
// INITIALIZATION
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 SpaceShare Signup Page Loaded');
    console.log(`🌐 API URL: ${API_BASE_URL}`);
    console.log(`📦 Environment: ${window.location.hostname === 'localhost' ? 'Local Development' : 'Production'}`);

    // ================================================================
    // 1. Set role badge from localStorage
    // ================================================================
    const selectedRole = localStorage.getItem(STORAGE_KEYS.SELECTED_ROLE) || 'seeker';
    if (DOM.roleIndicator) {
        DOM.roleIndicator.textContent = formatRoleName(selectedRole);
    }

    // ================================================================
    // 2. Setup real-time password validation
    // ================================================================
    if (DOM.passwordInput) {
        DOM.passwordInput.addEventListener('input', (e) => {
            validatePasswordRequirements(e.target.value);
            window.handleConfirmPasswordInput();
        });
    }

    if (DOM.confirmPasswordInput) {
        DOM.confirmPasswordInput.addEventListener('input', () => {
            window.handleConfirmPasswordInput();
        });
    }

    // ================================================================
    // 3. Social login buttons (Coming soon)
    // ================================================================
    if (DOM.googleBtn) {
        DOM.googleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAlert('Sign up with Google is coming soon! 🚀');
        });
    }

    if (DOM.appleBtn) {
        DOM.appleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAlert('Sign up with Apple is coming soon! 🚀');
        });
    }

    // ================================================================
    // 4. Form submission
    // ================================================================
    if (DOM.signupForm) {
        DOM.signupForm.addEventListener('submit', handleFormSubmit);
    }

    // ================================================================
    // 5. Resend button - now sends OTP
    // ================================================================
    if (DOM.resendBtn) {
        DOM.resendBtn.addEventListener('click', handleResendVerification);
    }

    console.log('✅ Signup page initialized successfully');
});

// ================================================================
// EXPOSE FUNCTIONS FOR INLINE HTML
// ================================================================

window.togglePasswordVisibility = window.togglePasswordVisibility;
window.handlePasswordInput = window.handlePasswordInput;
window.handleConfirmPasswordInput = window.handleConfirmPasswordInput;

console.log('✅ signup.js loaded successfully');