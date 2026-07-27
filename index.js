document.addEventListener("DOMContentLoaded", () => {
    const slides = document.querySelectorAll(".slide");
    const dots = document.querySelectorAll(".dot");
    const slideBadge = document.getElementById("slideBadge");
    const slideTitle = document.getElementById("slideTitle");
    const slideSubtitle = document.getElementById("slideSubtitle");

    // Slide content configuration matching your Figma screens
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
            badge: "CONNECT & COLLABORATE",
            title: "Host, Share and Earn",
            subtitle: "List your underutilized space or discover stunning locations curated just for you."
        }
    ];

    let currentSlide = 0;
    const intervalTime = 5000; // Time per slide in milliseconds (5s)
    let slideInterval;

    function updateSlide(index) {
        // Remove active class from all slides & dots
        slides.forEach(slide => slide.classList.remove("active"));
        dots.forEach(dot => dot.classList.remove("active"));

        // Activate target slide and dot
        slides[index].classList.add("active");
        dots[index].classList.add("active");

        // Update text content smoothly
        slideBadge.textContent = slideData[index].badge;
        slideTitle.textContent = slideData[index].title;
        slideSubtitle.textContent = slideData[index].subtitle;

        currentSlide = index;
    }

    function nextSlide() {
        let nextIndex = (currentSlide + 1) % slides.length;
        updateSlide(nextIndex);
    }

    // Start automatic sliding timer
    function startSlider() {
        slideInterval = setInterval(nextSlide, intervalTime);
    }

    // Allow manual click on pagination dots
    dots.forEach((dot, index) => {
        dot.addEventListener("click", () => {
            clearInterval(slideInterval); // Reset timer on manual click
            updateSlide(index);
            startSlider();
        });
    });

    // Initialize auto-play
    startSlider();
});
