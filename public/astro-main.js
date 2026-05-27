const searchInput = document.querySelector("[data-search]");
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const storyCards = [...document.querySelectorAll("[data-category]")];
const emptyState = document.querySelector("[data-empty]");
const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const categoryLinks = [...document.querySelectorAll("[data-category-filter]")];
const searchLink = document.querySelector(".search-link");

let activeFilter = "all";

const updateStories = () => {
  if (!searchInput || !emptyState) return;
  const query = searchInput.value.trim().toLowerCase();
  const activeCategories = activeFilter === "all" ? [] : activeFilter.split(",");
  let visibleCount = 0;

  storyCards.forEach((card) => {
    const matchesCategory = activeFilter === "all" || activeCategories.includes(card.dataset.category);
    const text = `${card.textContent} ${card.dataset.keywords}`.toLowerCase();
    const matchesSearch = !query || text.includes(query);
    const isVisible = matchesCategory && matchesSearch;

    card.classList.toggle("hidden", !isVisible);
    if (isVisible) visibleCount += 1;
  });

  emptyState.hidden = visibleCount > 0;
};

const setActiveFilter = (filter) => {
  activeFilter = filter;
  filterButtons.forEach((item) => item.classList.toggle("active", item.dataset.filter === filter));
  updateStories();
};

filterButtons.forEach((button) => button.addEventListener("click", () => setActiveFilter(button.dataset.filter)));

searchInput?.addEventListener("input", updateStories);

categoryLinks.forEach((link) => {
  link.addEventListener("click", () => {
    setActiveFilter(link.dataset.categoryFilter);
    document.querySelector("#stories")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

navToggle?.addEventListener("click", () => {
  const isOpen = navToggle.getAttribute("aria-expanded") === "true";
  navToggle.setAttribute("aria-expanded", String(!isOpen));
  nav?.classList.toggle("open", !isOpen);
});

nav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navToggle?.setAttribute("aria-expanded", "false");
    nav.classList.remove("open");
  });
});

searchLink?.addEventListener("click", () => {
  window.setTimeout(() => searchInput?.focus(), 250);
});
