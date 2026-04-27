const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileMenu = document.querySelector("[data-mobile-menu]");
const siteHeader = document.querySelector("[data-site-header]");
const menuOpenIcon = document.querySelector("[data-menu-open-icon]");
const menuCloseIcon = document.querySelector("[data-menu-close-icon]");
const navLinks = Array.from(document.querySelectorAll("[data-nav-link]"));
const sectionTargets = Array.from(document.querySelectorAll("main section[id]"));
const inPageLinks = Array.from(document.querySelectorAll('a[href^="#"]'));
const rootElement = document.documentElement;
const connection =
  navigator.connection ||
  navigator.mozConnection ||
  navigator.webkitConnection;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const isConstrainedDevice =
  prefersReducedMotion.matches ||
  Boolean(connection?.saveData) ||
  ["slow-2g", "2g"].includes(connection?.effectiveType) ||
  (typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4) ||
  (typeof navigator.hardwareConcurrency === "number" &&
    navigator.hardwareConcurrency <= 4);

if (isConstrainedDevice) {
  rootElement.classList.add("reduced-effects");
}

const activeNavClasses = [
  "border-white/10",
  "bg-white/[0.08]",
  "text-white",
  "shadow-[0_12px_30px_-20px_rgba(59,130,246,0.45)]",
];

const updateHeaderState = () => {
  if (!siteHeader) {
    return;
  }

  const isScrolled = window.scrollY > 16;

  siteHeader.classList.toggle("bg-slate-950/80", isScrolled);
  siteHeader.classList.toggle("border-white/15", isScrolled);
  siteHeader.classList.toggle(
    "shadow-[0_20px_55px_-30px_rgba(15,23,42,0.95)]",
    isScrolled
  );
};

const setActiveNavLink = (activeId) => {
  navLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === `#${activeId}`;

    activeNavClasses.forEach((className) => {
      link.classList.toggle(className, isActive);
    });

    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
};

const updateActiveSection = () => {
  if (!sectionTargets.length) {
    return;
  }

  const offset = (siteHeader?.offsetHeight ?? 0) + 120;
  let activeSectionId = sectionTargets[0].id;

  sectionTargets.forEach((section) => {
    if (window.scrollY + offset >= section.offsetTop) {
      activeSectionId = section.id;
    }
  });

  setActiveNavLink(activeSectionId);
};

const initializeLocalDevelopmentNotice = () => {
  if (window.location.protocol !== "file:") {
    return;
  }

  const developerNotice =
    "[Astrix Nexus][dev] Running this site with file:// blocks Firebase-powered contact and review features in Chrome. Use http://localhost or your deployed Firebase Hosting URL for form testing.";

  console.info(developerNotice);
};

const scrollToSection = (targetId) => {
  const target = document.querySelector(targetId);

  if (!target) {
    return;
  }

  const targetTop =
    target.getBoundingClientRect().top +
    window.scrollY -
    (siteHeader?.offsetHeight ?? 0) -
    12;

  window.scrollTo({
    top: Math.max(targetTop, 0),
    behavior: isConstrainedDevice ? "auto" : "smooth",
  });

  window.history.replaceState(null, "", targetId);
};

inPageLinks.forEach((link) => {
  const href = link.getAttribute("href");

  if (!href || href === "#") {
    return;
  }

  link.addEventListener("click", (event) => {
    const target = document.querySelector(href);

    if (!target) {
      return;
    }

    event.preventDefault();
    scrollToSection(href);
  });
});

if (menuToggle && mobileMenu) {
  const syncMenuState = (isOpen) => {
    mobileMenu.classList.toggle("hidden", !isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuOpenIcon?.classList.toggle("hidden", isOpen);
    menuCloseIcon?.classList.toggle("hidden", !isOpen);
  };

  syncMenuState(false);

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    syncMenuState(!isOpen);
  });

  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => syncMenuState(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      syncMenuState(false);
    }
  });

  document.addEventListener("click", (event) => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";

    if (isOpen && siteHeader && !siteHeader.contains(event.target)) {
      syncMenuState(false);
    }
  });

  const desktopMedia = window.matchMedia("(min-width: 768px)");
  const handleDesktopChange = (event) => {
    if (event.matches) {
      syncMenuState(false);
    }
  };

  if (desktopMedia.addEventListener) {
    desktopMedia.addEventListener("change", handleDesktopChange);
  } else {
    desktopMedia.addListener(handleDesktopChange);
  }
}

const phoneContact = document.querySelector("[data-phone-contact]");

if (phoneContact) {
  const phoneToggle = phoneContact.querySelector("[data-phone-toggle]");
  const phonePanel = phoneContact.querySelector("[data-phone-panel]");
  const phoneBackdrop = phoneContact.querySelector("[data-phone-backdrop]");
  const phoneClose = phoneContact.querySelector("[data-phone-close]");
  const phoneLinks = Array.from(phoneContact.querySelectorAll("[data-phone-link]"));

  if (phoneToggle && phonePanel) {
    const setPhonePanelState = (isOpen) => {
      phoneToggle.setAttribute("aria-expanded", String(isOpen));
      phonePanel.classList.toggle("is-open", isOpen);

      if (phoneBackdrop) {
        phoneBackdrop.classList.toggle("is-open", isOpen);
      }
    };

    setPhonePanelState(false);

    phoneToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = phoneToggle.getAttribute("aria-expanded") === "true";
      setPhonePanelState(!isOpen);
    });

    phoneClose?.addEventListener("click", () => setPhonePanelState(false));
    phoneBackdrop?.addEventListener("click", () => setPhonePanelState(false));
    phoneLinks.forEach((link) => {
      link.addEventListener("click", () => setPhonePanelState(false));
    });

    document.addEventListener("click", (event) => {
      const isOpen = phoneToggle.getAttribute("aria-expanded") === "true";

      if (isOpen && !phoneContact.contains(event.target)) {
        setPhonePanelState(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setPhonePanelState(false);
      }
    });

    const phoneDesktopMedia = window.matchMedia("(min-width: 640px)");
    const handlePhoneViewportChange = () => setPhonePanelState(false);

    if (phoneDesktopMedia.addEventListener) {
      phoneDesktopMedia.addEventListener("change", handlePhoneViewportChange);
    } else {
      phoneDesktopMedia.addListener(handlePhoneViewportChange);
    }
  }
}

let ticking = false;

const handleScrollState = () => {
  if (ticking) {
    return;
  }

  ticking = true;

  window.requestAnimationFrame(() => {
    updateHeaderState();
    updateActiveSection();
    ticking = false;
  });
};

window.addEventListener("scroll", handleScrollState, { passive: true });
window.addEventListener("resize", handleScrollState);

updateHeaderState();
updateActiveSection();
initializeLocalDevelopmentNotice();

const initializeAnimations = () => {
  if (!window.gsap || !window.ScrollTrigger || isConstrainedDevice) {
    return;
  }

  const { gsap, ScrollTrigger } = window;
  const ease = "power3.out";

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({
    ignoreMobileResize: true,
  });

  const heroContent = document.querySelector("[data-hero-content]");
  const heroVisual = document.querySelector("[data-hero-visual]");
  const floatingLogo = document.querySelector("[data-floating-logo]");
  const serviceCards = gsap.utils.toArray("[data-service-card]");
  const projectCards = gsap.utils.toArray("[data-project-card]");
  const aboutCopy = document.querySelector("[data-about-copy]");
  const contactPanels = gsap.utils.toArray("[data-contact-panel]");
  const setWillChange = (targets) => {
    if (!targets || !targets.length) {
      return;
    }

    gsap.set(targets, {
      willChange: "transform, opacity",
    });
  };
  const clearWillChange = (targets) => {
    if (!targets || !targets.length) {
      return;
    }

    gsap.set(targets, {
      clearProps: "willChange",
    });
  };

  if (heroContent || heroVisual) {
    const heroRevealItems = heroContent?.querySelectorAll("[data-hero-reveal]") ?? [];
    const heroVisualLayers = heroVisual?.querySelectorAll("[data-hero-layer]") ?? [];
    const heroTargets = [heroContent, heroVisual, ...heroRevealItems, ...heroVisualLayers].filter(Boolean);
    setWillChange(heroTargets);

    const heroTimeline = gsap.timeline({
      defaults: {
        ease,
      },
      onComplete: () => clearWillChange(heroTargets),
    });

    if (heroContent) {
      const contentTargets = heroRevealItems.length ? heroRevealItems : heroContent.children;

      heroTimeline.from(contentTargets, {
        autoAlpha: 0,
        y: 28,
        duration: 0.9,
        stagger: 0.12,
      });
    }

    if (heroVisual) {
      heroTimeline.from(
        heroVisual,
        {
          y: 22,
          duration: 0.72,
        },
        0.12
      );

      if (heroVisualLayers.length) {
        heroTimeline.from(
          heroVisualLayers,
          {
            y: 12,
            scale: 0.98,
            duration: 0.54,
            stagger: 0.07,
          },
          0.2
        );
      }
    }
  }

  if (floatingLogo) {
    gsap.set(floatingLogo, {
      willChange: "transform",
    });

    gsap.to(floatingLogo, {
      y: -6,
      duration: 3.2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }

  if (serviceCards.length) {
    setWillChange(serviceCards);

    gsap.from(serviceCards, {
      autoAlpha: 0,
      y: 30,
      duration: 0.78,
      stagger: 0.12,
      ease,
      scrollTrigger: {
        trigger: "#services",
        start: "top 76%",
        once: true,
      },
      onComplete: () => clearWillChange(serviceCards),
    });
  }

  if (projectCards.length) {
    setWillChange(projectCards);

    gsap.from(projectCards, {
      autoAlpha: 0,
      y: 24,
      scale: 0.96,
      duration: 0.72,
      stagger: 0.1,
      ease,
      scrollTrigger: {
        trigger: "#projects",
        start: "top 76%",
        once: true,
      },
      onComplete: () => clearWillChange(projectCards),
    });
  }

  if (aboutCopy) {
    const aboutText = aboutCopy.querySelectorAll("h2, p");
    setWillChange(aboutText);

    gsap.fromTo(
      aboutText,
      {
        autoAlpha: 0,
        y: 26,
      },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.85,
        stagger: 0.14,
        ease,
        scrollTrigger: {
          trigger: "#about",
          start: "top 74%",
          once: true,
        },
        onComplete: () => clearWillChange(aboutText),
      }
    );
  }

  if (contactPanels.length) {
    setWillChange(contactPanels);
    const contactSection = document.querySelector("#contact");
    const contactAlreadyInView =
      contactSection &&
      window.scrollY + window.innerHeight * 0.78 >= contactSection.offsetTop;

    if (contactAlreadyInView) {
      gsap.set(contactPanels, {
        autoAlpha: 1,
        y: 0,
      });
      clearWillChange(contactPanels);
    } else {
      gsap.from(contactPanels, {
        autoAlpha: 0,
        y: 26,
        duration: 0.8,
        stagger: 0.14,
        ease,
        scrollTrigger: {
          trigger: "#contact",
          start: "top 78%",
          once: true,
        },
        onComplete: () => clearWillChange(contactPanels),
      });
    }
  }
};

const queueAnimationSetup = () => {
  const run = () => initializeAnimations();

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, {
      timeout: 1200,
    });
  } else {
    window.setTimeout(run, 0);
  }
};

if (document.readyState === "complete") {
  queueAnimationSetup();
} else {
  window.addEventListener("load", queueAnimationSetup, { once: true });
}
