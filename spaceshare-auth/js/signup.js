// Handles form submission and dynamic validation for 1-signup.html

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signup-form");
  const errorEl = document.getElementById("form-error");
  const submitBtn = document.getElementById("signup-btn");

  // These are the fields that must all be filled (plus the checkbox ticked)
  // before the button switches from disabled/grey to enabled/blue —
  // matching the two "Sign up" states in the Figma design.
  const nameInput = document.getElementById("full-name");
  const emailInput = document.getElementById("email");
  // ADDED: Track phone input state per PRD Section 11.1 & 14
  const phoneInput = document.getElementById("phone");
  const passwordInput = document.getElementById("password");
  const confirmInput = document.getElementById("confirm-password");
  const termsInput = document.getElementById("terms");

  function updateButtonState() {
    const allFilled =
      nameInput.value.trim() &&
      emailInput.value.trim() &&
      phoneInput.value.trim() && // ADDED: Phone validation check
      passwordInput.value &&
      confirmInput.value &&
      termsInput.checked;

    submitBtn.disabled = !allFilled;
  }

  [nameInput, emailInput, phoneInput, passwordInput, confirmInput, termsInput].forEach((field) => {
    field.addEventListener("input", updateButtonState);
    field.addEventListener("change", updateButtonState);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim(); // ADDED: Extract phone value
    const password = passwordInput.value;
    const confirmPassword = confirmInput.value;

    errorEl.classList.remove("visible");

    if (password !== confirmPassword) {
      errorEl.textContent = "Passwords don't match.";
      errorEl.classList.add("visible");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Signing up...";

    try {
      // UPDATED: Included phone parameter in payload per PRD Section 11.1 & 14
      await registerUser({ name, email, phone, password });

      // Backend confirmed OTP isn't part of the registration flow for now,
      // so we log the user in immediately after registering, same as the
      // register -> login -> me flow they documented.
      await loginUser({ email, password });
      await getCurrentUserProfile();

      // UPDATED: Pointing to role selection screen to persist selection to backend per PRD
      window.location.href = "3-role-selection.html";
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.add("visible");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign Up";
    }
  });
});
