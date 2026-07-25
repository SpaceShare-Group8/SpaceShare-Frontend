// src/api/onboarding.js
//
// Role selection storage for the "What brings you to SpaceShare?" screen.
//
// CONFIRMED with Backend (SpaceShare-Backend/src/auth/auth.validation.js,
// registerValidation): `role` is an optional field on POST /api/auth/register
// itself - there is no separate endpoint to set it afterward, and no
// users/ module exists yet for a PATCH /api/users/me/role call.
//
// So this screen does NOT call the API at all. It just remembers the
// choice locally. Whichever screen actually submits registration
// (full_name/email/phone/password) needs to read getSelectedRole() and
// include it in that request body, e.g.:
//
//   fetch(`${API_BASE_URL}/api/auth/register`, {
//     method: "POST",
//     body: JSON.stringify({ full_name, email, password, role: getSelectedRole() }),
//     ...
//   })

const STORAGE_KEY = "spaceshare:selectedRole";

/**
 * Save the user's chosen role so it can be included in the eventual
 * POST /api/auth/register call.
 * @param {"seeker"|"host"} role
 */
export function saveSelectedRole(role) {
  if (!["seeker", "host"].includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }
  localStorage.setItem(STORAGE_KEY, role);
}

/**
 * @returns {"seeker"|"host"|null}
 */
export function getSelectedRole() {
  return localStorage.getItem(STORAGE_KEY);
}
