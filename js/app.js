(function () {
  const grid = document.getElementById("recipe-grid");
  const emptyState = document.getElementById("empty-state");
  const searchInput = document.getElementById("search-input");
  const sortSelect = document.getElementById("sort-select");
  const tagFiltersEl = document.getElementById("tag-filters");
  const clearFiltersBtn = document.getElementById("clear-filters");
  const filterToggle = document.getElementById("filter-toggle");
  const sidebar = document.getElementById("sidebar");

  // Maps each tag to a category. A category only gets its own labeled
  // section once at least two of its tags are actually in use — until
  // then its tag(s) sit in "Other" so the sidebar doesn't fill up with
  // one-tag sections. Add new tags here as they're introduced.
  const TAG_CATEGORIES = {
    dinner: "Meal",
    dessert: "Meal",
    lunch: "Meal",
    breakfast: "Meal",
    snack: "Meal",
    soup: "Meal",

    chicken: "Main Ingredient",
    beef: "Main Ingredient",
    pork: "Main Ingredient",
    mushroom: "Main Ingredient",
    ribs: "Main Ingredient",
    noodles: "Main Ingredient",
    broccoli: "Main Ingredient",
    cheese: "Main Ingredient",

    italian: "Cuisine",
    american: "Cuisine",
    mexican: "Cuisine",
    asian: "Cuisine",
    french: "Cuisine",

    oven: "Method",
    "no-bake": "Method",
    bbq: "Method",
    grilled: "Method",
    "slow-cooker": "Method",

    creamy: "Style",
    "comfort-food": "Style",
    copycat: "Style",
    "make-ahead": "Style",

    coffee: "Flavor",
  };
  const CATEGORY_ORDER = ["Meal", "Main Ingredient", "Method", "Style", "Cuisine", "Flavor"];
  const OTHER_LABEL = "Other";
  const MIN_TAGS_FOR_OWN_SECTION = 2;

  let recipes = [];
  let activeTags = new Set();

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

  // OR within a category, AND across categories — e.g. selecting
  // "dinner" + "dessert" + "oven" matches (dinner OR dessert) AND oven.
  function recipeMatchesTags(recipe) {
    if (activeTags.size === 0) return true;
    const byCategory = {};
    activeTags.forEach((tag) => {
      const category = TAG_CATEGORIES[tag] || OTHER_LABEL;
      (byCategory[category] = byCategory[category] || []).push(tag);
    });
    return Object.values(byCategory).every((tagsInCategory) =>
      tagsInCategory.some((tag) => recipe.tags.includes(tag))
    );
  }

  function sortRecipes(list) {
    const sorted = list.slice();
    switch (sortSelect.value) {
      case "title-desc":
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "recent":
        sorted.reverse();
        break;
      case "title-asc":
      default:
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
    return sorted;
  }

  function render() {
    const query = searchInput.value.trim();
    const filtered = recipes.filter(
      (r) => recipeMatchesQuery(r, query) && recipeMatchesTags(r)
    );
    const sorted = sortRecipes(filtered);

    grid.innerHTML = sorted
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

    emptyState.hidden = sorted.length !== 0;
    clearFiltersBtn.hidden = activeTags.size === 0;
  }

  function buildTagGroups() {
    const counts = new Map();
    recipes.forEach((r) => {
      r.tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
    });

    const tagsByCategory = new Map();
    counts.forEach((_, tag) => {
      const category = TAG_CATEGORIES[tag] || OTHER_LABEL;
      if (!tagsByCategory.has(category)) tagsByCategory.set(category, []);
      tagsByCategory.get(category).push(tag);
    });

    const groups = [];
    const otherTags = [];

    CATEGORY_ORDER.forEach((category) => {
      const tags = tagsByCategory.get(category);
      if (!tags) return;
      if (tags.length >= MIN_TAGS_FOR_OWN_SECTION) {
        groups.push({ label: category, tags: tags.sort() });
      } else {
        otherTags.push(...tags);
      }
    });

    // Any category not in CATEGORY_ORDER (or explicitly OTHER_LABEL) also
    // falls back to "Other".
    tagsByCategory.forEach((tags, category) => {
      if (category === OTHER_LABEL || !CATEGORY_ORDER.includes(category)) {
        otherTags.push(...tags);
      }
    });

    if (otherTags.length) {
      groups.push({ label: OTHER_LABEL, tags: Array.from(new Set(otherTags)).sort() });
    }

    return { groups, counts };
  }

  function renderTagFilters() {
    const { groups, counts } = buildTagGroups();

    tagFiltersEl.innerHTML = groups
      .map((group) => {
        const optionsHtml = group.tags
          .map((tag) => {
            const count = counts.get(tag);
            const id = `tag-${tag}`;
            return `
              <label class="tag-option" for="${id}">
                <input type="checkbox" id="${id}" data-tag="${escapeHtml(tag)}" />
                <span>${escapeHtml(tag)}</span>
                <span class="tag-count">${count}</span>
              </label>
            `;
          })
          .join("");
        return `
          <fieldset class="tag-group">
            <legend class="tag-group-label">${escapeHtml(group.label)}</legend>
            ${optionsHtml}
          </fieldset>
        `;
      })
      .join("");

    tagFiltersEl.querySelectorAll("input[type=checkbox]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const tag = checkbox.dataset.tag;
        if (checkbox.checked) activeTags.add(tag);
        else activeTags.delete(tag);
        render();
      });
    });
  }

  searchInput.addEventListener("input", render);
  sortSelect.addEventListener("change", render);

  clearFiltersBtn.addEventListener("click", () => {
    activeTags.clear();
    tagFiltersEl.querySelectorAll("input[type=checkbox]").forEach((cb) => {
      cb.checked = false;
    });
    render();
  });

  filterToggle.addEventListener("click", () => {
    const isOpen = sidebar.classList.toggle("open");
    filterToggle.setAttribute("aria-expanded", String(isOpen));
  });

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
