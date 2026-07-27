/* ============================================
   SpaceShare — Hero Slider
   Cycles background photo, badge, headline and
   subtitle together; dots double as a progress bar.
   ============================================ */

(function () {
  const SLIDE_DURATION = 6000; // must match --slide-duration in index.css

  // Copy for each slide, in the same order as the .slide elements in the DOM.
  const slidesContent = [
    {
      badge: 'FIND YOUR SPACE',
      title: 'SpaceShare puts inspiring workspaces at your fingertips',
      subtitle: 'Browse, book and unlock unique spaces tailored to your vibe, anywhere and anytime.'
    },
    {
      badge: 'CONNECT & COLLABORATE',
      title: 'Spaces that inspire collaboration',
      subtitle: 'Access premium rooms and co-working spaces designed to fuel team productivity.'
    },
    {
      badge: 'CONNECT & COLLABORATE',
      title: 'Host, Share and Earn',
      subtitle: 'List your underutilized space or discover stunning locations curated just for you.'
    }
  ];

  const slideEls = document.querySelectorAll('.hero-slider .slide');
  const dotEls = document.querySelectorAll('.pagination-dots .dot');
  const badgeEl = document.getElementById('slideBadge');
  const titleEl = document.getElementById('slideTitle');
  const subtitleEl = document.getElementById('slideSubtitle');

  let current = 0;
  let timer = null;

  function renderText(index) {
    const data = slidesContent[index];
    if (!data) return;
    badgeEl.textContent = data.badge;
    titleEl.textContent = data.title;
    subtitleEl.textContent = data.subtitle;
  }

  function restartDotFill(dot) {
    // Force the dot-fill animation to restart from 0 by briefly
    // removing and re-adding the "active" class.
    dot.classList.remove('active');
    // eslint-disable-next-line no-unused-expressions
    dot.offsetWidth; // force reflow
    dot.classList.add('active');
  }

  function goToSlide(index) {
    current = (index + slideEls.length) % slideEls.length;

    slideEls.forEach((slide, i) => {
      slide.classList.toggle('active', i === current);
    });

    dotEls.forEach((dot, i) => {
      const isActive = i === current;
      dot.classList.toggle('active', isActive);
      dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
      if (isActive) restartDotFill(dot);
    });

    renderText(current);
  }

  function next() {
    goToSlide(current + 1);
  }

  function startAutoplay() {
    stopAutoplay();
    timer = setInterval(next, SLIDE_DURATION);
  }

  function stopAutoplay() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  dotEls.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      goToSlide(i);
      startAutoplay();
    });
  });

  // Pause the timer when the tab is hidden, resume when it's visible again.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  });

  // Init
  goToSlide(0);
  startAutoplay();
})();