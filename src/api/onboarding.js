// src/api/onboarding.js
//
// API client for the onboarding / role-selection step.
//
// NOTE ON THE ENDPOINT: PRD §16.1 ("Authentication") only documents
// /api/auth/register, /login, /refresh and /me — there's no endpoint yet
// for "set role / home screen preference" on an already-registered user.
// This assumes a PATCH /api/users/me/role endpoint (consistent with the
// Users table's `roles[]` field in §6). Confirm the exact path/shape with
// Backend before merging — per the README, everything else in the app can
// keep using submitUserRole() unchanged once the real call is swapped in.

const API_BASE_URL =
  (typeof window !== "undefined" && window.__ENV__ && window.__ENV__.API_BASE_URL) ||
  "http://localhost:4000";

const USE_MOCK = true; // flip to false once the backend endpoint is live

/**
 * Persist the user's chosen role / home screen preference.
 * @param {"seeker"|"host"} role
 * @returns {Promise<{ success: boolean, role: string }>}
 */
export async function submitUserRole(role) {
  if (!["seeker", "host"].includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }

  if (USE_MOCK) {
    return mockSubmitUserRole(role);
  }

  const response = await fetch(`${API_BASE_URL}/api/users/me/role`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

function mockSubmitUserRole(role) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, role });
    }, 400);
  });
}

function getAccessToken() {
  // Placeholder until the real auth/session module lands in src/api/auth.js
  return localStorage.getItem("accessToken") || "";
}
