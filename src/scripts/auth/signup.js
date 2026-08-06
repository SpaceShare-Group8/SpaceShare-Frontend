/* ================================================================
   SPACESHARE — SIGNUP PAGE LOGIC (`signup.js`)
   ================================================================ */

// ================================================================
// CONFIGURATION
// ================================================================

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://spaceshare-backend-cor9.onrender.com';

console.log(`🔗 API Base URL: ${API_BASE_URL}`);

const STORAGE_KEYS = {
    SELECTED_ROLE: 'spaceshare:selectedRole'
};

// ================================================================
// DOM REFERENCES
// ================================================================

const DOM = {
    signupForm: document.getElementById('signup-form'),
    verificationCard: document.getElementById('verification-pending-card'),
    signupFormContainer: document.getElementById('signup-form-container'),
    roleIndicator: document.getElementById('roleIndicator'),
    sentEmailDisplay: document.getElementById('sent-email-display'),
    formAlert: document.getElementById('form-alert'),
    fullNameInput: document.getElementById('fullName'),
    emailInput: document.getElementById('email'),
    phoneInput: document.getElementById('phone'),
    passwordInput: document.getElementById('password'),
    confirmPasswordInput: document.getElementById('confirmPassword'),
    togglePassword: document.getElementById('togglePassword'),
    toggleConfirmPassword: document.getElementById('toggleConfirmPassword'),
    hintLength: document.getElementById('hintLength'),
    hintUppercase: document.getElementById('hintUppercase'),
    hintNumber: document.getElementById('hintNumber'),
    passwordMatchMessage: document.getElementById('passwordMatchMessage'),
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

// ================================================================
// UI HELPERS
// ================================================================

function showAlert(message, isSuccess = false) {
    if (!DOM.formAlert) return;
    DOM.formAlert.textContent = message;
    DOM.formAlert.hidden = false;
    DOM.formAlert.className = `form-alert ${isSuccess ? 'alert-success' : 'alert-error'}`;
}

function hideAlert() {
    if (!DOM.formAlert) return;
    DOM.formAlert.hidden = true;
    DOM.formAlert.textContent = '';
    DOM.formAlert.className = 'form-alert';
}

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

function formatRoleName(role) {
    switch (role?.toLowerCase()) {
        case 'host': return 'Host';
        case 'seeker': return 'Workspace Seeker';
        case 'corporate_admin': return 'Corporate Admin';
        case 'admin': return 'Platform Admin';
        default: return 'Workspace Seeker';
    }
}

// ================================================================
// PASSWORD FUNCTIONS
// ================================================================

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
// SHOW VERIFICATION CARD
// ================================================================

function showVerificationCard(email) {
    if (DOM.signupFormContainer) {
        DOM.signupFormContainer.style.display = 'none';
    }
    if (DOM.signupForm) {
        DOM.signupForm.style.display = 'none';
    }

    if (DOM.sentEmailDisplay) {
        DOM.sentEmailDisplay.textContent = email;
    }

    if (DOM.verificationCard) {
        DOM.verificationCard.hidden = false;
        DOM.verificationCard.style.display = 'block';
    }

    startResendCountdown();
}

// ================================================================
// API CALLS
// ================================================================

async function registerUser(payload) {
    console.log('📤 Sending to:', `${API_BASE_URL}/api/auth/register`);
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
    console.log('📥 Response:', response.status, data);

    if (!response.ok) {
        throw new Error(data.message || `Registration failed (${response.status})`);
    }

    return data;
}

async function resendVerificationEmail(email) {
    console.log('📤 Resend to:', `${API_BASE_URL}/api/auth/resend-verification`);

    const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ email })
    });

    const data = await response.json();
    console.log('📥 Resend response:', data);

    if (!response.ok) {
        throw new Error(data.message || `Failed to resend email (${response.status})`);
    }

    return data;
}

// ================================================================
// EVENT HANDLERS
// ================================================================

async function handleFormSubmit(event) {
    event.preventDefault();
    hideAlert();

    const fullName = DOM.fullNameInput?.value.trim() || '';
    const email = DOM.emailInput?.value.trim() || '';
    const phone = DOM.phoneInput?.value.trim() || '';
    const password = DOM.passwordInput?.value || '';
    const confirmPassword = DOM.confirmPasswordInput?.value || '';
    const selectedRole = localStorage.getItem(STORAGE_KEYS.SELECTED_ROLE) || 'seeker';
    const termsAccepted = DOM.termsCheckbox?.checked || false;

    // Validation
    if (!fullName || fullName.length < 2) {
        showAlert('Please enter your full name.');
        DOM.fullNameInput?.focus();
        return;
    }

    if (!email && !phone) {
        showAlert('Please provide either an email address or phone number.');
        return;
    }

    if (email && !email.includes('@')) {
        showAlert('Please enter a valid email address.');
        DOM.emailInput?.focus();
        return;
    }

    if (!validatePasswordRequirements(password)) {
        showAlert('Password must have 8+ characters, 1 uppercase letter, and 1 number.');
        DOM.passwordInput?.focus();
        return;
    }

    if (password !== confirmPassword) {
        showAlert('Passwords do not match.');
        DOM.confirmPasswordInput?.focus();
        return;
    }

    if (!termsAccepted) {
        showAlert('Please agree to the Terms of Service and Privacy Policy.');
        return;
    }

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
        console.log('✅ Registration successful:', result);
        
        userEmailForVerification = email;
        showVerificationCard(email);
        showAlert('Account created! Please check your email to verify.', true);

    } catch (error) {
        console.error('❌ Registration error:', error);
        showAlert(error.message || 'Registration failed. Please try again.');
    } finally {
        setLoading(false);
    }
}

async function handleResendVerification() {
    if (!userEmailForVerification) {
        showAlert('No email address found. Please try registering again.');
        return;
    }
    
    hideAlert();

    try {
        await resendVerificationEmail(userEmailForVerification);
        showAlert('Verification email sent! Please check your inbox.', true);
        startResendCountdown();

    } catch (error) {
        console.error('❌ Resend error:', error);
        showAlert(error.message || 'Unable to resend verification email. Please try again later.');
    }
}

// ================================================================
// INITIALIZATION
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 SpaceShare Signup Page Loaded');
    console.log(`🌐 API URL: ${API_BASE_URL}`);

    // Set role badge
    const selectedRole = localStorage.getItem(STORAGE_KEYS.SELECTED_ROLE) || 'seeker';
    if (DOM.roleIndicator) {
        DOM.roleIndicator.textContent = formatRoleName(selectedRole);
    }

    // Real-time password validation
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

    // Social buttons
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

    // Form submission
    if (DOM.signupForm) {
        DOM.signupForm.addEventListener('submit', handleFormSubmit);
    }

    // Resend button
    if (DOM.resendBtn) {
        DOM.resendBtn.addEventListener('click', handleResendVerification);
    }

    console.log('✅ Signup page initialized successfully');
});