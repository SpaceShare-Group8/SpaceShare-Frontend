/* ================================================================
   SPACESHARE — OTP VERIFICATION PAGE LOGIC (otp.js)
   Fully integrated with SpaceShare Backend API
   ================================================================ */

// ================================================================
// CONFIGURATION
// ================================================================

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://spaceshare-backend-cor9.onrender.com';

console.log('🔗 OTP API Base URL:', API_BASE_URL);

// ================================================================
// DOM REFERENCES
// ================================================================

const DOM = {
    otpForm: document.getElementById('otpForm'),
    otpInputs: document.querySelectorAll('.otp-input'),
    emailDisplay: document.getElementById('emailDisplay'),
    countdown: document.getElementById('countdown'),
    resendLink: document.getElementById('resendLink'),
    verifyBtn: document.getElementById('verifyBtn'),
    otpError: document.getElementById('otpError'),
    backBtn: document.getElementById('backBtn'),
    otpHeader: document.getElementById('otpHeader'),
    otpActions: document.getElementById('otpActions'),
    otpFooter: document.getElementById('otpFooter'),
};

// ================================================================
// STATE
// ================================================================

let timer = null;
let timeLeft = 60;
let isVerifying = false;
let userEmail = localStorage.getItem('spaceshare:verifyEmail') || '';
let userData = null;
let redirectTimer = null;

// ================================================================
// UI HELPERS
// ================================================================

function showError(message) {
    if (!DOM.otpError) return;
    DOM.otpError.textContent = message;
    DOM.otpError.hidden = false;
    DOM.otpInputs.forEach(input => input.classList.add('error'));
}

function hideError() {
    if (!DOM.otpError) return;
    DOM.otpError.hidden = true;
    DOM.otpError.textContent = '';
    DOM.otpInputs.forEach(input => input.classList.remove('error'));
}

function setVerifying(isLoading) {
    isVerifying = isLoading;
    DOM.verifyBtn.disabled = isLoading;
    const label = DOM.verifyBtn.querySelector('.btn-label');
    const spinner = DOM.verifyBtn.querySelector('.btn-spinner');

    if (isLoading) {
        label.textContent = 'Verifying...';
        if (spinner) spinner.hidden = false;
    } else {
        label.textContent = 'Verify';
        if (spinner) spinner.hidden = true;
    }
}

function showSuccessMessage(message) {
    const successEl = document.createElement('div');
    successEl.className = 'otp-success';
    successEl.textContent = message;
    successEl.style.cssText = `
        text-align: center;
        color: #10B981;
        font-size: 0.875rem;
        padding: 0.5rem;
        margin-bottom: 1rem;
        background: #ECFDF5;
        border-radius: 8px;
        border: 1px solid rgba(16, 185, 129, 0.2);
    `;

    const form = DOM.otpForm;
    if (form && form.parentNode) {
        form.parentNode.insertBefore(successEl, form);
    }

    setTimeout(() => {
        if (successEl && successEl.parentNode) {
            successEl.remove();
        }
    }, 3000);
}

// ================================================================
// SUCCESS SCREEN
// ================================================================

function showSuccessScreen() {
    // Hide OTP form and related elements
    if (DOM.otpForm) DOM.otpForm.style.display = 'none';
    if (DOM.otpActions) DOM.otpActions.style.display = 'none';
    if (DOM.otpFooter) DOM.otpFooter.style.display = 'none';
    if (DOM.otpHeader) DOM.otpHeader.style.display = 'none';
    if (DOM.backBtn) DOM.backBtn.style.display = 'none';

    // Create success content
    const successHTML = `
        <div class="verification-success" id="verificationSuccess">
            <div class="success-icon-wrapper">
                <div class="success-circle">
                    <i class="ph-fill ph-check-circle"></i>
                </div>
            </div>
            <h2 class="success-title">Verification Successful! 🎉</h2>
            <p class="success-message">Your email has been verified. You are now logged in.</p>
            <p class="success-submessage">
                Redirecting to dashboard in <span id="redirectCountdown">3</span> seconds...
            </p>
            <button class="btn-verify success-btn" id="goToDashboardBtn">
                Go to Dashboard Now
            </button>
        </div>
    `;

    // Insert success content after the header
    const container = document.querySelector('.otp-container');
    if (container) {
        // Find the position to insert (after back button or header)
        const insertPosition = DOM.backBtn ? DOM.backBtn.nextSibling : container.firstChild;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = successHTML;
        const successElement = tempDiv.firstElementChild;

        // Add styles for success screen
        const style = document.createElement('style');
        style.textContent = `
            .verification-success {
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
                margin-bottom: 0.5rem;
            }
            .success-submessage {
                color: #94A3B8;
                font-size: 0.85rem;
                margin-bottom: 1.5rem;
            }
            .success-btn {
                max-width: 200px;
                margin: 0 auto;
                background: #10B981;
            }
            .success-btn:hover {
                background: #059669;
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

        // Insert success element
        if (insertPosition) {
            container.insertBefore(successElement, insertPosition);
        } else {
            container.appendChild(successElement);
        }

        // Store user data in localStorage for dashboard
        if (userData) {
            try {
                localStorage.setItem('spaceshare:user', JSON.stringify(userData));
                if (userData.accessToken) {
                    localStorage.setItem('spaceshare:accessToken', userData.accessToken);
                }
                if (userData.refreshToken) {
                    localStorage.setItem('spaceshare:refreshToken', userData.refreshToken);
                }
            } catch (e) {
                console.warn('Could not store user data:', e);
            }
        }

        // Start countdown
        let countdown = 3;
        const countdownEl = document.getElementById('redirectCountdown');
        
        clearInterval(redirectTimer);
        redirectTimer = setInterval(() => {
            countdown--;
            if (countdownEl) countdownEl.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(redirectTimer);
                window.location.href = 'dashboard.html';
            }
        }, 1000);

        // Manual redirect button
        const goToBtn = document.getElementById('goToDashboardBtn');
        if (goToBtn) {
            goToBtn.addEventListener('click', () => {
                clearInterval(redirectTimer);
                window.location.href = 'dashboard.html';
            });
        }
    }
}

// ================================================================
// OTP INPUT HANDLING
// ================================================================

DOM.otpInputs.forEach((input, index) => {
    // Auto-advance to next input
    input.addEventListener('input', () => {
        input.value = input.value.replace(/[^0-9]/g, '');
        if (input.value !== '' && index < DOM.otpInputs.length - 1) {
            DOM.otpInputs[index + 1].focus();
        }
        hideError();
    });

    // Handle backspace
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && input.value === '' && index > 0) {
            DOM.otpInputs[index - 1].focus();
        }
    });

    // Handle paste
    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        const digits = paste.replace(/[^0-9]/g, '').slice(0, 6);
        if (digits) {
            const inputs = DOM.otpInputs;
            for (let i = 0; i < digits.length && i < inputs.length; i++) {
                inputs[i].value = digits[i];
            }
            if (digits.length === 6) {
                inputs[5].focus();
                setTimeout(verifyOTP, 300);
            } else {
                const nextIndex = digits.length - 1;
                if (nextIndex >= 0 && nextIndex < inputs.length) {
                    inputs[nextIndex]?.focus();
                }
            }
        }
    });
});

// ================================================================
// COUNTDOWN TIMER
// ================================================================

function startTimer() {
    clearInterval(timer);
    timeLeft = 60;
    if (DOM.countdown) DOM.countdown.textContent = timeLeft;
    if (DOM.resendLink) {
        DOM.resendLink.classList.add('disabled');
        DOM.resendLink.style.pointerEvents = 'none';
    }

    timer = setInterval(() => {
        timeLeft--;
        if (DOM.countdown) DOM.countdown.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(timer);
            if (DOM.resendLink) {
                DOM.resendLink.classList.remove('disabled');
                DOM.resendLink.style.pointerEvents = 'auto';
                DOM.countdown.textContent = '0';
            }
        }
    }, 1000);
}

// ================================================================
// API CALLS
// ================================================================

/**
 * Verify OTP
 * POST /api/auth/verify-otp
 */
async function verifyOTP() {
    // Get OTP value
    let otp = '';
    DOM.otpInputs.forEach(input => {
        otp += input.value;
    });

    // Validate OTP
    if (otp.length !== 6) {
        showError('Please enter the complete 6-digit verification code.');
        DOM.otpInputs[0]?.focus();
        return;
    }

    if (isVerifying) return;

    hideError();
    setVerifying(true);

    try {
        console.log('📤 Verifying OTP for:', userEmail);

        const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                email: userEmail,
                otp: otp,
            }),
        });

        const data = await response.json();
        console.log('📥 OTP verification response:', data);

        if (!response.ok) {
            throw new Error(data.message || 'Invalid verification code.');
        }

        // Store user data
        userData = data.data || {};
        
        // Clear email from storage
        localStorage.removeItem('spaceshare:verifyEmail');

        // Show success screen
        showSuccessScreen();

    } catch (error) {
        console.error('❌ OTP verification error:', error);
        showError(error.message || 'Invalid verification code. Please try again.');
        // Clear OTP inputs
        DOM.otpInputs.forEach(input => input.value = '');
        DOM.otpInputs[0]?.focus();
    } finally {
        setVerifying(false);
    }
}

/**
 * Resend OTP
 * POST /api/auth/resend-otp
 */
async function resendOTP() {
    if (!userEmail) {
        showError('No email found. Please go back and register again.');
        return;
    }

    if (DOM.resendLink && DOM.resendLink.classList.contains('disabled')) {
        return;
    }

    hideError();

    try {
        console.log('📤 Resending OTP to:', userEmail);

        const response = await fetch(`${API_BASE_URL}/api/auth/resend-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                email: userEmail,
            }),
        });

        const data = await response.json();
        console.log('📥 Resend OTP response:', data);

        if (!response.ok) {
            throw new Error(data.message || 'Failed to resend code.');
        }

        // Show success message
        showSuccessMessage('New verification code sent!');

        // Restart timer
        startTimer();

        // Clear OTP inputs
        DOM.otpInputs.forEach(input => input.value = '');
        DOM.otpInputs[0]?.focus();

    } catch (error) {
        console.error('❌ Resend OTP error:', error);
        showError(error.message || 'Failed to resend code. Please try again.');
    }
}

// ================================================================
// EVENT LISTENERS
// ================================================================

// Form submission
if (DOM.otpForm) {
    DOM.otpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        verifyOTP();
    });
}

// Resend link
if (DOM.resendLink) {
    DOM.resendLink.addEventListener('click', (e) => {
        e.preventDefault();
        resendOTP();
    });
}

// Auto-verify when all 6 digits are entered
DOM.otpInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
        if (index === 5 && input.value !== '') {
            // All digits entered, auto-verify after a small delay
            setTimeout(verifyOTP, 300);
        }
    });
});

// ================================================================
// INITIALIZATION
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 OTP Page Loaded');
    console.log('🌐 API URL:', API_BASE_URL);

    // Get email from localStorage
    userEmail = localStorage.getItem('spaceshare:verifyEmail') || '';
    
    if (DOM.emailDisplay) {
        DOM.emailDisplay.textContent = userEmail || 'your@email.com';
    }

    if (!userEmail) {
        showError('No email found. Please go back and register again.');
    }

    // Start countdown timer
    startTimer();

    // Focus first input
    setTimeout(() => {
        if (DOM.otpInputs && DOM.otpInputs.length > 0) {
            DOM.otpInputs[0]?.focus();
        }
    }, 300);

    console.log('✅ OTP page initialized');
});

// ================================================================
// EXPOSE FUNCTIONS FOR INLINE HTML
// ================================================================

window.verifyOTP = verifyOTP;
window.resendOTP = resendOTP;

console.log('✅ otp.js loaded successfully');