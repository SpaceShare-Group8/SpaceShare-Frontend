// src/api/auth.js
//
// Talks to the live SpaceShare backend for registration and login.
//
// Base URL and paths confirmed directly against the backend's own code
// (SpaceShare-Backend repo):
//   - src/auth/auth.routes.js       -> the real endpoint paths
//   - src/auth/auth.validation.js   -> the real required/optional fields
//
// Deployed backend: https://spaceshare-backend-cor9.onrender.com

const API_BASE_URL = "https://spaceshare-backend-cor9.onrender.com";

/**
 * Register a new Seeker or Host.
 * Matches POST /api/auth/register (see auth.validation.js):
 *   - full_name: required, 3-150 chars
 *   - email OR phone: at least one required
 *   - password: required, min 8 chars
 *   - role: optional, "seeker" or "host"
 *
 * @param {Object} payload
 * @param {string} payload.full_name
 * @param {string} [payload.email]
 * @param {string} [payload.phone]
 * @param {string} payload.password
 * @param {"seeker"|"host"} [payload.role]
 */
export async function register(payload) {
  return request("/api/auth/register", payload);
}

/**
 * Log in with email or phone + password.
 * Matches POST /api/auth/login.
 *
 * @param {Object} payload
 * @param {string} [payload.email]
 * @param {string} [payload.phone]
 * @param {string} payload.password
 */
export async function login(payload) {
  return request("/api/auth/login", payload);
}

/**
 * Exchange a refresh token for a new access token.
 * Matches POST /api/auth/refresh.
 *
 * @param {string} refreshToken
 */
export async function refresh(refreshToken) {
  return request("/api/auth/refresh", { refreshToken });
}

/**
 * Get the currently authenticated user.
 * Matches GET /api/auth/me (requires a valid access token).
 *
 * @param {string} accessToken
 */
export async function getCurrentUser(accessToken) {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}

async function request(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // The backend's validation errors come back as { success, message, errors: [...] }
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}
