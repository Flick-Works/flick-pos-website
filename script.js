/* ================================================================
   FLICK POS — SCRIPT.JS
   Marketing Landing Page Interactivity
   
   Vanilla JavaScript — zero dependencies.
   
   Modules:
   1. Mobile Menu Toggle
   2. Smooth Scrolling (anchor links)
   3. Scroll-Reveal Animations (Intersection Observer)
   4. Header scroll state (background solidifies on scroll)
   5. Active nav link tracking
   ================================================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {


  /* ================================================================
     1. MOBILE MENU TOGGLE
     ------------------------------------------------------------------
     Toggles .is-open on the hamburger button and the nav panel.
     
     Manages:
     - ARIA expanded state for accessibility
     - Body scroll lock when menu is open (prevents background scrolling)
     - Auto-close when a nav link is clicked (UX convenience)
     - Auto-close on Escape key press
     ================================================================ */

  const menuToggle  = document.getElementById('menu-toggle');
  const primaryNav  = document.getElementById('primary-nav');
  const navLinks    = primaryNav ? primaryNav.querySelectorAll('.nav-link') : [];

  /**
   * Sets the menu to a specific open/closed state.
   * @param {boolean} open — true to open, false to close
   */
  function setMenuState(open) {
    if (!menuToggle || !primaryNav) return;

    menuToggle.classList.toggle('is-open', open);
    primaryNav.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));

    // Lock body scroll when the mobile menu is open
    document.body.style.overflow = open ? 'hidden' : '';
  }

  /** Toggles between open and closed. */
  function toggleMenu() {
    const isCurrentlyOpen = menuToggle.classList.contains('is-open');
    setMenuState(!isCurrentlyOpen);
  }

  // Hamburger button click
  if (menuToggle) {
    menuToggle.addEventListener('click', toggleMenu);
  }

  // Close menu when any nav link inside it is clicked
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (primaryNav.classList.contains('is-open')) {
        setMenuState(false);
      }
    });
  });

  // Close menu on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && primaryNav && primaryNav.classList.contains('is-open')) {
      setMenuState(false);
      menuToggle.focus(); // Return focus to the toggle for accessibility
    }
  });

  // Close menu if window resizes past the mobile breakpoint
  // (prevents a stuck-open menu if user rotates device to landscape)
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768 && primaryNav && primaryNav.classList.contains('is-open')) {
      setMenuState(false);
    }
  });


  /* ================================================================
     2. SMOOTH SCROLLING FOR ANCHOR LINKS
     ------------------------------------------------------------------
     Intercepts clicks on any <a href="#..."> and scrolls smoothly
     to the target section, accounting for the fixed header height.
     
     Uses native Element.scrollIntoView with behavior: 'smooth'.
     Falls back to scroll-margin-top on the target for header offset.
     ================================================================ */

  // Set scroll-margin-top on all sections to account for fixed header
  const headerHeight = document.getElementById('site-header')?.offsetHeight || 64;
  document.documentElement.style.setProperty('--scroll-offset', `${headerHeight + 16}px`);

  // Apply scroll-margin-top to all sections with IDs
  document.querySelectorAll('section[id], div[id]').forEach(section => {
    section.style.scrollMarginTop = `${headerHeight + 16}px`;
  });

  // Intercept anchor link clicks
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      
      // Skip empty hashes or "#" only
      if (!targetId || targetId === '#') return;

      const targetEl = document.querySelector(targetId);
      if (!targetEl) return;

      e.preventDefault();

      targetEl.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });

      // Update URL hash without jumping (for bookmarkability)
      history.pushState(null, '', targetId);
    });
  });


  /* ================================================================
     3. SCROLL-REVEAL ANIMATIONS (Intersection Observer)
     ------------------------------------------------------------------
     Elements with the .reveal class start invisible (via CSS) and
     fade in when they enter the viewport.
     
     The .reveal-stagger class on a parent container causes its
     .reveal children to animate in with staggered delays (set in CSS).
     
     IntersectionObserver config:
     - threshold: 0.15 — triggers when 15% of the element is visible
     - rootMargin: bottom offset so animations start slightly before
       the element reaches the viewport center
     
     Once revealed, the observer disconnects from that element
     (one-shot animation — no re-hiding on scroll up).
     ================================================================ */

  const revealElements = document.querySelectorAll('.reveal');

  if (revealElements.length > 0 && 'IntersectionObserver' in window) {

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target); // One-shot: don't re-trigger
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -60px 0px',  // Trigger 60px before bottom edge
    });

    revealElements.forEach(el => revealObserver.observe(el));

  } else {
    // Fallback: if IntersectionObserver isn't supported, show everything
    revealElements.forEach(el => el.classList.add('is-visible'));
  }


  /* ================================================================
     4. HEADER SCROLL STATE
     ------------------------------------------------------------------
     Adds a .is-scrolled class to the header when the page is
     scrolled past a threshold. This can be used to:
     - Solidify the glassmorphism background
     - Add/remove a bottom shadow
     - Shrink the header height
     
     Uses requestAnimationFrame-throttled scroll listener for
     optimal performance (no layout thrashing).
     ================================================================ */

  const siteHeader   = document.getElementById('site-header');
  const scrollThreshold = 50; // px from top before header changes state
  let lastScrollState = false;
  let ticking = false;

  function updateHeaderScroll() {
    const isScrolled = window.scrollY > scrollThreshold;

    // Only touch the DOM if the state actually changed
    if (isScrolled !== lastScrollState) {
      siteHeader.classList.toggle('is-scrolled', isScrolled);
      lastScrollState = isScrolled;
    }

    ticking = false;
  }

  if (siteHeader) {
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateHeaderScroll);
        ticking = true;
      }
    }, { passive: true });

    // Check initial state (in case page loads mid-scroll)
    updateHeaderScroll();
  }


  /* ================================================================
     5. ACTIVE NAV LINK TRACKING
     ------------------------------------------------------------------
     Highlights the nav link corresponding to the section currently
     in view. Uses IntersectionObserver on the sections themselves.
     ================================================================ */

  const sections = document.querySelectorAll('section[id]');
  const allNavLinks = document.querySelectorAll('.nav-link[href^="#"]');

  if (sections.length > 0 && allNavLinks.length > 0 && 'IntersectionObserver' in window) {

    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const activeId = entry.target.getAttribute('id');

          allNavLinks.forEach(link => {
            const isMatch = link.getAttribute('href') === `#${activeId}`;
            link.classList.toggle('is-active', isMatch);
          });
        }
      });
    }, {
      threshold: 0,
      rootMargin: `-${headerHeight}px 0px -40% 0px`,
    });

    sections.forEach(section => navObserver.observe(section));
  }


  /* ================================================================
     6. WAITLIST FORM (placeholder handler)
     ------------------------------------------------------------------
     Catches the form submit, prevents default, and shows a
     success message. Replace the inner logic with a real API call
     (e.g., to a Google Form, Supabase, or custom backend) when ready.
     ================================================================ */

  const waitlistForm  = document.getElementById('waitlist-form');
  const waitlistEmail = document.getElementById('waitlist-email');
  const submitBtn     = document.getElementById('waitlist-submit');

  if (waitlistForm) {
    waitlistForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const email = waitlistEmail?.value?.trim();
      if (!email) return;

      // Disable button and show loading state
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Joining...';
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';

      // Simulate API call (replace with actual fetch when backend is ready)
      setTimeout(() => {
        // Success state
        submitBtn.textContent = '✓ You\'re In!';
        submitBtn.style.opacity = '1';
        submitBtn.style.backgroundColor = 'var(--color-secondary)';
        submitBtn.style.color = 'var(--color-on-secondary)';
        waitlistEmail.value = '';
        waitlistEmail.disabled = true;

        // Reset after 4 seconds
        setTimeout(() => {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
          submitBtn.style.backgroundColor = '';
          submitBtn.style.color = '';
          submitBtn.style.opacity = '';
          waitlistEmail.disabled = false;
        }, 4000);
      }, 1200);
    });
  }


  /* ================================================================
     7. 3D TILT EFFECT
     ------------------------------------------------------------------
     Mouse-tracking perspective tilt on elements with [data-tilt].
     Respects prefers-reduced-motion.
     ================================================================ */

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tiltElements = document.querySelectorAll('[data-tilt]');

  if (!prefersReducedMotion && tiltElements.length > 0) {

    const TILT_MAX = 12;
    const TILT_PERSPECTIVE = 1000;

    tiltElements.forEach(el => {
      el.style.transformStyle = 'preserve-3d';

      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -TILT_MAX;
        const rotateY = ((x - centerX) / centerX) * TILT_MAX;

        el.style.transform = `perspective(${TILT_PERSPECTIVE}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }


  /* ================================================================
     8. PARTICLE CANVAS BACKGROUND
     ------------------------------------------------------------------
     Lightweight floating particle network for depth.
     ================================================================ */

  const particleCanvas = document.getElementById('particle-canvas');

  if (particleCanvas && !prefersReducedMotion) {
    const ctx = particleCanvas.getContext('2d');
    let particles = [];
    let animationId;
    let mouseX = 0;
    let mouseY = 0;

    function resizeCanvas() {
      particleCanvas.width = window.innerWidth;
      particleCanvas.height = window.innerHeight;
    }

    function createParticles() {
      const count = Math.min(60, Math.floor(window.innerWidth / 25));
      particles = [];

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * particleCanvas.width,
          y: Math.random() * particleCanvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.5 + 0.2,
        });
      }
    }

    function drawParticles() {
      ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

      particles.forEach((p, i) => {
        // Mouse parallax influence
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          p.x -= dx * 0.0008;
          p.y -= dy * 0.0008;
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = particleCanvas.width;
        if (p.x > particleCanvas.width) p.x = 0;
        if (p.y < 0) p.y = particleCanvas.height;
        if (p.y > particleCanvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(252, 75%, 68%, ${p.opacity})`;
        ctx.fill();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const distX = p.x - p2.x;
          const distY = p.y - p2.y;
          const distance = Math.sqrt(distX * distX + distY * distY);

          if (distance < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `hsla(252, 75%, 68%, ${0.08 * (1 - distance / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animationId = requestAnimationFrame(drawParticles);
    }

    resizeCanvas();
    createParticles();
    drawParticles();

    window.addEventListener('resize', () => {
      resizeCanvas();
      createParticles();
    });

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(animationId);
      } else {
        drawParticles();
      }
    });
  }


  /* ================================================================
     9. CHART BAR ANIMATION
     ------------------------------------------------------------------
     Cycles the active chart bar in the Analytics mockup.
     ================================================================ */

  const chartBars = document.querySelectorAll('.chart-bar-wrap');
  if (chartBars.length > 0 && !prefersReducedMotion) {
    let activeIndex = chartBars.length - 1; // Start at last item (Wed)

    setInterval(() => {
      chartBars.forEach(item => {
        item.classList.remove('active');
        const bar = item.querySelector('.chart-bar');
        if (bar) bar.classList.remove('chart-bar--highlight');
      });
      
      activeIndex = (activeIndex + 1) % chartBars.length;
      
      const nextItem = chartBars[activeIndex];
      nextItem.classList.add('active');
      const nextBar = nextItem.querySelector('.chart-bar');
      if (nextBar) nextBar.classList.add('chart-bar--highlight');
    }, 3000);
  }


  /* ================================================================
     10. PHONE MOCKUP SWAP INTERACTION
     ------------------------------------------------------------------
     Toggles the .is-swapped class on .hero-visual--dual when a phone
     mockup is clicked. This brings the back phone to the front.
     ================================================================ */

  const heroVisualDual = document.querySelector('.hero-visual--dual');
  const phoneMockups = document.querySelectorAll('.phone-mockup');

  if (heroVisualDual && phoneMockups.length > 0) {
    phoneMockups.forEach(phone => {
      phone.addEventListener('click', () => {
        heroVisualDual.classList.toggle('is-swapped');
      });
    });
  }

}); // end DOMContentLoaded
