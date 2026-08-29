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

  function renderRecipe(recipe) {
    document.title = `${recipe.title} - My Recipe Book`;

    const tagsHtml = recipe.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");

    const metaParts = [];
    if (recipe.prepTime) metaParts.push(`Prep: ${escapeHtml(recipe.prepTime)}`);
    if (recipe.cookTime) metaParts.push(`Cook: ${escapeHtml(recipe.cookTime)}`);

    const baseServings = recipe.servings || 1;
    const servingUnit = recipe.servingUnit || "servings";

    container.innerHTML = `
      <h1>${escapeHtml(recipe.title)}</h1>
      <div class="meta-row">${metaParts.join(" &middot; ")}</div>
      <div class="tags">${tagsHtml}</div>

      <div class="servings-control no-print">
        <button id="servings-minus" aria-label="Decrease servings">&minus;</button>
        <span id="servings-value">${baseServings} ${escapeHtml(servingUnit)}</span>
        <button id="servings-plus" aria-label="Increase servings">+</button>
      </div>

      <button class="print-btn no-print" id="print-btn">Print recipe</button>

      <div class="recipe-columns">
        <section>
          <h2>Ingredients</h2>
          <ul id="ingredients-list"></ul>
        </section>
        <section>
          <h2>Instructions</h2>
          <ol id="instructions-list">
            ${recipe.instructions.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
          </ol>
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

    function renderIngredients() {
      const multiplier = currentServings / baseServings;
      ingredientsListEl.innerHTML = recipe.ingredients
        .map((ing) => {
          const scaledAmount =
            typeof ing.amount === "number" ? formatAmount(ing.amount * multiplier) : "";
          const amountText = [scaledAmount, ing.unit].filter(Boolean).join(" ");
          return `<li><span class="amount">${escapeHtml(amountText)}</span><span>${escapeHtml(
            ing.item
          )}</span></li>`;
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
