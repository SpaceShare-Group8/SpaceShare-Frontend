/* ============================================
   SpaceShare — Sign Up Page Logic
   Talks to src/api/auth.js -> POST /api/auth/register
   ============================================ */

import { register } from "../api/auth.js";

const form = document.getElementById("signupForm");
const fullNameInput = document.getElementById("full_name");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm_password");
const termsInput = document.getElementById("terms");
const roleInput = document.getElementById("role");
const roleToggle = document.getElementById("roleToggle");
const formAlert = document.getElementById("formAlert");
const submitBtn = document.getElementById("submitBtn");
const togglePasswordBtn = document.getElementById("togglePassword");

/* ---- Role toggle (Seeker / Host) ---- */

roleToggle.addEventListener("click", (event) => {
  const button = event.target.closest(".role-option");
  if (!button) return;

  roleToggle.querySelectorAll(".role-option").forEach((btn) => btn.setAttribute("aria-pressed", "false"));
  button.setAttribute("aria-pressed", "true");
  roleInput.value = button.dataset.role;
});

/* ---- Password visibility toggle ---- */

togglePasswordBtn.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  togglePasswordBtn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
});

/* ---- Small validation/UI helpers ---- */

function setFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`${fieldId}Error`);
  if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
  if (errorEl) errorEl.textContent = message || "";
}

function clearErrors() {
  ["full_name", "email", "phone", "password", "confirm_password", "terms"].forEach((id) =>
    setFieldError(id, "")
  );
  hideFormAlert();
}

function showFormAlert(message) {
  formAlert.textContent = message;
  formAlert.hidden = false;
}

function hideFormAlert() {
  formAlert.hidden = true;
  formAlert.textContent = "";
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.dataset.loading = String(isLoading);
  submitBtn.querySelector(".btn-spinner").hidden = !isLoading;
}

function looksLikeEmail(value) {
  return /\S+@\S+\.\S+/.test(value);
}

/* ---- Token storage ----
   Same defensive approach as login.js — see the note there. Both pages
   should be updated together once the real response shape is confirmed. */

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

  const user = response.user ?? response.data?.user ?? null;

  return { accessToken, refreshToken, user };
}

function storeSession({ accessToken, refreshToken, user }) {
  if (accessToken) localStorage.setItem("spaceshare_access_token", accessToken);
  if (refreshToken) localStorage.setItem("spaceshare_refresh_token", refreshToken);
  if (user) localStorage.setItem("spaceshare_user", JSON.stringify(user));
}

/* ---- Submit handler ---- */

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearErrors();

  const fullName = fullNameInput.value.trim();
  const email = emailInput.value.trim();
  const phone = phoneInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  const role = roleInput.value;

  let hasError = false;

  if (fullName.length < 3 || fullName.length > 150) {
    setFieldError("full_name", "Enter your full name (3–150 characters).");
    hasError = true;
  }

  if (!email && !phone) {
    setFieldError("email", "Enter an email or a phone number.");
    hasError = true;
  } else if (email && !looksLikeEmail(email)) {
    setFieldError("email", "Enter a valid email address.");
    hasError = true;
  }

  if (!password) {
    setFieldError("password", "Create a password.");
    hasError = true;
  } else if (password.length < 8) {
    setFieldError("password", "Password must be at least 8 characters.");
    hasError = true;
  }

  if (confirmPassword !== password) {
    setFieldError("confirm_password", "Passwords don't match.");
    hasError = true;
  }

  if (!termsInput.checked) {
    setFieldError("terms", "You need to accept the terms to continue.");
    hasError = true;
  }

  if (hasError) return;

  const payload = { full_name: fullName, password, role };
  if (email) payload.email = email;
  if (phone) payload.phone = phone;

  setLoading(true);
  try {
    const response = await register(payload);
    const authData = extractAuthData(response);

    if (authData.accessToken) {
      // Some backends log the user in immediately on register.
      storeSession(authData);
      window.location.href = "../../index.html";
      return;
    }

    // Otherwise, registration succeeded but requires a separate login step.
    window.location.href = `login.html?registered=1`;
  } catch (error) {
    showFormAlert(error.message || "Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
});