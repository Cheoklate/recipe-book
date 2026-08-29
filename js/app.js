(function () {
  const grid = document.getElementById("recipe-grid");
  const emptyState = document.getElementById("empty-state");
  const searchInput = document.getElementById("search-input");
  const tagFiltersEl = document.getElementById("tag-filters");

  let recipes = [];
  let activeTag = null;

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function recipeMatchesQuery(recipe, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    if (recipe.title.toLowerCase().includes(q)) return true;
    if (recipe.ingredients.some((ing) => ing.item.toLowerCase().includes(q))) return true;
    if (recipe.tags.some((tag) => tag.toLowerCase().includes(q))) return true;
    return false;
  }

  function render() {
    const query = searchInput.value.trim();
    const filtered = recipes.filter((r) => {
      const matchesQuery = recipeMatchesQuery(r, query);
      const matchesTag = !activeTag || r.tags.includes(activeTag);
      return matchesQuery && matchesTag;
    });

    grid.innerHTML = filtered
      .map((r) => {
        const tagsHtml = r.tags
          .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
          .join("");
        const metaParts = [];
        if (r.prepTime) metaParts.push(`Prep ${escapeHtml(r.prepTime)}`);
        if (r.cookTime) metaParts.push(`Cook ${escapeHtml(r.cookTime)}`);
        if (r.servings) metaParts.push(`${r.servings} ${escapeHtml(r.servingUnit || "servings")}`);
        const thumbHtml =
          r.images && r.images.length
            ? `<img class="card-thumb" src="${escapeHtml(r.images[0])}" alt="" loading="lazy" />`
            : "";
        return `
          <a class="recipe-card" href="recipe.html?id=${encodeURIComponent(r.id)}">
            ${thumbHtml}
            <h2>${escapeHtml(r.title)}</h2>
            <div class="meta">${metaParts.join(" &middot; ")}</div>
            <div class="tags">${tagsHtml}</div>
          </a>
        `;
      })
      .join("");

    emptyState.hidden = filtered.length !== 0;
  }

  function renderTagFilters() {
    const allTags = Array.from(new Set(recipes.flatMap((r) => r.tags))).sort();
    tagFiltersEl.innerHTML = allTags
      .map((tag) => `<button class="tag-btn" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`)
      .join("");

    tagFiltersEl.querySelectorAll(".tag-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tag = btn.dataset.tag;
        activeTag = activeTag === tag ? null : tag;
        tagFiltersEl.querySelectorAll(".tag-btn").forEach((b) => {
          b.classList.toggle("active", b.dataset.tag === activeTag);
        });
        render();
      });
    });
  }

  searchInput.addEventListener("input", render);

  fetch("data/recipes.json")
    .then((res) => res.json())
    .then((data) => {
      recipes = data;
      renderTagFilters();
      render();
    })
    .catch((err) => {
      grid.innerHTML = `<p>Could not load recipes: ${escapeHtml(err.message)}</p>`;
    });
})();
