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
     0. THEME TOGGLE
     ================================================================ */

  const themeToggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('flick-theme');
  const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    if (themeToggle) {
      const isLight = theme === 'light';
      themeToggle.setAttribute('aria-pressed', String(isLight));
      themeToggle.setAttribute('aria-label', isLight ? 'Switch to night mode' : 'Switch to day mode');
      themeToggle.setAttribute('title', isLight ? 'Switch to night mode' : 'Switch to day mode');
    }
  }

  applyTheme(savedTheme || (systemPrefersLight ? 'light' : 'dark'));

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const nextTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      localStorage.setItem('flick-theme', nextTheme);
      applyTheme(nextTheme);
    });
  }


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
     7. PHONE PREVIEW SWAP
     ================================================================ */

  const heroVisual = document.querySelector('.hero-visual--dual');
  document.querySelector('.icon-medal')?.addEventListener('click', (event) => {
    event.stopPropagation();
    heroVisual?.classList.add('is-swapped');
  });

  document.querySelector('.admin-back-btn')?.addEventListener('click', (event) => {
    event.stopPropagation();
    heroVisual?.classList.remove('is-swapped');
    document.querySelector('.phone-mockup--analytics .phone-screen')?.classList.remove('is-history-open', 'is-profile-open');
  });

  document.querySelector('.admin-history-btn')?.addEventListener('click', (event) => {
    event.stopPropagation();
    document.querySelector('.phone-mockup--analytics .phone-screen')?.classList.add('is-history-open');
  });

  document.querySelector('.history-back-btn')?.addEventListener('click', (event) => {
    event.stopPropagation();
    document.querySelector('.phone-mockup--analytics .phone-screen')?.classList.remove('is-history-open');
  });

  document.querySelectorAll('.admin-team-card').forEach(card => {
    card.addEventListener('click', (event) => {
      event.stopPropagation();
      const staffName = card.dataset.staff || 'Vansh';
      const profile = document.querySelector('.staff-profile-ui');
      profile?.querySelector('.profile-name')?.replaceChildren(document.createTextNode(staffName));
      document.querySelector('.phone-mockup--analytics .phone-screen')?.classList.add('is-profile-open');
    });
  });

  document.querySelector('.profile-back-btn')?.addEventListener('click', (event) => {
    event.stopPropagation();
    document.querySelector('.phone-mockup--analytics .phone-screen')?.classList.remove('is-profile-open');
  });

  if (heroVisual) {
    heroVisual.addEventListener('pointermove', (event) => {
      const rect = heroVisual.getBoundingClientRect();
      heroVisual.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`);
      heroVisual.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`);
    });

    heroVisual.addEventListener('pointerleave', () => {
      heroVisual.style.removeProperty('--pointer-x');
      heroVisual.style.removeProperty('--pointer-y');
    });
  }

  /* ================================================================
     8. 3D TILT EFFECT
     ------------------------------------------------------------------
     Mouse-tracking perspective tilt on elements with [data-tilt].
     Respects prefers-reduced-motion.
     ================================================================ */

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tiltElements = window.matchMedia('(min-width: 768px)').matches
    ? document.querySelectorAll('[data-tilt]:not(.phone-mockup)')
    : [];

  if (!prefersReducedMotion && tiltElements.length > 0) {

    const TILT_MAX = 12;
    const TILT_PERSPECTIVE = 1000;

    tiltElements.forEach(el => {
      const tiltMax = Number(el.dataset.tiltMax) || TILT_MAX;
      el.style.transformStyle = 'preserve-3d';

      el.addEventListener('mousemove', (e) => {
        el.style.transition = 'none';
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -tiltMax;
        const rotateY = ((x - centerX) / centerX) * tiltMax;

        el.style.transform = `perspective(${TILT_PERSPECTIVE}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
        el.style.transition = '';
      });
    });
  }


  /* ================================================================
      9. PARTICLE CANVAS BACKGROUND
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
      10. CHART BAR ANIMATION
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
      11. FUNCTIONAL PHONE SCREENS
     ------------------------------------------------------------------
     Handles navigation between inner app screens.
     ================================================================ */

  const actionBtns = document.querySelectorAll('.action-btn[data-target]');
  const backBtns = document.querySelectorAll('.back-btn');
  const homeUi = document.querySelector('.home-ui');
  const appUis = document.querySelectorAll('.app-ui');
  const billingUi = document.getElementById('billing-ui');

  function showAppScreen(targetUi) {
    appUis.forEach(ui => {
      if (ui === homeUi || ui === targetUi) {
        ui.classList.toggle('is-hidden', ui !== targetUi && targetUi !== homeUi);
        ui.classList.toggle('is-active', ui === targetUi && ui !== homeUi);
      } else if (ui !== document.querySelector('.analytics-ui')) {
        ui.classList.remove('is-active');
      }
    });
    if (homeUi) homeUi.classList.toggle('is-hidden', targetUi !== homeUi);
  }

  actionBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetId = btn.getAttribute('data-target');
      const targetUi = document.getElementById(targetId);
      
      if (targetUi) {
        showAppScreen(targetUi);
      }
    });
  });

  backBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Find the closest parent .sub-ui and remove its active class
      const parentUi = btn.closest('.sub-ui');
      showAppScreen(homeUi);
    });
  });

  document.querySelector('.quick-sell-banner')?.addEventListener('click', () => showAppScreen(billingUi));
  document.querySelector('.sales-history-banner')?.addEventListener('click', () => {
    showAppScreen(document.getElementById('sales-analytics-ui'));
  });

  document.querySelectorAll('.bottom-nav').forEach(nav => {
    const destinations = ['home-ui', 'billing-ui', 'inventory-ui', 'khata-ui'];
    nav.querySelectorAll('.nav-item').forEach((item, index) => {
      if (!destinations[index]) return;
      item.addEventListener('click', () => {
        const destination = document.querySelector(`.${destinations[index]}`);
        if (destination) showAppScreen(destination);
      });
    });
  });

  // Billing screen state: quantity, discount, payment mode, and sale confirmation.
  const quantityValue = billingUi?.querySelector('.qty-value');
  const itemMeta = billingUi?.querySelector('.item-meta');
  const subtotalValue = billingUi?.querySelector('.checkout-row .checkout-value');
  const subtotalLabel = billingUi?.querySelector('.checkout-label');
  const discountInput = billingUi?.querySelector('.discount-input');
  const totalValue = billingUi?.querySelector('.checkout-row--total .checkout-value');
  const saleButton = billingUi?.querySelector('.btn-complete-sale');
  const paymentTabs = billingUi?.querySelectorAll('.payment-tab') || [];
  let quantity = Number(quantityValue?.textContent) || 0;
  const unitPrice = 20;

  function updateBill() {
    const discountPercent = Math.max(0, Math.min(100, Number(discountInput?.value) || 0));
    const subtotal = quantity * unitPrice;
    const total = subtotal - (subtotal * discountPercent / 100);

    if (quantityValue) quantityValue.textContent = String(quantity);
    if (itemMeta) itemMeta.textContent = `₹${unitPrice} • ${59 - quantity} pcs left`;
    if (subtotalLabel) subtotalLabel.textContent = `Subtotal (${quantity} items)`;
    if (subtotalValue) subtotalValue.textContent = `₹${subtotal.toFixed(0)}`;
    if (totalValue) totalValue.textContent = `₹ ${total.toFixed(0)}`;
  }

  billingUi?.querySelector('.btn-plus')?.addEventListener('click', () => {
    if (quantity < 59) quantity += 1;
    updateBill();
  });

  billingUi?.querySelector('.btn-minus')?.addEventListener('click', () => {
    if (quantity > 0) quantity -= 1;
    updateBill();
  });

  discountInput?.addEventListener('input', updateBill);

  paymentTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      paymentTabs.forEach(paymentTab => paymentTab.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  saleButton?.addEventListener('click', () => {
    if (quantity === 0) return;
    const originalText = saleButton.textContent;
    saleButton.textContent = 'Sale Completed';
    saleButton.disabled = true;
    setTimeout(() => {
      saleButton.textContent = originalText;
      saleButton.disabled = false;
      quantity = 0;
      if (discountInput) discountInput.value = '';
      updateBill();
    }, 1600);
  });

  updateBill();

}); // end DOMContentLoaded
