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

const applyTheme = (theme) => {
  const target = document.querySelector(`[data-theme="${theme}"]`);
  document.documentElement.setAttribute("data-selected-theme", theme);
  document.querySelector(pressedButtonSelector).setAttribute("aria-pressed", false);
  target.setAttribute("aria-pressed", true);
};

const handleThemeSelection = (event) => {
  const target = event.target;
  const isPressed = target.getAttribute("aria-pressed");
  const theme = target.getAttribute("data-theme");

  if (isPressed !== true) {
    applyTheme(theme);
    localStorage.setItem("selected-theme", theme);
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
  let cardTargets = [];

  // scrollIntoView is unreliable here: a sticky card's getBoundingClientRect
  // reflects its current *stuck* position, not where it needs to scroll to
  // become the active (topmost) card, so the browser sometimes decides no
  // scrolling is needed when navigating to an earlier, currently-covered
  // card. Compute real document-flow scroll targets instead, from each
  // card's own height (unaffected by sticky) rather than its live rect.
  const measureCardTargets = () => {
    const stackTop =
      document.querySelector(".card-stack").getBoundingClientRect().top +
      window.scrollY;
    let cumulative = stackTop;
    cardTargets = cards.map((card) => {
      const target = cumulative;
      cumulative += card.offsetHeight;
      return target;
    });
  };

  measureCardTargets();
  window.addEventListener("resize", measureCardTargets);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measureCardTargets);
  }

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
    window.scrollTo({ top: cardTargets[clamped], behavior: "smooth" });
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
