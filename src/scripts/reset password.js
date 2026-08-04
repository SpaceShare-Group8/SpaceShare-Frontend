const form = document.getElementById("resetPasswordForm");
const newPassword = document.getElementById("newPassword");
const confirmPassword = document.getElementById("confirmPassword");
const passwordError = document.getElementById("password-error");
const toggleNewPassword = document.getElementById("toggleNewPassword");
const toggleConfirmPassword = document.getElementById("toggleConfirmPassword");

// show/hide new passwowrd
toggleNewPassword.addEventListener("click", () => {
    if (newPassword.type === "password") {
        newPassword.type = "text";
        toggleNewPassword.classList.remove("ph-eye");
        toggleNewPassword.classList.add("ph-eye-slash");
    }else {
        newPassword.type = "password";
        toggleNewPassword.classList.remove("ph-eye-slash");
        toggleNewPassword.classList.add("ph-eye");
    }
});

// show/hide confirm password
toggleConfirmPassword.addEventListener("click", () => {
    if (confirmPassword.type === "password") {
        confirmPassword.type = "text";
        toggleConfirmPassword.classList.remove("ph-eye");
        toggleConfirmPassword.classList.add("ph-eye-slash");
    }else {
        confirmPassword.type = "password";
        toggleConfirmPassword.classList.remove("ph-eye-slash");
        toggleConfirmPassword.classList.add("ph-eye");
    }
});

// form validation
form.addEventListener("submit", function(event){
    event.preventDefault();
    passwordError.style.display = "none";
    const password = newPassword.value.trim();
    const confirm = confirmPassword.value.trim();

    // empty fields
    if(password === "| confirm === "){
        passwordError.textContent = "Please fill in all fields.";
        passwordError.style.display = "block";
        return;
    }

    // check length
    if(password.length !== 6){
        passwordError.textContent = "Password must be exactly 6 characters.";
        passwordError.style.display = "block";
        return;
    }

    // check match
    if(password !== confirm){
        passwordError.textContent = "Password do not match";
        passwordError.style.display = "block";
        return;
    }

    // success
    window.location.href = "password success.html"
})