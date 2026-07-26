// API calls for the sign up flow.
// Set this to your real backend URL once you have it (same as the rest of Space-Share).
const API_BASE_URL = "https://spaceshare-backend-cor9.onrender.com";

async function apiRequest(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = localStorage.getItem("spaceshare_token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    // no JSON body, fine for some responses
  }

  if (!response.ok) {
    throw new Error((data && data.message) || `Request failed with status ${response.status}`);
  }
  return data;
}

// POST /api/auth/register — real endpoint, section 15.1.
function registerUser({ name, email, password, role = "seeker" }) {
  return apiRequest("/api/auth/register", {
    method: "POST",
    body: { name, email, password, role }
  });
}

// POST /api/auth/login — real endpoint, section 15.1. Called right after

async function loginUser({ email, password }) {
  const data = await apiRequest("/api/auth/login", {
    method: "POST",
    body: { email, password }
  });
  if (data && data.accessToken) {
    localStorage.setItem("spaceshare_token", data.accessToken);
  }
  return data;
}

// GET /api/auth/me — real endpoint, section 15.1. Called after login to
// confirm the session and get the logged-in user's profile/role.
function getCurrentUserProfile() {
  return apiRequest("/api/auth/me", { auth: true });
}
