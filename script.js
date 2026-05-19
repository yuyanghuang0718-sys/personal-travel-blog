const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");
const searchInput = document.querySelector("[data-search]");
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const storyGrid = document.querySelector("[data-story-grid]");
const emptyState = document.querySelector("[data-empty]");
const subscribeForm = document.querySelector("[data-form]");
const formMessage = document.querySelector("[data-form-message]");

let activeFilter = "all";
let storyCards = [];

const escapeHtml = (value = "") =>
  value.replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });

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

const renderStories = (posts) => {
  if (!storyGrid) return;

  storyGrid.innerHTML = posts
    .map(
      (post) => `
        <article class="story-card ${post.featured ? "featured" : ""}" data-category="${escapeHtml(
          post.category
        )}" data-keywords="${escapeHtml(post.keywords)}">
          <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.imageAlt)}" />
          <div class="story-content">
            <span class="tag">${escapeHtml(post.tag)}</span>
            <h3>${escapeHtml(post.title)}</h3>
            <p>${escapeHtml(post.excerpt)}</p>
            <a href="${escapeHtml(post.url)}">${post.url.startsWith("#") ? "閱讀筆記" : "閱讀遊記"}</a>
          </div>
        </article>
      `
    )
    .join("");

  storyCards = [...storyGrid.querySelectorAll("[data-category]")];
  updateStories();
};

const loadStories = async () => {
  if (!storyGrid) return;

  try {
    const response = await fetch("posts/posts.json");
    if (!response.ok) throw new Error("posts not found");
    const posts = await response.json();
    renderStories(posts);
  } catch {
    storyGrid.innerHTML = '<p class="empty-state">目前無法載入文章列表，請稍後再試。</p>';
  }
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

loadStories();
