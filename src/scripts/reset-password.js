(function() {
    'use strict';

    // ============================================================
    // 1. CONFIGURATION
    // ============================================================
    const API_BASE_URL = 'https://spaceshare-backend-cor9.onrender.com';
    const RESET_PASSWORD_ENDPOINT = `${API_BASE_URL}/api/auth/reset-password`;
    
    // Token extraction from URL (supports both 'token' and 'code' params)
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('token') || params.get('code') || '';

    // ============================================================
    // 2. DOM ELEMENTS
    // ============================================================
    const form = document.getElementById('resetForm');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const newPasswordField = document.getElementById('newPasswordField');
    const confirmPasswordField = document.getElementById('confirmPasswordField');
    const formError = document.getElementById('formError');
    const submitBtn = document.getElementById('submitBtn');
    const backBtn = document.getElementById('backBtn');
    const stepReset = document.getElementById('step-reset');
    const stepSuccess = document.getElementById('step-success');

    // Requirement checklist items
    const requirementItems = {
        length: document.querySelector('[data-rule="length"]'),
        case: document.querySelector('[data-rule="case"]'),
        symbol: document.querySelector('[data-rule="symbol"]')
    };

    // ============================================================
    // 3. PASSWORD VISIBILITY TOGGLES
    // ============================================================
    document.querySelectorAll('.toggle-visibility').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const eyeIcon = this.querySelector('.icon-eye');
            const eyeOffIcon = this.querySelector('.icon-eye-off');
            const isHidden = input.type === 'password';

            // Toggle password visibility
            input.type = isHidden ? 'text' : 'password';
            
            // Update icons
            eyeIcon.style.display = isHidden ? 'none' : 'block';
            eyeOffIcon.style.display = isHidden ? 'block' : 'none';
            
            // Accessibility
            this.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
            this.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
        });
    });

    // ============================================================
    // 4. PASSWORD VALIDATION ENGINE
    // ============================================================
    function validatePassword(value) {
        const rules = {
            length: value.length >= 8,
            case: /[a-z]/.test(value) && /[A-Z]/.test(value),
            symbol: /[0-9]/.test(value) || /[^A-Za-z0-9]/.test(value)
        };

        // Update checklist visually
        Object.keys(rules).forEach(key => {
            const item = requirementItems[key];
            if (!item) return;
            item.classList.toggle('met', rules[key]);
            item.setAttribute('aria-checked', rules[key] ? 'true' : 'false');
        });

        // Return true if ALL rules pass
        return rules.length && rules.case && rules.symbol;
    }

    // Live validation on input
    newPasswordInput.addEventListener('input', function() {
        validatePassword(this.value);
        clearError();
        
        // Check if passwords match while typing
        if (confirmPasswordInput.value.length > 0) {
            checkPasswordsMatch();
        }
    });

    confirmPasswordInput.addEventListener('input', function() {
        clearError();
        checkPasswordsMatch();
    });

    // ============================================================
    // 5. PASSWORD MATCH CHECKER
    // ============================================================
    function checkPasswordsMatch() {
        const newPass = newPasswordInput.value;
        const confirmPass = confirmPasswordInput.value;
        
        if (confirmPass.length === 0) return;
        
        if (newPass !== confirmPass) {
            confirmPasswordField.classList.add('has-error');
            return false;
        } else {
            confirmPasswordField.classList.remove('has-error');
            return true;
        }
    }

    // ============================================================
    // 6. ERROR HANDLING
    // ============================================================
    function clearError() {
        formError.textContent = '';
        formError.classList.remove('visible');
        newPasswordField.classList.remove('has-error');
        confirmPasswordField.classList.remove('has-error');
        
        // Reset ARIA attributes
        formError.removeAttribute('role');
        formError.removeAttribute('aria-live');
    }

    function showError(message, fieldElement = null) {
        formError.textContent = message;
        formError.classList.add('visible');
        formError.setAttribute('role', 'alert');
        formError.setAttribute('aria-live', 'assertive');
        
        if (fieldElement) {
            fieldElement.classList.add('has-error');
            const input = fieldElement.querySelector('input');
            if (input) input.focus();
        }
    }

    // ============================================================
    // 7. LOADING STATE MANAGEMENT
    // ============================================================
    function setLoading(isLoading) {
        submitBtn.disabled = isLoading;
        submitBtn.classList.toggle('is-loading', isLoading);
        
        // Accessibility: Announce loading state
        if (isLoading) {
            submitBtn.setAttribute('aria-label', 'Updating password, please wait...');
        } else {
            submitBtn.setAttribute('aria-label', 'Update password');
        }
    }

    // ============================================================
    // 8. FORM SUBMISSION
    // ============================================================
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        clearError();

        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        // ----- Validation Step 1: Password Rules -----
        const meetsRules = validatePassword(newPassword);
        if (!meetsRules) {
            showError(
                'Your password needs at least 8 characters, upper and lowercase letters, and a number or symbol.',
                newPasswordField
            );
            return;
        }

        // ----- Validation Step 2: Passwords Match -----
        if (newPassword !== confirmPassword) {
            showError('Passwords do not match. Please try again.', confirmPasswordField);
            return;
        }

        // ----- Validation Step 3: Token Exists -----
        if (!resetToken) {
            showError('This reset link is missing or invalid. Please request a new one.');
            return;
        }

        // ----- Submit to Backend -----
        submitPasswordReset(newPassword);
    });

    // ============================================================
    // 9. API CALL
    // ============================================================
    function submitPasswordReset(password) {
        setLoading(true);

        fetch(RESET_PASSWORD_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                token: resetToken,
                password: password
            })
        })
        .then(async response => {
            const data = await response.json();
            return { ok: response.ok, status: response.status, data };
        })
        .then(result => {
            setLoading(false);

            if (!result.ok || result.data.success === false) {
                // Handle specific error codes from backend
                let message = result.data.message || 'Invalid or expired reset token. Please request a new one.';
                
                // Special handling for common errors
                if (result.status === 400) {
                    message = 'Invalid request. Please check your reset link.';
                } else if (result.status === 404) {
                    message = 'Reset token not found. Please request a new reset link.';
                } else if (result.status === 410) {
                    message = 'This reset link has expired. Please request a new one.';
                }
                
                showError(message, confirmPasswordField);
                return;
            }

            // Success!
            showSuccess();
        })
        .catch(error => {
            setLoading(false);
            
            // Handle network errors gracefully
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                showError('Unable to reach the server. Please check your internet connection and try again.');
            } else {
                showError('Something went wrong. Please try again later.');
            }
            
            // Log error for debugging (but don't show to user)
            console.error('Reset password error:', error);
        });
    }

    // ============================================================
    // 10. SUCCESS STATE
    // ============================================================
    function showSuccess() {
        // Hide form, show success
        stepReset.setAttribute('data-active', 'false');
        stepSuccess.setAttribute('data-active', 'true');
        
        // Focus the continue button for accessibility
        setTimeout(() => {
            const continueBtn = document.getElementById('continueBtn');
            if (continueBtn) continueBtn.focus();
        }, 100);
    }

    // ============================================================
    // 11. BACK BUTTON HANDLER
    // ============================================================
    backBtn.addEventListener('click', function() {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            // Fallback if history is empty
            window.location.href = './login.html';
        }
    });

    // ============================================================
    // 12. INITIALIZATION CHECKS
    // ============================================================
    // Check if token exists on page load, warn if missing
    if (!resetToken) {
        console.warn('No reset token found in URL. User may have arrived via invalid link.');
        // Don't show error immediately - let user attempt submit first
    }

    // Auto-detect dark mode preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark-mode');
    }

    // Listen for dark mode changes
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            document.documentElement.classList.toggle('dark-mode', e.matches);
        });
    }

    console.log('✅ Reset Password JS initialized successfully');
    console.log(`🔑 Token present: ${resetToken ? 'Yes' : 'No'}`);
})();