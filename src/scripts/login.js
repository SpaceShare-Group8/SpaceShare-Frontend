import { BASE_URL } from "../api/config.js";

const loginForm = document.getElementById("loginForm");
const email = document.getElementById("email");
const password = document.getElementById("password");
const loginError = document.getElementById("password-error");
const togglePassword = document.getElementById("togglePassword");

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Hide any previous error
    loginError.style.display = "none";
    loginError.textContent = "";

    try {
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email.value.trim(),
                password: password.value.trim()
            })
        });

        const data = await response.json();

        console.log("Response:", data);

        if (response.ok) {

            // Save token if returned by the backend
            if (data.token) {
                localStorage.setItem("token", data.token);
            }

            alert("Login Successful!");

            // Redirect after successful login
            window.location.href = "home.html";

        } else {

            loginError.style.display = "block";
            loginError.textContent =
                data.message || "Incorrect email or password.";

        }

    } catch (error) {

        console.error("Login Error:", error);

        loginError.style.display = "block";
        loginError.textContent =
            "Unable to connect to the server. Please try again.";

    }
});


togglePassword.addEventListener("click", () => {

    if (password.type === "password") {

        password.type = "text";

        togglePassword.classList.remove("ph-eye");

        togglePassword.classList.add("ph-eye-slash");

    } else {

        password.type = "password";

        togglePassword.classList.remove("ph-eye-slash");

        togglePassword.classList.add("ph-eye");

    }

});
