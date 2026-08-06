/* ================================================================
   SPACESHARE — FORGOT PASSWORD PAGE LOGIC (forgot-password.js)
   Fully integrated with SpaceShare Backend API
   Beautiful UX with loading states, error handling, and success flow
   ================================================================ */

// ================================================================
// CONFIGURATION
// ================================================================

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://spaceshare-backend-cor9.onrender.com';

console.log('🔗 Forgot Password API Base URL:', API_BASE_URL);

// ================================================================
// DOM REFERENCES
// ================================================================

const DOM = {
    form: document.getElementById('forgotPasswordForm'),
    emailInput: document.getElementById('email'),
    emailError: document.getElementById('emailError'),
    formAlert: document.getElementById('formAlert'),
    submitBtn: document.getElementById('submitBtn'),
    backBtn: document.getElementById('backBtn'),
};

// ================================================================
// STATE
// ================================================================

let isSubmitting = false;

// ================================================================
// UI HELPERS
// ================================================================

/**
 * Show inline field error
 */
function showFieldError(message) {
    if (!DOM.emailError) return;
    DOM.emailError.textContent = message;
    DOM.emailInput.classList.add('has-error');
}

/**
 * Clear inline field error
 */
function clearFieldError() {
    if (!DOM.emailError) return;
    DOM.emailError.textContent = '';
    DOM.emailInput.classList.remove('has-error');
}

/**
 * Show global alert message
 */
function showAlert(message, isSuccess = false) {
    if (!DOM.formAlert) return;
    DOM.formAlert.textContent = message;
    DOM.formAlert.hidden = false;
    DOM.formAlert.className = `form-alert ${isSuccess ? 'alert-success' : 'alert-error'}`;
}

/**
 * Hide global alert
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
    isSubmitting = isLoading;
    DOM.submitBtn.disabled = isLoading;
    
    const label = DOM.submitBtn.querySelector('.btn-label');
    const spinner = DOM.submitBtn.querySelector('.btn-spinner');

    if (isLoading) {
        if (label) label.textContent = 'Sending...';
        if (spinner) spinner.hidden = false;
    } else {
        if (label) label.textContent = 'Send Reset Link';
        if (spinner) spinner.hidden = true;
    }
}

/**
 * Show success state with email display
 */
function showSuccess(email) {
    // Hide form
    DOM.form.style.display = 'none';
    hideAlert();

    // Create success message
    const successHTML = `
        <div class="success-container" id="successContainer">
            <div class="success-icon-wrapper">
                <div class="success-circle">
                    <i class="ph-fill ph-check-circle"></i>
                </div>
            </div>
            <h2 class="success-title">Check Your Email 📧</h2>
            <p class="success-message">
                We've sent a password reset link to<br />
                <strong>${email}</strong>
            </p>
            <p class="success-submessage">
                Click the link in the email to reset your password.
                The link expires in 15 minutes.
            </p>
            <div class="success-actions">
                <button type="button" class="btn btn-primary" id="resendBtn">
                    <i class="ph ph-arrow-clockwise"></i>
                    <span>Resend Email</span>
                </button>
                <a href="login.html" class="btn btn-secondary">
                    <i class="ph ph-arrow-left"></i>
                    <span>Back to Sign In</span>
                </a>
            </div>
        </div>
    `;

    // Insert success content after the header
    const container = document.querySelector('.forgot-container');
    const header = document.querySelector('.forgot-header');
    
    if (container && header) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = successHTML;
        const successElement = tempDiv.firstElementChild;
        
        // Add styles for success screen
        const style = document.createElement('style');
        style.textContent = `
            .success-container {
                text-align: center;
                padding: 1rem 0;
                animation: fadeInUp 0.5s ease;
            }
            .success-icon-wrapper {
                margin-bottom: 1.5rem;
            }
            .success-circle {
                width: 80px;
                height: 80px;
                background: #ECFDF5;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto;
            }
            .success-circle i {
                font-size: 48px;
                color: #10B981;
            }
            .success-title {
                font-family: 'Poppins', system-ui, sans-serif;
                font-size: 1.5rem;
                font-weight: 700;
                color: #0F172A;
                margin-bottom: 0.5rem;
            }
            .success-message {
                color: #64748B;
                font-size: 0.95rem;
                line-height: 1.6;
                margin-bottom: 0.25rem;
            }
            .success-message strong {
                color: #0F172A;
            }
            .success-submessage {
                color: #94A3B8;
                font-size: 0.85rem;
                margin-bottom: 1.5rem;
            }
            .success-actions {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                margin-top: 1.5rem;
            }
            .btn-secondary {
                background: var(--gray-100);
                color: var(--dark);
                border: 1px solid var(--gray-200);
                text-decoration: none;
            }
            .btn-secondary:hover {
                background: var(--gray-200);
            }
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);

        // Insert after header
        header.insertAdjacentElement('afterend', successElement);
    }

    // Handle resend button
    const resendBtn = document.getElementById('resendBtn');
    if (resendBtn) {
        resendBtn.addEventListener('click', async () => {
            resendBtn.disabled = true;
            resendBtn.innerHTML = '<span>Sending...</span>';
            await handleResend(email);
            resendBtn.disabled = false;
            resendBtn.innerHTML = `
                <i class="ph ph-arrow-clockwise"></i>
                <span>Resend Email</span>
            `;
        });
    }
}

/**
 * Handle resend request
 */
async function handleResend(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to resend email.');
        }

        showAlert('New reset link sent! Please check your email.', true);
        
        setTimeout(() => {
            hideAlert();
        }, 5000);

    } catch (error) {
        console.error('❌ Resend error:', error);
        showAlert(error.message || 'Failed to resend. Please try again.');
    }
}

// ================================================================
// VALIDATION
// ================================================================

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
}

// ================================================================
// API CALLS
// ================================================================

/**
 * Send forgot password request
 */
async function sendResetLink(email) {
    console.log('📤 Sending reset link to:', email);

    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({ email }),
    });

    const data = await response.json();
    console.log('📥 Forgot password response:', data);

    if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset link.');
    }

    return data;
}

// ================================================================
// EVENT HANDLERS
// ================================================================

/**
 * Handle form submission
 */
async function handleSubmit(event) {
    event.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) return;

    hideAlert();
    clearFieldError();

    const email = DOM.emailInput.value.trim();

    // Validate: Empty
    if (!email) {
        showFieldError('Email address is required.');
        DOM.emailInput.focus();
        return;
    }

    // Validate: Invalid format
    if (!isValidEmail(email)) {
        showFieldError('Please enter a valid email address.');
        DOM.emailInput.focus();
        return;
    }

    // Clear error and submit
    clearFieldError();
    setLoading(true);

    try {
        const result = await sendResetLink(email);
        
        // Show success state
        showSuccess(email);
        
        console.log('✅ Reset link sent successfully');

    } catch (error) {
        console.error('❌ Forgot password error:', error);
        
        // Show user-friendly error message
        if (error.message.includes('not found') || error.message.includes('no account')) {
            showAlert('No account found with this email address. Please check and try again.');
        } else {
            showAlert(error.message || 'Failed to send reset link. Please try again.');
        }
        
        setLoading(false);
    }
}

/**
 * Handle back button
 */
function handleBack() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = 'login.html';
    }
}

// ================================================================
// REAL-TIME VALIDATION
// ================================================================

// Clear error when user types
DOM.emailInput.addEventListener('input', () => {
    clearFieldError();
    hideAlert();
});

// Remove error state on focus
DOM.emailInput.addEventListener('focus', () => {
    clearFieldError();
});

// ================================================================
// EVENT LISTENERS
// ================================================================

// Form submission
DOM.form.addEventListener('submit', handleSubmit);

// Back button
if (DOM.backBtn) {
    DOM.backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleBack();
    });
}

// ================================================================
// KEYBOARD SHORTCUTS
// ================================================================

// Escape key to go back
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        handleBack();
    }
});

// Enter key submits form (already handled by form submit)

// ================================================================
// INITIALIZATION
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Forgot Password Page Loaded');
    console.log('🌐 API URL:', API_BASE_URL);

    // Focus email input
    setTimeout(() => {
        DOM.emailInput.focus();
    }, 300);

    console.log('✅ Forgot Password page initialized');
});

// ================================================================
// EXPOSE FUNCTIONS FOR INLINE HTML
// ================================================================

// No inline functions needed - all logic is inside this file

console.log('✅ forgot-password.js loaded successfully');