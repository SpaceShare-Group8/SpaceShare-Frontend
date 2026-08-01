/* ============================================
   SpaceShare — Login Page Logic
   Talks to src/api/auth.js -> POST /api/auth/login
   ============================================ */

import { login } from "../api/auth.js";

const form = document.getElementById("loginForm");
const identifierInput = document.getElementById("identifier");
const passwordInput = document.getElementById("password");
const rememberInput = document.getElementById("remember");
const formAlert = document.getElementById("formAlert");
const submitBtn = document.getElementById("submitBtn");
const togglePasswordBtn = document.getElementById("togglePassword");

/* ---- Post-signup success message ---- */

if (new URLSearchParams(window.location.search).get("registered") === "1") {
  formAlert.textContent = "Account created — sign in to continue.";
  formAlert.classList.add("success");
  formAlert.hidden = false;
}

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
  setFieldError("identifier", "");
  setFieldError("password", "");
  hideFormAlert();
}

function showFormAlert(message) {
  formAlert.classList.remove("success");
  formAlert.textContent = message;
  formAlert.hidden = false;
}

function hideFormAlert() {
  formAlert.hidden = true;
  formAlert.textContent = "";
  formAlert.classList.remove("success");
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
   NOTE: the backend response shape for tokens hasn't been confirmed yet.
   This checks the common locations in order so it works either way.
   Once you confirm the real shape (see auth.controller.js on the backend,
   or the Network tab after a real login), you can simplify this to the
   single correct path. */

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

function storeSession({ accessToken, refreshToken, user }, remember) {
  const storage = remember ? localStorage : sessionStorage;
  // Clear the other storage so a stale session doesn't linger there.
  const other = remember ? sessionStorage : localStorage;
  ["spaceshare_access_token", "spaceshare_refresh_token", "spaceshare_user"].forEach((key) =>
    other.removeItem(key)
  );

  if (accessToken) storage.setItem("spaceshare_access_token", accessToken);
  if (refreshToken) storage.setItem("spaceshare_refresh_token", refreshToken);
  if (user) storage.setItem("spaceshare_user", JSON.stringify(user));
}

/* ---- Submit handler ---- */

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearErrors();

  const identifier = identifierInput.value.trim();
  const password = passwordInput.value;

  let hasError = false;

  if (!identifier) {
    setFieldError("identifier", "Enter your email or phone number.");
    hasError = true;
  }

  if (!password) {
    setFieldError("password", "Enter your password.");
    hasError = true;
  } else if (password.length < 8) {
    setFieldError("password", "Password must be at least 8 characters.");
    hasError = true;
  }

  if (hasError) return;

  const payload = looksLikeEmail(identifier)
    ? { email: identifier, password }
    : { phone: identifier, password };

  setLoading(true);
  try {
    const response = await login(payload);
    const authData = extractAuthData(response);

    if (!authData.accessToken) {
      // Login "succeeded" per the backend but we couldn't find a token —
      // surface this loudly instead of silently redirecting a logged-out user.
      console.warn("Login response did not contain a recognizable token. Full response:", response);
      showFormAlert("Signed in, but couldn't find a session token in the response. Check the console for the raw response shape.");
      return;
    }

    storeSession(authData, rememberInput.checked);
    window.location.href = "../../index.html";
  } catch (error) {
    showFormAlert(error.message || "Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
});