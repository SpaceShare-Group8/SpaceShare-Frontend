// API calls for the sign up flow.
// Dynamic API base URL: defaults to local backend on port 5000 during development, falls back to Render in production.
const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:5000"
  : "https://spaceshare-backend-cor9.onrender.com";

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

// POST /api/auth/register — includes required phone field per PRD Section 11.1 & 14
function registerUser({ name, email, phone, password, role = "seeker" }) {
  return apiRequest("/api/auth/register", {
    method: "POST",
    body: { name, email, phone, password, role }
  });
}

// POST /api/auth/login — called right after register succeeds
async function loginUser({ email, password }) {
  const data = await apiRequest("/api/auth/login", {
    method: "POST",
    body: { email, password }
  });
  
  // Extract token handling both direct and nested response structures
  const token = data?.accessToken || data?.data?.accessToken;
  if (token) {
    localStorage.setItem("spaceshare_token", token);
  }
  return data;
}

// GET /api/auth/me — confirm session and retrieve profile details
function getCurrentUserProfile() {
  return apiRequest("/api/auth/me", { auth: true });
}

// PATCH /api/auth/me — persists role selection (seeker/host) to backend
function updateUserRole(role) {
  return apiRequest("/api/auth/me", {
    method: "PATCH",
    auth: true,
    body: { role }
  });
}
