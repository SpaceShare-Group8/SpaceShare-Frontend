// src/scripts/role_main_selection.js
// Wires up src/pages/role_main_selection.html: tracks which role card is
// selected, enables Continue once one is picked, and submits the choice
// via the API client in src/api/onboarding.js.

import { submitUserRole } from "../api/onboarding.js";

const roleInputs = Array.from(document.querySelectorAll('.role_selection_middle input[type="radio"]'));
const continueBtn = document.getElementById("roleContinueBtn");
const errorEl = document.getElementById("roleError");
const backBtn = document.querySelector(".btn_back button");

function getSelectedRole() {
  const checked = roleInputs.find((input) => input.checked);
  return checked ? checked.value : null;
}

function updateContinueState() {
  continueBtn.disabled = !getSelectedRole();
}

roleInputs.forEach((input) => {
  input.addEventListener("change", () => {
    updateContinueState();
    hideError();
  });
});

updateContinueState();

backBtn?.addEventListener("click", () => {
  window.history.back();
});

continueBtn.addEventListener("click", async () => {
  const role = getSelectedRole();
  if (!role) return;

  setLoading(true);
  hideError();

  try {
    await submitUserRole(role);

    // "this just sets your home screen" - remember it locally so the
    // rest of the app can route to the right home screen next launch
    localStorage.setItem("homeScreen", role);

    const nextPage = role === "host" ? "host-home.html" : "search.html";
    window.location.href = nextPage;
  } catch (err) {
    showError("Something went wrong saving that - please try again.");
    console.error("submitUserRole failed:", err);
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading) {
  continueBtn.disabled = isLoading || !getSelectedRole();
  continueBtn.textContent = isLoading ? "Continue…" : "Continue";
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function hideError() {
  errorEl.hidden = true;
}
