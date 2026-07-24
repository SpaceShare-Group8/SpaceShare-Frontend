// src/scripts/role-selection.js
import { submitUserRole } from "../api/onboarding.js";

const roleCards = Array.from(document.querySelectorAll(".role-card"));
const continueBtn = document.getElementById("continueBtn");
const backBtn = document.getElementById("backBtn");
const errorMessage = document.getElementById("errorMessage");

let selectedRole = null;

function selectRole(role) {
  selectedRole = role;

  roleCards.forEach((card) => {
    const isSelected = card.dataset.role === role;
    card.classList.toggle("selected", isSelected);
    card.setAttribute("aria-checked", String(isSelected));
  });

  continueBtn.disabled = false;
}

roleCards.forEach((card) => {
  card.addEventListener("click", () => selectRole(card.dataset.role));
});

// Basic keyboard support for the radiogroup pattern (arrow keys move selection)
document.querySelector(".role-options").addEventListener("keydown", (event) => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  event.preventDefault();
  const currentIndex = roleCards.findIndex((c) => c.dataset.role === selectedRole);
  const direction = event.key === "ArrowDown" ? 1 : -1;
  const nextIndex = (currentIndex + direction + roleCards.length) % roleCards.length;
  roleCards[nextIndex].focus();
  selectRole(roleCards[nextIndex].dataset.role);
});

backBtn.addEventListener("click", () => {
  window.history.back();
});

continueBtn.addEventListener("click", async () => {
  if (!selectedRole) return;

  setLoading(true);
  hideError();

  try {
    await submitUserRole(selectedRole);

    // "This just sets your home screen" — remember locally so the app
    // can route to the right home screen next launch.
    localStorage.setItem("homeScreen", selectedRole);

    const nextPage = selectedRole === "host" ? "../pages/host-home.html" : "../pages/search.html";
    window.location.href = nextPage;
  } catch (err) {
    showError("Something went wrong. Please try again.");
    console.error("submitUserRole failed:", err);
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading) {
  continueBtn.disabled = isLoading || !selectedRole;
  continueBtn.textContent = isLoading ? "Continue…" : "Continue";
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function hideError() {
  errorMessage.hidden = true;
}
