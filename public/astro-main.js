const searchInput = document.querySelector("[data-search]");
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const storyCards = [...document.querySelectorAll("[data-category]")];
const emptyState = document.querySelector("[data-empty]");
const subscribeForm = document.querySelector("[data-form]");
const formMessage = document.querySelector("[data-form-message]");

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

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    updateStories();
  });
});

searchInput?.addEventListener("input", updateStories);

subscribeForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = new FormData(subscribeForm).get("email") || subscribeForm.querySelector("input").value;
  formMessage.textContent = `${email} 已加入文章訂閱名單。`;
  subscribeForm.reset();
});
