const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");
const searchInput = document.querySelector("[data-search]");
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const storyCards = [...document.querySelectorAll("[data-category]")];
const emptyState = document.querySelector("[data-empty]");
const subscribeForm = document.querySelector("[data-form]");
const formMessage = document.querySelector("[data-form-message]");

let activeFilter = "all";

const updateHeader = () => {
  header.classList.toggle("scrolled", window.scrollY > 12);
};

const closeNav = () => {
  if (!nav || !navToggle) return;
  nav.classList.remove("open");
  document.body.classList.remove("nav-open");
  navToggle.setAttribute("aria-expanded", "false");
};

const updateStories = () => {
  if (!searchInput || !emptyState) return;
  const query = searchInput.value.trim().toLowerCase();
  let visibleCount = 0;

  storyCards.forEach((card) => {
    const matchesCategory = activeFilter === "all" || card.dataset.category === activeFilter;
    const text = `${card.textContent} ${card.dataset.keywords}`.toLowerCase();
    const matchesSearch = !query || text.includes(query);
    const isVisible = matchesCategory && matchesSearch;

    card.classList.toggle("hidden", !isVisible);
    if (isVisible) visibleCount += 1;
  });

  emptyState.hidden = visibleCount > 0;
};

if (header) {
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();
}

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    document.body.classList.toggle("nav-open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.addEventListener("click", (event) => {
    if (event.target.matches("a")) closeNav();
  });
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    updateStories();
  });
});

if (searchInput) {
  searchInput.addEventListener("input", updateStories);
}

if (subscribeForm && formMessage) {
  subscribeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = new FormData(subscribeForm).get("email") || subscribeForm.querySelector("input").value;

    formMessage.textContent = `${email} 已加入訂閱名單。`;
    subscribeForm.reset();
  });
}
