/* ================================================================
   SPACESHARE — VERIFY EMAIL PAGE LOGIC
   Full API Integration with Live Backend
   Backend: https://spaceshare-backend-cor9.onrender.com
   ================================================================
   
   NOTE: The backend verification endpoint may need to be confirmed.
   This code is built with flexibility to work with:
   - POST /api/auth/verify-email
   - POST /api/auth/verify
   - POST /api/verify
   - Or a custom endpoint provided by the backend team
   
   The code includes a configurable VERIFY_ENDPOINT that can be
   updated once the exact endpoint is confirmed.
   ================================================================ */

// ================================================================
// CONFIGURATION
// ================================================================

const API_BASE_URL = 'https://spaceshare-backend-cor9.onrender.com';

// ⚠️ IMPORTANT: Update this endpoint when backend verification is ready
// Backend team: Please confirm the exact verification endpoint
const VERIFY_ENDPOINT = '/api/auth/verify-email'; // Placeholder - update as needed
const RESEND_ENDPOINT = '/api/auth/resend-verification'; // Placeholder - update as needed

const STORAGE_KEYS = {
    ACCESS_TOKEN: 'spaceshare_access_token',
    REFRESH_TOKEN: 'spaceshare_refresh_token',
    USER: 'spaceshare_user',
    VERIFY_EMAIL: 'spaceshare_verify_email'
};

// ================================================================
// DOM REFS
// ================================================================

const DOM = {
    form: document.getElementById('verifyForm'),
    codeInput: document.getElementById('codeInput'),
    pasteBtn: document.getElementById('pasteBtn'),
    verifyBtn: document.getElementById('verifyBtn'),
    formAlert: document.getElementById('formAlert'),
    resendBtn: document.getElementById('resendBtn'),
    resendText: document.getElementById('resendText'),
    resendTimer: document.getElementById('resendTimer'),
    timerCount: document.getElementById('timerCount'),
    codeError: document.getElementById('codeError'),
};

// ================================================================
// STATE
// ================================================================

let state = {
    email: '',
    resendCooldown: 60,
    isResending: false,
    isVerifying: false,
    timerInterval: null,
};

// ================================================================
// API FUNCTIONS
// ================================================================

/**
 * Verify the email with the provided code
 * POST /api/auth/verify-email (or custom endpoint)
 * 
 * @param {string} code - 6-digit verification code
 * @param {string} email - User's email address
 * @returns {Promise<Object>} API response
 */
async function verifyEmail(code, email) {
    const response = await fetch(`${API_BASE_URL}${VERIFY_ENDPOINT}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            code: code,
            email: email
        })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        // Handle validation errors from backend
        if (data.errors && Array.isArray(data.errors)) {
            const errorMessages = data.errors.map(err => err.message || err).join('. ');
            throw new Error(errorMessages || data.message || 'Verification failed');
        }
        throw new Error(data.message || `Verification failed (${response.status})`);
    }

    return data;
}

/**
 * Resend verification code
 * POST /api/auth/resend-verification (or custom endpoint)
 * 
 * @param {string} email - User's email address
 * @returns {Promise<Object>} API response
 */
async function resendVerification(email) {
    const response = await fetch(`${API_BASE_URL}${RESEND_ENDPOINT}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            email: email
        })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        if (data.errors && Array.isArray(data.errors)) {
            const errorMessages = data.errors.map(err => err.message || err).join('. ');
            throw new Error(errorMessages || data.message || 'Failed to resend code');
        }
        throw new Error(data.message || `Failed to resend code (${response.status})`);
    }

    return data;
}

/**
 * Get current user from token
 * GET /api/auth/me
 */
async function getCurrentUser() {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) return null;

    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        return null;
    }

    return data.data || data.user || null;
}

// ================================================================
// AUTH HELPERS
// ================================================================

/**
 * Extract authentication data from response
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
 * Store session data
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
 * Get email from storage or URL
 */
function getEmail() {
    // Check if we have it in state
    if (state.email) return state.email;
    
    // Check localStorage
    const stored = localStorage.getItem(STORAGE_KEYS.VERIFY_EMAIL);
    if (stored) {
        state.email = stored;
        return stored;
    }
    
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    if (emailParam) {
        state.email = emailParam;
        localStorage.setItem(STORAGE_KEYS.VERIFY_EMAIL, emailParam);
        return emailParam;
    }
    
    // Check user object
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.email) {
                state.email = user.email;
                localStorage.setItem(STORAGE_KEYS.VERIFY_EMAIL, user.email);
                return user.email;
            }
        } catch (e) {
            // Ignore
        }
    }
    
    return null;
}

// ================================================================
// UI HELPERS
// ================================================================

/**
 * Set field error message
 */
function setFieldError(fieldId, message) {
    const errorEl = document.getElementById(`${fieldId}Error`);
    const wrapper = DOM.codeInput.closest('.code-input-container');
    
    if (wrapper) {
        wrapper.classList.toggle('has-error', !!message);
    }
    
    if (errorEl) {
        errorEl.textContent = message || '';
        errorEl.style.display = message ? 'block' : 'none';
    }
}

/**
 * Show form alert message
 */
function showFormAlert(message, isSuccess = false) {
    DOM.formAlert.textContent = message;
    DOM.formAlert.hidden = false;
    DOM.formAlert.className = isSuccess ? 'alert-success' : 'alert-error';
    
    // Auto-hide after 5 seconds for success
    if (isSuccess) {
        setTimeout(() => {
            hideFormAlert();
        }, 5000);
    }
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
 * Set loading state on verify button
 */
function setLoading(isLoading) {
    state.isVerifying = isLoading;
    DOM.verifyBtn.disabled = isLoading;
    
    const label = DOM.verifyBtn.querySelector('.btn-label');
    const spinner = DOM.verifyBtn.querySelector('.btn-spinner');
    
    if (label) {
        label.textContent = isLoading ? 'Verifying...' : 'Verify';
    }
    
    if (spinner) {
        spinner.hidden = !isLoading;
    }
    
    DOM.verifyBtn.style.opacity = isLoading ? '0.7' : '1';
}

/**
 * Set resend button state
 */
function setResendState(isLoading) {
    state.isResending = isLoading;
    DOM.resendBtn.disabled = isLoading;
    
    if (isLoading) {
        DOM.resendBtn.textContent = 'Sending...';
    } else {
        DOM.resendBtn.textContent = 'Resend';
    }
}

/**
 * Validate code format (6 digits)
 */
function isValidCode(code) {
    return /^[0-9]{6}$/.test(code);
}

/**
 * Format code for display (add spaces every 2 digits)
 */
function formatCodeForDisplay(code) {
    return code.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

// ================================================================
// CODE INPUT HANDLING
// ================================================================

/**
 * Auto-advance code input (if using individual digit inputs)
 * For single input, just validate and auto-submit
 */
function handleCodeInput(e) {
    const value = DOM.codeInput.value.replace(/\D/g, '');
    DOM.codeInput.value = value.slice(0, 6);
    
    // Clear error on input
    setFieldError('code', '');
    hideFormAlert();
    
    // Auto-submit when 6 digits entered
    if (value.length === 6) {
        setTimeout(() => {
            DOM.form.dispatchEvent(new Event('submit'));
        }, 300);
    }
}

/**
 * Handle paste from clipboard
 */
async function handlePaste() {
    try {
        const text = await navigator.clipboard.readText();
        const digits = text.replace(/\D/g, '');
        if (digits.length >= 6) {
            DOM.codeInput.value = digits.slice(0, 6);
            // Trigger input event to auto-submit
            DOM.codeInput.dispatchEvent(new Event('input'));
            showFormAlert('Code pasted successfully!', true);
        } else {
            showFormAlert('Invalid code format. Please paste a 6-digit code.', false);
        }
    } catch (error) {
        console.warn('Clipboard read failed:', error);
        showFormAlert('Unable to access clipboard. Please enter the code manually.', false);
    }
}

// ================================================================
// RESEND TIMER
// ================================================================

/**
 * Start resend cooldown timer
 */
function startResendTimer(seconds = 60) {
    state.resendCooldown = seconds;
    DOM.resendText.hidden = true;
    DOM.resendTimer.hidden = false;
    DOM.resendBtn.disabled = true;
    
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
    }
    
    state.timerInterval = setInterval(() => {
        state.resendCooldown -= 1;
        if (DOM.timerCount) {
            DOM.timerCount.textContent = state.resendCooldown;
        }
        
        if (state.resendCooldown <= 0) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
            DOM.resendText.hidden = false;
            DOM.resendTimer.hidden = true;
            DOM.resendBtn.disabled = false;
        }
    }, 1000);
}

/**
 * Reset timer (called on successful resend)
 */
function resetResendTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
    startResendTimer(60);
}

// ================================================================
// RESEND FUNCTION
// ================================================================

/**
 * Handle resend verification code
 */
async function handleResend() {
    if (state.isResending || DOM.resendBtn.disabled) return;
    
    const email = getEmail();
    if (!email) {
        showFormAlert('Email address not found. Please try signing up again.', false);
        return;
    }
    
    setResendState(true);
    hideFormAlert();
    
    try {
        console.log(`🔄 Resending verification code to: ${email}`);
        
        const response = await resendVerification(email);
        console.log('✅ Resend successful:', response);
        
        showFormAlert('New verification code sent! Please check your email. 📧', true);
        resetResendTimer();
        
    } catch (error) {
        console.error('❌ Resend error:', error);
        
        let errorMessage = error.message || 'Failed to resend code. Please try again.';
        
        if (errorMessage.toLowerCase().includes('ratelimit') || errorMessage.toLowerCase().includes('too many')) {
            errorMessage = 'Too many attempts. Please wait a moment before trying again.';
        }
        
        showFormAlert(errorMessage, false);
        
        // Enable resend button if it wasn't a cooldown issue
        if (!errorMessage.includes('wait')) {
            DOM.resendBtn.disabled = false;
        }
    } finally {
        setResendState(false);
    }
}

// ================================================================
// FORM SUBMISSION
// ================================================================

DOM.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    // Prevent double submission
    if (state.isVerifying) return;
    
    const code = DOM.codeInput.value.trim();
    const email = getEmail();
    
    // --- Validation ---
    let hasError = false;
    
    if (!code) {
        setFieldError('code', 'Please enter your verification code.');
        hasError = true;
    } else if (!isValidCode(code)) {
        setFieldError('code', 'Please enter a valid 6-digit code.');
        hasError = true;
    }
    
    if (!email) {
        showFormAlert('Email address not found. Please try signing up again.', false);
        hasError = true;
    }
    
    if (hasError) {
        // Shake the input on error
        const container = DOM.codeInput.closest('.code-input-container');
        if (container) {
            container.classList.add('shake');
            setTimeout(() => {
                container.classList.remove('shake');
            }, 500);
        }
        DOM.codeInput.focus();
        return;
    }
    
    // --- Submit Verification ---
    setLoading(true);
    hideFormAlert();
    
    try {
        console.log(`🔐 Verifying code: ${code} for email: ${email}`);
        console.log(`🔗 API Endpoint: ${API_BASE_URL}${VERIFY_ENDPOINT}`);
        
        const response = await verifyEmail(code, email);
        console.log('✅ Verification successful:', response);
        
        // Extract auth data (if tokens returned)
        const authData = extractAuthData(response);
        
        if (authData.accessToken) {
            // Store session
            storeSession(authData);
            
            // Get full user profile
            try {
                const user = await getCurrentUser();
                if (user) {
                    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
                }
            } catch (e) {
                console.warn('Could not fetch user profile:', e);
            }
        }
        
        // Show success
        showFormAlert('✅ Email verified successfully! Redirecting...', true);
        DOM.codeInput.classList.add('pulse-success');
        
        // Update button
        const label = DOM.verifyBtn.querySelector('.btn-label');
        if (label) label.textContent = '✓ Verified!';
        DOM.verifyBtn.style.background = 'var(--success)';
        
        // Clean up email from storage
        localStorage.removeItem(STORAGE_KEYS.VERIFY_EMAIL);
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'seeker-dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('❌ Verification error:', error);
        
        let errorMessage = error.message || 'Verification failed. Please try again.';
        
        if (errorMessage.toLowerCase().includes('expired')) {
            errorMessage = 'This code has expired. Please request a new one.';
        } else if (errorMessage.toLowerCase().includes('invalid')) {
            errorMessage = 'Invalid code. Please check and try again.';
        } else if (errorMessage.toLowerCase().includes('network')) {
            errorMessage = 'Network error. Please check your connection and try again.';
        } else if (errorMessage.toLowerCase().includes('already verified')) {
            errorMessage = 'This email is already verified. Redirecting to login...';
            showFormAlert('✅ Email already verified! Redirecting...', true);
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            setLoading(false);
            return;
        }
        
        showFormAlert(errorMessage, false);
        
        // Shake the input
        const container = DOM.codeInput.closest('.code-input-container');
        if (container) {
            container.classList.add('shake');
            setTimeout(() => {
                container.classList.remove('shake');
            }, 500);
        }
        
        // Clear the code for retry
        DOM.codeInput.value = '';
        DOM.codeInput.focus();
        
        setLoading(false);
    }
});

// ================================================================
// KEYBOARD SHORTCUTS
// ================================================================

// Enter key on code input triggers submission
DOM.codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        DOM.form.dispatchEvent(new Event('submit'));
    }
});

// ================================================================
// URL PARAMETER HANDLING
// ================================================================

/**
 * Handle URL parameters on page load
 */
function handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for email
    const emailParam = urlParams.get('email');
    if (emailParam) {
        state.email = emailParam;
        localStorage.setItem(STORAGE_KEYS.VERIFY_EMAIL, emailParam);
    }
    
    // Check for auto-verification code
    const codeParam = urlParams.get('code');
    if (codeParam && isValidCode(codeParam)) {
        DOM.codeInput.value = codeParam;
        // Auto-submit after a short delay
        setTimeout(() => {
            DOM.form.dispatchEvent(new Event('submit'));
        }, 500);
    }
}

// ================================================================
// INITIALIZATION
// ================================================================

/**
 * Initialize the verification page
 */
function init() {
    console.log('🚀 SpaceShare — Verify Email page initializing...');
    console.log(`📍 API Base URL: ${API_BASE_URL}`);
    console.log(`🔗 Verify Endpoint: ${VERIFY_ENDPOINT}`);
    console.log(`🔗 Resend Endpoint: ${RESEND_ENDPOINT}`);
    
    // Handle URL parameters
    handleUrlParams();
    
    // Get email
    const email = getEmail();
    if (email) {
        console.log(`📧 Verification email: ${email}`);
        // Show email in the UI if needed
        const emailDisplay = document.querySelector('.email-display');
        if (emailDisplay) {
            emailDisplay.textContent = email;
        }
    } else {
        console.warn('⚠️ No email found. User may need to sign up first.');
        // Show a warning but don't block
        showFormAlert('Please enter the verification code sent to your email.', false);
    }
    
    // Start resend timer
    startResendTimer(60);
    
    // Focus the input
    DOM.codeInput.focus();
    
    console.log('✅ Verify Email page ready');
    console.log('💡 Paste a code or enter it manually');
    console.log('⏱️  Resend available in 60 seconds');
}

// ================================================================
// EVENT LISTENERS
// ================================================================

// Code input with auto-submit
DOM.codeInput.addEventListener('input', handleCodeInput);

// Paste button
DOM.pasteBtn.addEventListener('click', handlePaste);

// Resend button
DOM.resendBtn.addEventListener('click', handleResend);

// ================================================================
// EXPOSE FOR TESTING (Development Only)
// ================================================================

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.__verify = {
        API_BASE_URL,
        VERIFY_ENDPOINT,
        RESEND_ENDPOINT,
        verifyEmail,
        resendVerification,
        getEmail,
        isValidCode,
        state,
        DOM: {
            codeInput: DOM.codeInput,
            form: DOM.form,
            verifyBtn: DOM.verifyBtn,
            resendBtn: DOM.resendBtn,
        },
        test: {
            validCode: '123456',
            invalidCode: '12345',
            expiredCode: '999999',
        }
    };
    console.log('💻 Debug: window.__verify available for testing');
    console.log('🧪 Test codes: valid=123456, invalid=12345, expired=999999');
}

// ================================================================
// START
// ================================================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}