(function () {
  const container = document.getElementById("recipe-detail");
  const notFound = document.getElementById("not-found");

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  const FRACTIONS = [
    [0.125, "⅛"], // 1/8
    [0.25, "¼"], // 1/4
    [0.333, "⅓"], // 1/3
    [0.375, "⅜"], // 3/8
    [0.5, "½"], // 1/2
    [0.625, "⅝"], // 5/8
    [0.667, "⅔"], // 2/3
    [0.75, "¾"], // 3/4
    [0.875, "⅞"], // 7/8
  ];

  function formatAmount(amount) {
    if (amount === null || amount === undefined || amount === "") return "";
    const whole = Math.floor(amount);
    const frac = amount - whole;
    if (frac < 0.02) return String(whole || 0) === "0" ? "0" : String(whole);
    for (const [dec, symbol] of FRACTIONS) {
      if (Math.abs(frac - dec) < 0.02) {
        return whole > 0 ? `${whole}${symbol}` : symbol;
      }
    }
    return (Math.round(amount * 100) / 100).toString();
  }

  function getIdFromQuery() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  // Groups consecutive items that share a "group" field into
  // { group, items } buckets, preserving order. Items without a group
  // are bucketed under group: null so ungrouped recipes render flat.
  function groupConsecutive(items) {
    const buckets = [];
    for (const item of items) {
      const group = item.group || null;
      const last = buckets[buckets.length - 1];
      if (last && last.group === group) {
        last.items.push(item);
      } else {
        buckets.push({ group, items: [item] });
      }
    }
    return buckets;
  }

  function renderRecipe(recipe) {
    document.title = `${recipe.title} - My Recipe Book`;

    const tagsHtml = recipe.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");

    const metaParts = [];
    if (recipe.prepTime) metaParts.push(`Prep: ${escapeHtml(recipe.prepTime)}`);
    if (recipe.cookTime) metaParts.push(`Cook: ${escapeHtml(recipe.cookTime)}`);

    const baseServings = recipe.servings || 1;
    const servingUnit = recipe.servingUnit || "servings";

    const imagesHtml =
      recipe.images && recipe.images.length
        ? `<div class="recipe-photos">${recipe.images
            .map(
              (src) =>
                `<a href="${escapeHtml(src)}" target="_blank" rel="noopener"><img src="${escapeHtml(
                  src
                )}" alt="${escapeHtml(recipe.title)}" loading="lazy" /></a>`
            )
            .join("")}</div>`
        : "";

    container.innerHTML = `
      <h1>${escapeHtml(recipe.title)}</h1>
      <div class="meta-row">${metaParts.join(" &middot; ")}</div>
      <div class="tags">${tagsHtml}</div>
      ${imagesHtml}

      <div class="servings-control no-print">
        <button id="servings-minus" aria-label="Decrease servings">&minus;</button>
        <span id="servings-value">${baseServings} ${escapeHtml(servingUnit)}</span>
        <button id="servings-plus" aria-label="Increase servings">+</button>
      </div>

      <button class="print-btn no-print" id="print-btn">Print recipe</button>

      <div class="recipe-columns">
        <section>
          <h2>Ingredients</h2>
          <div id="ingredients-list"></div>
        </section>
        <section>
          <h2>Instructions</h2>
          <div id="instructions-list"></div>
          ${
            recipe.notes
              ? `<div class="notes-box"><strong>Notes:</strong> ${escapeHtml(recipe.notes)}</div>`
              : ""
          }
        </section>
      </div>
    `;

    let currentServings = baseServings;
    const servingsValueEl = document.getElementById("servings-value");
    const ingredientsListEl = document.getElementById("ingredients-list");
    const instructionsListEl = document.getElementById("instructions-list");

    function renderIngredients() {
      const multiplier = currentServings / baseServings;
      const buckets = groupConsecutive(recipe.ingredients);
      ingredientsListEl.innerHTML = buckets
        .map(({ group, items }) => {
          const heading = group ? `<h3 class="group-heading">${escapeHtml(group)}</h3>` : "";
          const li = items
            .map((ing) => {
              const scaledAmount =
                typeof ing.amount === "number" ? formatAmount(ing.amount * multiplier) : "";
              const amountText = [scaledAmount, ing.unit].filter(Boolean).join(" ");
              return `<li><span class="amount">${escapeHtml(amountText)}</span><span>${escapeHtml(
                ing.item
              )}</span></li>`;
            })
            .join("");
          return `${heading}<ul class="ingredient-group">${li}</ul>`;
        })
        .join("");
    }

    function renderInstructions() {
      const normalized = recipe.instructions.map((step) =>
        typeof step === "string" ? { group: null, text: step } : { group: step.group || null, text: step.text }
      );
      const buckets = groupConsecutive(normalized);
      instructionsListEl.innerHTML = buckets
        .map(({ group, items }) => {
          const heading = group ? `<h3 class="group-heading">${escapeHtml(group)}</h3>` : "";
          const li = items.map((step) => `<li>${escapeHtml(step.text)}</li>`).join("");
          return `${heading}<ol class="instruction-group">${li}</ol>`;
        })
        .join("");
    }

    document.getElementById("servings-minus").addEventListener("click", () => {
      if (currentServings > 1) {
        currentServings -= 1;
        servingsValueEl.textContent = `${currentServings} ${servingUnit}`;
        renderIngredients();
      }
    });

    document.getElementById("servings-plus").addEventListener("click", () => {
      currentServings += 1;
      servingsValueEl.textContent = `${currentServings} ${servingUnit}`;
      renderIngredients();
    });

    document.getElementById("print-btn").addEventListener("click", () => {
      window.print();
    });

    renderIngredients();
    renderInstructions();
  }

  const id = getIdFromQuery();
  if (!id) {
    notFound.hidden = false;
  } else {
    fetch("data/recipes.json")
      .then((res) => res.json())
      .then((data) => {
        const recipe = data.find((r) => r.id === id);
        if (!recipe) {
          notFound.hidden = false;
          return;
        }
        renderRecipe(recipe);
      })
      .catch(() => {
        notFound.hidden = false;
      });
  }
})();
