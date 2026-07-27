import { API_BASE_URL } from './api/config.js';

document.addEventListener("DOMContentLoaded", () => {
    // Optional: Log connection availability using your backend configuration
    console.log("Connecting SpaceShare backend to:", API_BASE_URL);

    const slides = document.querySelectorAll(".slide");
    const dots = document.querySelectorAll(".dot");
    const slideBadge = document.getElementById("slideBadge");
    const slideTitle = document.getElementById("slideTitle");
    const slideSubtitle = document.getElementById("slideSubtitle");

    const slideData = [
        {
            badge: "FIND YOUR SPACE",
            title: "SpaceShare puts inspiring workspaces at your finger tips",
            subtitle: "Browse, book and unlock unique spaces tailored to your vibe, anywhere and anytime."
        },
        {
            badge: "CONNECT & COLLABORATE",
            title: "Spaces that inspires collaboration",
            subtitle: "Access premium rooms and co-working spaces designed to fuel team productivity."
        },
        {
            badge: "HOST, SHARE & EARN",
            title: "Host, Share and Earn",
            subtitle: "List your underutilized space or discover stunning locations curated just for you."
        }
    ];

    let currentSlide = 0;
    const intervalTime = 5000;
    let slideInterval;

    function updateSlide(index) {
        // Guard against out-of-bound indices
        if (index < 0 || index >= slides.length) return;

        slides.forEach(slide => slide.classList.remove("active"));
        dots.forEach(dot => dot.classList.remove("active"));

        slides[index].classList.add("active");
        dots[index].classList.add("active");

        slideBadge.textContent = slideData[index].badge;
        slideTitle.textContent = slideData[index].title;
        slideSubtitle.textContent = slideData[index].subtitle;

        currentSlide = index;
    }

    function nextSlide() {
        let nextIndex = (currentSlide + 1) % slides.length;
        updateSlide(nextIndex);
    }

    function startSlider() {
        // Clear any existing intervals to prevent overlapping timers
        clearInterval(slideInterval);
        slideInterval = setInterval(nextSlide, intervalTime);
    }

    // Interactive dot navigation with smooth timer reset on user action
    dots.forEach((dot, index) => {
        dot.addEventListener("click", () => {
            if (currentSlide === index) return;
            updateSlide(index);
            startSlider(); // Restart the auto-slide clock after user interaction
        });
    });

    // Pause auto-sliding on hover for enhanced user experience and readability
    const heroSliderContainer = document.querySelector(".page-container");
    if (heroSliderContainer) {
        heroSliderContainer.addEventListener("mouseenter", () => {
            clearInterval(slideInterval);
        });

        heroSliderContainer.addEventListener("mouseleave", () => {
            startSlider();
        });
    }

    // Initialize the slider loop
    startSlider();
});