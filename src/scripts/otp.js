const otpInputs = document.querySelectorAll(".otp-input");
const otpForm = document.getElementById("otpForm");
const countdown = document.getElementById("countdown");
const resendLink = document.getElementById("resendLink");

// auto move to next input
otpInputs.forEach((input, index) =>{
    input.addEventListener("input", () =>{
        input.value = input.value.replace(/[^0-9]/g, "");
        if(input.value !== "" && index < otpInputs.length -1){
            otpInputs[index + 1].focus();
        }
    });
    
    input.addEventListener("keydown",(e) =>{
        if(e.key === "Backspace" &&
            input.value === "" &&
            index > 0){
            otpInputs[index - 1].focus();
        }
            
    });
});

// countdown timer
let timeLeft = 45;
const timer = setInterval(() =>{
    timeLeft--;
    countdown.textContent = timeLeft;
    if (timeLeft <= 0){
        clearInterval(timer);
        countdown.textContent = "0";
        resendLink.style.pointerEvents = "auto";
        resendLink.style.opacity = "1"
    }
}, 1000);

// disable resend initially
resendLink.style.pointerEvents = "none";
resendLink.style.opacity = "0.5";

// verify button
otpForm.addEventListener("submit", function(event){
    event.preventDefault();
    let otp = "";
    otpInputs.forEach(input =>{
        otp += input.value;
    });
    if(otp.length !== 6){
        alert("Please enter the complete OTP.");
        return;
    }
    alert("OTP Verified Successfully!");

    // ridirect to reset password page
    window.location.href = "reset password.html";
})