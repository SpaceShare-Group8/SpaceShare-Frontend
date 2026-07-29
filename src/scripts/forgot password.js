const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const email = document.getElementById("email");
const emailError = document.getElementById("email-error");

forgotPasswordForm.addEventListener("submit", function(event){
    event.preventDefault();

    // hidden previous error
    emailError.style.display = "none";
    const emailValue = email.value.trim();

    // check if the field is empty
    if(emailValue === ""){
        emailError.style.display = "block";
        return;
    }

    // validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(emailValue)) {
        emailError.textContent = "Invalid email, please input a registered email.";
        emailError.style.display = "block";
        return;
    }

    // success
    window.location.href = "otp.html";
});

