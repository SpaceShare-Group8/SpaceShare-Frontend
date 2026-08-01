/* ================================================================
   SPACESHARE — ONBOARDING SLIDER
   Pixel-perfect interactive experience
   Figma: FILE-1-Core-Seeker-Flow
   ================================================================
   
   FEATURES:
   ✅ Smooth slide transitions with Ken Burns zoom
   ✅ Autoplay with progress bar dots
   ✅ Touch swipe support (mobile)
   ✅ Keyboard navigation (desktop)
   ✅ Mouse wheel support (desktop)
   ✅ Final CTA changes on last slide
   ✅ Pause on tab visibility change
   ✅ Accessibility ready
   ✅ Reduced motion support
   ================================================================ */

(function () {
    'use strict';

    // ================================================================
    // CONFIGURATION
    // ================================================================

    const CONFIG = {
        SLIDE_DURATION: 6000,        // milliseconds per slide
        SWIPE_THRESHOLD: 50,          // pixels to trigger swipe
        TRANSITION_DURATION: 1200,    // milliseconds for slide transition
        KEYBOARD_DEBOUNCE: 300,       // milliseconds between keyboard events
        WHEEL_DEBOUNCE: 1000,         // milliseconds between wheel events
    };

    // ================================================================
    // SLIDE CONTENT — Matches Figma design exactly
    // ================================================================

    const SLIDES_DATA = [
        {
            badge: 'FIND YOUR SPACE',
            title: 'SpaceShare puts inspiring workspaces at your fingertips',
            subtitle: 'Browse, book and unlock unique spaces tailored to your vibe, anywhere and anytime.',
            cta: 'Get Started',
            ctaLink: 'src/pages/signup.html'
        },
        {
            badge: 'CONNECT & COLLABORATE',
            title: 'Spaces that inspire collaboration',
            subtitle: 'Access premium rooms and co-working spaces designed to fuel team productivity.',
            cta: 'Get Started',
            ctaLink: 'src/pages/signup.html'
        },
        {
            badge: 'HOST & EARN',
            title: 'Host, Share and Earn',
            subtitle: 'List your underutilized space or discover stunning locations curated just for you.',
            cta: 'Get Started →',
            ctaLink: 'src/pages/role_main_selection.html',
            isFinal: true
        }
    ];

    // ================================================================
    // DOM REFS
    // ================================================================

    const DOM = {
        slides: document.querySelectorAll('.hero-slider .slide'),
        dots: document.querySelectorAll('.pagination-dots .dot'),
        badge: document.getElementById('slideBadge'),
        title: document.getElementById('slideTitle'),
        subtitle: document.getElementById('slideSubtitle'),
        mainCta: document.getElementById('mainCta'),
        signInBtn: document.getElementById('signInBtn'),
        slider: document.getElementById('heroSlider'),
    };

    // ================================================================
    // STATE
    // ================================================================

    let state = {
        currentIndex: 0,
        totalSlides: DOM.slides.length,
        isAnimating: false,
        isAutoplay: true,
        timer: null,
        touchStartX: 0,
        touchStartY: 0,
        touchEndX: 0,
        touchEndY: 0,
        isDragging: false,
        lastKeyPress: 0,
        lastWheelTime: 0,
    };

    // ================================================================
    // CORE FUNCTIONS
    // ================================================================

    /**
     * Get slide data by index
     */
    function getSlideData(index) {
        return SLIDES_DATA[index] || SLIDES_DATA[0];
    }

    /**
     * Navigate to a specific slide
     */
    function goToSlide(index, skipAnimation = false) {
        // Prevent rapid navigation
        if (state.isAnimating && !skipAnimation) return;

        // Clamp index
        const total = state.totalSlides;
        const targetIndex = ((index % total) + total) % total;

        // Don't navigate if already on this slide
        if (targetIndex === state.currentIndex && !skipAnimation) return;

        // Start animation lock
        if (!skipAnimation) {
            state.isAnimating = true;
        }

        // Update state
        const prevIndex = state.currentIndex;
        state.currentIndex = targetIndex;

        // --- Update Slides ---
        DOM.slides.forEach((slide, i) => {
            const isActive = i === targetIndex;
            slide.classList.toggle('active', isActive);
            
            // Reset animation for better performance
            if (isActive) {
                const image = slide.querySelector('.slide-image');
                if (image) {
                    // Reset animation by removing and re-adding
                    image.style.animation = 'none';
                    // Force reflow
                    void image.offsetWidth;
                    image.style.animation = '';
                }
            }
        });

        // --- Update Dots ---
        DOM.dots.forEach((dot, i) => {
            const isActive = i === targetIndex;
            dot.classList.toggle('active', isActive);
            dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
            
            // Restart dot fill animation
            if (isActive) {
                const fill = dot.querySelector('.dot-fill');
                if (fill) {
                    fill.style.animation = 'none';
                    void fill.offsetWidth;
                    fill.style.animation = '';
                }
            }
        });

        // --- Update Text Content ---
        updateText(targetIndex);

        // --- Update CTA Button ---
        updateCta(targetIndex);

        // --- Update Sign In Button ---
        updateSignIn(targetIndex);

        // --- Update Badge ---
        updateBadge(targetIndex);

        // --- Log for debugging ---
        console.log(`📋 Slide ${targetIndex + 1}/${state.totalSlides}: "${SLIDES_DATA[targetIndex].title}"`);

        // Release animation lock after transition
        if (!skipAnimation) {
            setTimeout(() => {
                state.isAnimating = false;
            }, CONFIG.TRANSITION_DURATION + 100);
        }
    }

    /**
     * Update text content with smooth fade
     */
    function updateText(index) {
        const data = getSlideData(index);
        if (!data) return;

        // Fade out
        const elements = [DOM.badge, DOM.title, DOM.subtitle];
        elements.forEach(el => {
            if (el) {
                el.style.opacity = '0';
                el.style.transform = 'translateY(8px)';
            }
        });

        // Update content after short delay
        setTimeout(() => {
            if (DOM.badge) DOM.badge.textContent = data.badge;
            if (DOM.title) DOM.title.textContent = data.title;
            if (DOM.subtitle) DOM.subtitle.textContent = data.subtitle;

            // Fade in
            elements.forEach((el, i) => {
                if (el) {
                    setTimeout(() => {
                        el.style.transition = 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                        el.style.opacity = '1';
                        el.style.transform = 'translateY(0)';
                    }, i * 80); // Staggered animation
                }
            });
        }, 200);
    }

    /**
     * Update CTA button based on slide
     */
    function updateCta(index) {
        const data = getSlideData(index);
        if (!DOM.mainCta) return;

        const isFinal = data.isFinal || false;

        // Update text
        DOM.mainCta.textContent = data.cta || 'Get Started';
        
        // Update link
        DOM.mainCta.href = data.ctaLink || 'src/pages/signup.html';

        // Update class for final CTA
        if (isFinal) {
            DOM.mainCta.classList.add('final-cta');
            DOM.mainCta.classList.remove('btn-primary');
            DOM.mainCta.classList.add('btn-primary');
        } else {
            DOM.mainCta.classList.remove('final-cta');
        }

        // Add smooth transition
        DOM.mainCta.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }

    /**
     * Update Sign In button (subtle changes on final slide)
     */
    function updateSignIn(index) {
        const data = getSlideData(index);
        if (!DOM.signInBtn) return;

        // You can add subtle changes here if needed
        // For now, keep it consistent
    }

    /**
     * Update badge with animation
     */
    function updateBadge(index) {
        // Already handled in updateText
    }

    /**
     * Go to next slide
     */
    function nextSlide() {
        if (state.isAnimating) return;
        goToSlide(state.currentIndex + 1);
        resetAutoplay();
    }

    /**
     * Go to previous slide
     */
    function previousSlide() {
        if (state.isAnimating) return;
        goToSlide(state.currentIndex - 1);
        resetAutoplay();
    }

    // ================================================================
    // AUTOPLAY
    // ================================================================

    /**
     * Start autoplay timer
     */
    function startAutoplay() {
        stopAutoplay();
        if (!state.isAutoplay) return;
        
        state.timer = setInterval(() => {
            if (!state.isAnimating) {
                nextSlide();
            }
        }, CONFIG.SLIDE_DURATION);
    }

    /**
     * Stop autoplay timer
     */
    function stopAutoplay() {
        if (state.timer) {
            clearInterval(state.timer);
            state.timer = null;
        }
    }

    /**
     * Reset autoplay (stop and restart)
     */
    function resetAutoplay() {
        if (state.isAutoplay) {
            startAutoplay();
        }
    }

    /**
     * Toggle autoplay on/off
     */
    function toggleAutoplay() {
        state.isAutoplay = !state.isAutoplay;
        if (state.isAutoplay) {
            startAutoplay();
        } else {
            stopAutoplay();
        }
        return state.isAutoplay;
    }

    // ================================================================
    // TOUCH / SWIPE HANDLING
    // ================================================================

    /**
     * Handle touch start
     */
    function handleTouchStart(e) {
        const touch = e.touches[0];
        state.touchStartX = touch.screenX;
        state.touchStartY = touch.screenY;
        state.isDragging = true;
        
        // Pause autoplay while interacting
        stopAutoplay();
    }

    /**
     * Handle touch move
     */
    function handleTouchMove(e) {
        if (!state.isDragging) return;
        
        const touch = e.touches[0];
        state.touchEndX = touch.screenX;
        state.touchEndY = touch.screenY;
        
        // Optional: Add visual feedback for drag
    }

    /**
     * Handle touch end
     */
    function handleTouchEnd(e) {
        if (!state.isDragging) return;
        state.isDragging = false;

        const diffX = state.touchStartX - state.touchEndX;
        const diffY = state.touchStartY - state.touchEndY;

        // Only handle horizontal swipes
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > CONFIG.SWIPE_THRESHOLD) {
            if (diffX > 0) {
                nextSlide();
            } else {
                previousSlide();
            }
        }

        // Resume autoplay after interaction
        resetAutoplay();
    }

    // ================================================================
    // KEYBOARD NAVIGATION
    // ================================================================

    /**
     * Handle keyboard events
     */
    function handleKeydown(e) {
        const now = Date.now();
        if (now - state.lastKeyPress < CONFIG.KEYBOARD_DEBOUNCE) return;
        state.lastKeyPress = now;

        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                stopAutoplay();
                nextSlide();
                resetAutoplay();
                break;
                
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                stopAutoplay();
                previousSlide();
                resetAutoplay();
                break;
                
            case 'Home':
                e.preventDefault();
                stopAutoplay();
                goToSlide(0);
                resetAutoplay();
                break;
                
            case 'End':
                e.preventDefault();
                stopAutoplay();
                goToSlide(state.totalSlides - 1);
                resetAutoplay();
                break;
                
            case ' ':
                e.preventDefault();
                const isPlaying = toggleAutoplay();
                console.log(`⏸️ Autoplay ${isPlaying ? 'resumed' : 'paused'}`);
                break;
        }
    }

    // ================================================================
    // MOUSE WHEEL SUPPORT
    // ================================================================

    /**
     * Handle mouse wheel events (desktop only)
     */
    function handleWheel(e) {
        // Only on desktop
        if (window.innerWidth < 768) return;
        
        const now = Date.now();
        if (now - state.lastWheelTime < CONFIG.WHEEL_DEBOUNCE) return;
        state.lastWheelTime = now;

        // Determine direction
        const delta = Math.sign(e.deltaY);
        
        if (delta > 0) {
            stopAutoplay();
            nextSlide();
            resetAutoplay();
        } else if (delta < 0) {
            stopAutoplay();
            previousSlide();
            resetAutoplay();
        }
    }

    // ================================================================
    // TAB VISIBILITY
    // ================================================================

    /**
     * Handle tab visibility change
     */
    function handleVisibilityChange() {
        if (document.hidden) {
            // Tab hidden → pause autoplay
            stopAutoplay();
        } else {
            // Tab visible → resume autoplay
            if (state.isAutoplay) {
                startAutoplay();
            }
        }
    }

    // ================================================================
    // RESPONSIVE HANDLING
    // ================================================================

    /**
     * Handle resize events
     */
    function handleResize() {
        // No specific resize logic needed, but keep for future enhancements
        // Could adjust dot positions or text sizing if needed
    }

    // ================================================================
    // ACCESSIBILITY
    // ================================================================

    /**
     * Announce slide change to screen readers
     */
    function announceSlide(index) {
        const data = getSlideData(index);
        const announcement = `Slide ${index + 1} of ${state.totalSlides}: ${data.title}`;
        
        // Create or update live region
        let announcer = document.getElementById('slide-announcer');
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'slide-announcer';
            announcer.setAttribute('aria-live', 'polite');
            announcer.setAttribute('aria-atomic', 'true');
            announcer.style.position = 'absolute';
            announcer.style.width = '1px';
            announcer.style.height = '1px';
            announcer.style.padding = '0';
            announcer.style.margin = '-1px';
            announcer.style.overflow = 'hidden';
            announcer.style.clip = 'rect(0, 0, 0, 0)';
            announcer.style.border = '0';
            document.body.appendChild(announcer);
        }
        
        announcer.textContent = announcement;
    }

    // ================================================================
    // EVENT LISTENERS
    // ================================================================

    /**
     * Initialize all event listeners
     */
    function initEventListeners() {
        // --- Dot clicks ---
        DOM.dots.forEach((dot, i) => {
            dot.addEventListener('click', () => {
                if (state.isAnimating) return;
                stopAutoplay();
                goToSlide(i);
                resetAutoplay();
            });
            
            // Keyboard support for dots
            dot.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (state.isAnimating) return;
                    stopAutoplay();
                    goToSlide(i);
                    resetAutoplay();
                }
            });
        });

        // --- Touch events ---
        const slider = DOM.slider || document;
        slider.addEventListener('touchstart', handleTouchStart, { passive: true });
        slider.addEventListener('touchmove', handleTouchMove, { passive: true });
        slider.addEventListener('touchend', handleTouchEnd, { passive: true });

        // --- Keyboard ---
        document.addEventListener('keydown', handleKeydown);

        // --- Mouse wheel ---
        document.addEventListener('wheel', handleWheel, { passive: true });

        // --- Tab visibility ---
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // --- Resize ---
        window.addEventListener('resize', handleResize);

        // --- CTA click (prevent interference) ---
        if (DOM.mainCta) {
            DOM.mainCta.addEventListener('click', (e) => {
                e.stopPropagation();
                // Allow navigation to proceed
            });
        }

        // --- Sign in click ---
        if (DOM.signInBtn) {
            DOM.signInBtn.addEventListener('click', (e) => {
                // Allow navigation to proceed
            });
        }

        console.log('🎯 Event listeners initialized');
    }

    // ================================================================
    // INITIALIZATION
    // ================================================================

    /**
     * Initialize the onboarding slider
     */
    function init() {
        console.log('🚀 SpaceShare — Onboarding Slider initializing...');
        console.log(`📋 ${state.totalSlides} slides loaded`);

        // Validate DOM elements
        if (DOM.slides.length === 0) {
            console.error('❌ No slides found! Check your HTML.');
            return;
        }

        // Set initial state
        goToSlide(0, true);

        // Initialize event listeners
        initEventListeners();

        // Start autoplay
        startAutoplay();

        // Announce initial slide
        setTimeout(() => {
            announceSlide(0);
        }, 1000);

        console.log('✅ Onboarding ready!');
        console.log('⌨️  Keyboard controls: Arrow keys, Home, End, Space (pause/play)');
        console.log('🖱️  Swipe or click dots to navigate');
        console.log('📱  Touch friendly');
    }

    // ================================================================
    // PUBLIC API (for debugging & testing)
    // ================================================================

    const PublicAPI = {
        // Navigation
        goToSlide,
        nextSlide,
        previousSlide,
        
        // Autoplay
        startAutoplay,
        stopAutoplay,
        toggleAutoplay,
        isAutoplay: () => state.isAutoplay,
        
        // State
        getCurrentIndex: () => state.currentIndex,
        getTotalSlides: () => state.totalSlides,
        getSlideData: (index) => getSlideData(index),
        
        // Debug
        debug: () => {
            console.log('🔍 Onboarding Debug:');
            console.log(`  Current: ${state.currentIndex + 1}/${state.totalSlides}`);
            console.log(`  Autoplay: ${state.isAutoplay ? '▶️ Running' : '⏸️ Paused'}`);
            console.log(`  Animating: ${state.isAnimating}`);
            console.log(`  Data:`, getSlideData(state.currentIndex));
        }
    };

    // Expose for debugging in dev tools
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.__onboarding = PublicAPI;
        console.log('💻 Debug: window.__onboarding available');
    }

    // ================================================================
    // START
    // ================================================================

    // Wait for DOM to be fully ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();