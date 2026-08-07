// ================================================================
// SPACESHARE — ROLE SELECTION LOGIC
// Flow: Landing → Role Selection → Signup → OTP → Dashboard
// Fully aligns with API spec: POST /api/auth/register expects "role": "seeker" | "host"
// ================================================================

document.addEventListener("DOMContentLoaded", () => {
  // --- DOM ELEMENTS ---
  const form = document.getElementById("roleForm");
  const cards = document.querySelectorAll(".role-card");
  const continueBtn = document.getElementById("continueBtn");
  const backBtn = document.querySelector(".back-btn");
  const formAlert = document.getElementById("formAlert");

  // --- STATE ---
  let currentSelection = null; // 'seeker' or 'host' (matches API spec)
  let isSubmitting = false;

  // ================================================================
  // 1. SELECTION HANDLER
  // ================================================================
  function selectRole(role) {
    // Reset all cards
    cards.forEach((card) => {
      card.classList.remove("selected");
      card.setAttribute("aria-pressed", "false");
    });

    // Activate target card
    const targetCard = document.querySelector(`.role-card[data-role="${role}"]`);
    if (targetCard) {
      targetCard.classList.add("selected");
      targetCard.setAttribute("aria-pressed", "true");
      
      const radio = targetCard.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    }

    // Update state
    currentSelection = role;
    continueBtn.disabled = false;
    hideAlert();
    
    console.log(`✅ Role selected: ${role} (matches API spec)`);
  }

  // ================================================================
  // 2. UI HELPER FUNCTIONS
  // ================================================================
  function hideAlert() {
    if (formAlert) {
      formAlert.hidden = true;
      formAlert.textContent = "";
      formAlert.className = "alert-box";
    }
  }

  function showAlert(message, type = "error") {
    if (formAlert) {
      formAlert.textContent = message;
      formAlert.className = `alert-box alert-${type}`;
      formAlert.hidden = false;
    }
  }

  function setButtonLoading(isLoading) {
    if (isLoading) {
      continueBtn.disabled = true;
      continueBtn.textContent = "Processing...";
      continueBtn.classList.add("is-loading");
    } else {
      continueBtn.disabled = false;
      continueBtn.textContent = "Continue";
      continueBtn.classList.remove("is-loading");
    }
  }

  // ================================================================
  // 3. EVENT LISTENERS (Card Clicks)
  // ================================================================
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const role = card.dataset.role;
      if (role) selectRole(role);
    });

    // Keyboard support (Enter/Space)
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const role = card.dataset.role;
        if (role) selectRole(role);
      }
    });
  });

  // ================================================================
  // 4. NAVIGATION (Back Button)
  // ================================================================
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.history.back();
    });
  }

  // ================================================================
  // 5. FORM SUBMISSION — SAVE ROLE & REDIRECT TO SIGNUP
  // ================================================================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Prevent double-clicks
    if (isSubmitting) return;

    // Validation: Ensure a role is selected
    if (!currentSelection) {
      showAlert("Please select a role to continue.");
      return;
    }

    isSubmitting = true;
    setButtonLoading(true);

    // ------------------------------------------------------------
    // STEP 1: Save the selected role to localStorage
    // This will be used by signup.js in the API payload
    // API expects: "role": "seeker" or "role": "host"
    // ------------------------------------------------------------
    localStorage.setItem("spaceshare_selected_role", currentSelection);

    console.log(`✅ Role saved: ${currentSelection}`);
    console.log(`📌 API will receive: { "role": "${currentSelection}" }`);

    // ------------------------------------------------------------
    // STEP 2: Redirect to the signup page
    // ------------------------------------------------------------
    window.location.href = "signup.html";
  });

  // ================================================================
  // 6. PRE-SELECTION ON LOAD
  // ================================================================
  // If the user refreshes, check if they previously had a role saved
  const savedRole = localStorage.getItem("spaceshare_selected_role");
  if (savedRole && (savedRole === "seeker" || savedRole === "host")) {
    selectRole(savedRole);
  }

  console.log("🚀 Role Selection UI initialized and ready.");
  console.log("📌 API Spec: POST /api/auth/register expects 'role': 'seeker' | 'host'");
});