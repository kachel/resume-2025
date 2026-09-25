// THEME SWITCHER
const pressedButtonSelector = '[data-theme][aria-pressed="true"]';
const defaultTheme = "blue";

// The theme-switcher lives inside a <details> so it can collapse behind
// a palette-icon toggle at every width. It defaults to `open` in the
// markup (so a no-JS visitor always gets a usable, visible switcher —
// a closed <details> makes its own box 0x0 whenever its non-summary
// content can't lay out, which is worse than just not collapsing at
// all). With JS, actively collapse it as an enhancement.
const themePicker = document.querySelector(".theme-picker");
themePicker.open = false;

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

  // Collapse the theme-picker dropdown after a pick, so the user doesn't
  // have to close it manually.
  const picker = target.closest(".theme-picker");
  if (picker) picker.open = false;
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

  // A deliberate, single-purpose entrance for cards reached via explicit
  // navigation (buttons/keyboard) — a small settle that echoes the
  // physical "index card" material this system is built from. Not used
  // on the initial hash landing or on cards activated by ordinary scroll
  // (the IntersectionObserver below), so it stays a discrete moment tied
  // to an intentional action rather than a scroll-triggered effect.
  const settleCard = (card) => {
    if (prefersReducedMotion) return;
    card.classList.remove("is-settling");
    void card.offsetWidth;
    card.classList.add("is-settling");
  };

  const goTo = (index, updateHash, settle) => {
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
    if (settle) {
      settleCard(cards[clamped]);
      // scrollIntoView only moves the viewport — it never moves keyboard/AT
      // focus, so without this a screen-reader user pressing "Next" hears
      // nothing and stays put on the button they just pressed. Move focus
      // to the section itself (tabindex="-1" in the markup) so its heading
      // gets announced. preventScroll since we already handled scrolling.
      cards[clamped].focus({ preventScroll: true });
    }
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

  if (prevBtn) prevBtn.addEventListener("click", () => goTo(activeIndex - 1, true, true));
  if (nextBtn) nextBtn.addEventListener("click", () => goTo(activeIndex + 1, true, true));

  document.addEventListener("keydown", (event) => {
    // Arrow-key section nav only fires when focus is "at rest" — on the
    // body (nothing focused) or on a card section itself (where nav just
    // moved focus). Skip it while focus is on a real control (link,
    // button, form field) so arrow keys don't hijack that control's own
    // behavior.
    const active = document.activeElement;
    const atRest = active === document.body || active.classList.contains("card-stack__item");
    if (!atRest) return;
    if (event.key === "ArrowDown" || event.key === "PageDown") {
      event.preventDefault();
      goTo(activeIndex + 1, true, true);
    } else if (event.key === "ArrowUp" || event.key === "PageUp") {
      event.preventDefault();
      goTo(activeIndex - 1, true, true);
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
