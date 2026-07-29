const loginForm = document.getElementById("loginForm");
const email = document.getElementById("email");
const password = document.getElementById("password");
const error = document.getElementById("password-error");

loginForm.addEventListener("submit",function (event){
    event.preventDefault();
    // hidden previous error
    error.style.display = "none";
    // check if any field is empty
    if(email.value.trim() === ""|| password.value.trim()=== ""){
        alert("Please fill in all fields.");
        return;
    }
    // temporary password for testing
    const correctPassword = "123456";
    if (password.value !== correctPassword){
        error.style.display = "block";
        return;
    }
    // successful login
    alert("Login successful");
    // redirect to the home page
    window.location.href = "Splash screen1.html"
});


