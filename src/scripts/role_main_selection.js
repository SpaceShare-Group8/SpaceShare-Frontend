// src/scripts/role_main_selection.js
// Wires up src/pages/role_main_selection.html: tracks which role card is
// selected, enables Continue once one is picked, and remembers the choice.
//
// This screen does NOT call the API - confirmed with Backend that `role`
// is a field on POST /api/auth/register itself, not a separate endpoint.
// See src/api/onboarding.js for where that saved value gets read back out.

import { saveSelectedRole } from "../api/onboarding.js";

const roleInputs = Array.from(document.querySelectorAll('.role_selection_middle input[type="radio"]'));
const continueBtn = document.getElementById("roleContinueBtn");
const backBtn = document.querySelector(".btn_back button");

function getSelectedRole() {
  const checked = roleInputs.find((input) => input.checked);
  return checked ? checked.value : null;
}

function updateContinueState() {
  continueBtn.disabled = !getSelectedRole();
}

roleInputs.forEach((input) => {
  input.addEventListener("change", updateContinueState);
});

updateContinueState();

backBtn?.addEventListener("click", () => {
  window.history.back();
});

continueBtn.addEventListener("click", () => {
  const role = getSelectedRole();
  if (!role) return;

  saveSelectedRole(role);

  // TODO: confirm the real next screen with the team - this should be
  // wherever registration (full name/email/phone/password) actually
  // happens, since that request is what needs to carry this saved role.
  window.location.href = "signup.html";
});
