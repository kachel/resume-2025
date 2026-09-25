// HEADER HEIGHT (sticky offset for card stack)
const headerEl = document.querySelector(".header");
const setHeaderHeight = () => {
  document.documentElement.style.setProperty(
    "--header-h",
    `${headerEl.getBoundingClientRect().height}px`
  );
};
setHeaderHeight();
window.addEventListener("resize", setHeaderHeight);
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(setHeaderHeight);
}

// THEME SWITCHER
const pressedButtonSelector = '[data-theme][aria-pressed="true"]';
const defaultTheme = "blue";

// The theme-switcher lives inside a <details> so it can collapse behind
// a toggle icon on mobile. It defaults to `open` in the markup (so a
// no-JS visitor always gets a usable, visible switcher at every width —
// a closed <details> makes its own box 0x0 whenever its non-summary
// content can't lay out, which is worse than just not collapsing at
// all). With JS, actively collapse it on mobile as an enhancement, and
// keep it open at desktop where the toggle icon is hidden by CSS.
const themePicker = document.querySelector(".theme-picker");
const syncThemePickerOpen = () => {
  themePicker.open = window.innerWidth >= 768;
};
syncThemePickerOpen();
window.addEventListener("resize", syncThemePickerOpen);

const themeColors = {
  green: "#a2f3c8",
  blue: "#63b4ff",
  purple: "#e2a4ff",
  orange: "#fa9c61",
};

const applyTheme = (theme) => {
  const target = document.querySelector(`[data-theme="${theme}"]`);
  document.documentElement.setAttribute("data-selected-theme", theme);
  document.querySelector(pressedButtonSelector).setAttribute("aria-pressed", false);
  target.setAttribute("aria-pressed", true);

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta && themeColors[theme]) {
    themeColorMeta.setAttribute("content", themeColors[theme]);
  }
};

const handleThemeSelection = (event) => {
  const target = event.target;
  const isPressed = target.getAttribute("aria-pressed");
  const theme = target.getAttribute("data-theme");

  if (isPressed !== true) {
    applyTheme(theme);
    localStorage.setItem("selected-theme", theme);
  }

  // Collapse the mobile theme-picker dropdown after a pick, so the user
  // doesn't have to close it manually. Guarded to mobile widths only:
  // at desktop the toggle summary is hidden by CSS, so closing it there
  // would leave no way to reopen it short of resizing the window.
  if (window.innerWidth < 768) {
    const picker = target.closest(".theme-picker");
    if (picker) picker.open = false;
  }
};

const setInitialTheme = () => {
  const savedTheme = localStorage.getItem("selected-theme");
  if (savedTheme && savedTheme !== defaultTheme) {
    applyTheme(savedTheme);
  }
};

setInitialTheme();

const themeSwitcher = document.querySelector(".theme-switcher");
const buttons = document.querySelectorAll(".theme-button");

buttons.forEach((button) => {
  button.addEventListener("click", handleThemeSelection);
});

// CARD STACK NAVIGATION
const cards = [...document.querySelectorAll(".card-stack__item")];
const currentEl = document.querySelector("[data-card-current]");
const totalEl = document.querySelector("[data-card-total]");
const prevBtn = document.querySelector("[data-card-prev]");
const nextBtn = document.querySelector("[data-card-next]");

if (cards.length && currentEl && totalEl) {
  totalEl.textContent = cards.length;

  let activeIndex = 0;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const setActive = (index) => {
    activeIndex = index;
    currentEl.textContent = index + 1;
    cards.forEach((card, i) => {
      card.setAttribute("aria-current", i === index ? "true" : "false");
    });
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === cards.length - 1;
  };

  const goTo = (index, updateHash) => {
    const clamped = Math.max(0, Math.min(cards.length - 1, index));
    // Update state immediately rather than waiting for the
    // IntersectionObserver to catch up once the (possibly animated)
    // scroll settles — otherwise activeIndex is stale for the scroll's
    // whole duration, so a second quick click recomputes the same
    // target instead of advancing further.
    setActive(clamped);
    cards[clamped].scrollIntoView({
      behavior: prefersReducedMotion ? "instant" : "smooth",
      block: "start",
    });
    if (updateHash) {
      history.pushState(null, "", `#${cards[clamped].id}`);
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          const index = cards.indexOf(entry.target);
          if (index !== -1) setActive(index);
        }
      });
    },
    { threshold: [0.6] }
  );

  cards.forEach((card) => observer.observe(card));

  if (prevBtn) prevBtn.addEventListener("click", () => goTo(activeIndex - 1, true));
  if (nextBtn) nextBtn.addEventListener("click", () => goTo(activeIndex + 1, true));

  document.addEventListener("keydown", (event) => {
    if (document.activeElement !== document.body) return;
    if (event.key === "ArrowDown" || event.key === "PageDown") {
      event.preventDefault();
      goTo(activeIndex + 1, true);
    } else if (event.key === "ArrowUp" || event.key === "PageUp") {
      event.preventDefault();
      goTo(activeIndex - 1, true);
    }
  });

  const initialId = location.hash.slice(1);
  const initialIndex = cards.findIndex((card) => card.id === initialId);
  if (initialIndex > -1) {
    requestAnimationFrame(() => goTo(initialIndex, false));
  } else {
    setActive(0);
  }
}
