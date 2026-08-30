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

  // Swipeable photo lightbox — ported from the Grandma's 80th Birthday photo
  // album project (MM80). The track holds 3 slides (prev/current/next) side
  // by side; dragging moves the track 1:1 with the pointer so the
  // neighboring photo peeks in as you go, like Instagram. Releasing past a
  // distance threshold finishes the slide into place, otherwise it springs
  // back to the current photo.
  const lightbox = document.getElementById("lightbox");
  const lightboxViewport = lightbox.querySelector(".lightbox-viewport");
  const lightboxTrack = lightbox.querySelector(".lightbox-track");
  const prevSlide = lightbox.querySelector('[data-slide="prev"]');
  const currentSlide = lightbox.querySelector('[data-slide="current"]');
  const nextSlide = lightbox.querySelector('[data-slide="next"]');
  const lightboxCloseBtn = lightbox.querySelector(".lightbox-close");
  const lightboxPrevBtn = lightbox.querySelector(".lightbox-prev");
  const lightboxNextBtn = lightbox.querySelector(".lightbox-next");

  let lightboxPhotos = [];
  let currentIndex = 0;
  let viewportWidth = 0;
  let dragStartX = null;
  let dragOffset = 0;
  let activePointerId = null;
  let isAnimating = false;

  // No wrap-around: past either end there's simply no photo to show.
  function photoAt(offset) {
    const index = currentIndex + offset;
    if (index < 0 || index >= lightboxPhotos.length) return null;
    return lightboxPhotos[index];
  }

  // Past either end of the photo list there's no neighboring photo, so
  // src would otherwise be "" — an empty img src still renders the
  // browser's broken-image icon/border, which peeks through as a stray
  // line during the edge-resistance drag. Use visibility (not display or
  // the hidden attribute) so the slide stays invisible but still holds
  // its 33.3333% share of the track's width — collapsing it would throw
  // off the other two slides' positions.
  function setSlide(imgEl, src) {
    if (src) {
      imgEl.style.visibility = "";
      imgEl.src = src;
    } else {
      imgEl.style.visibility = "hidden";
      imgEl.removeAttribute("src");
    }
  }

  function updateSlides() {
    setSlide(prevSlide, photoAt(-1));
    setSlide(currentSlide, photoAt(0));
    setSlide(nextSlide, photoAt(1));
    lightboxPrevBtn.disabled = currentIndex === 0;
    lightboxNextBtn.disabled = currentIndex === lightboxPhotos.length - 1;
  }

  function setTrackPosition(offsetPx, withTransition) {
    lightboxTrack.style.transition = withTransition ? "transform 0.25s ease" : "none";
    lightboxTrack.style.transform = `translateX(${-viewportWidth + offsetPx}px)`;
  }

  function openLightbox(photos, index) {
    lightboxPhotos = photos;
    currentIndex = index;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    viewportWidth = lightboxViewport.getBoundingClientRect().width;
    updateSlides();
    setTrackPosition(0, false);
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = "";
  }

  // direction: 1 to advance to the next photo, -1 for the previous photo, or
  // 0 to just spring back to the current one. Springs back (rather than
  // moving) if direction points past either end - no wrap-around.
  function settleTo(direction) {
    if (isAnimating) return;

    const targetIndex = currentIndex + direction;
    const canMove = direction !== 0 && targetIndex >= 0 && targetIndex < lightboxPhotos.length;

    if (!canMove) {
      setTrackPosition(0, true);
      return;
    }

    isAnimating = true;
    setTrackPosition(-direction * viewportWidth, true);
    lightboxTrack.addEventListener(
      "transitionend",
      () => {
        currentIndex = targetIndex;
        updateSlides();
        setTrackPosition(0, false);
        isAnimating = false;
      },
      { once: true }
    );
  }

  function showNext() {
    settleTo(1);
  }

  function showPrev() {
    settleTo(-1);
  }

  lightboxCloseBtn.addEventListener("click", closeLightbox);
  lightboxNextBtn.addEventListener("click", showNext);
  lightboxPrevBtn.addEventListener("click", showPrev);

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (event) => {
    if (lightbox.hidden) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowRight") showNext();
    if (event.key === "ArrowLeft") showPrev();
  });

  window.addEventListener("resize", () => {
    if (lightbox.hidden) return;
    viewportWidth = lightboxViewport.getBoundingClientRect().width;
    setTrackPosition(dragStartX === null ? 0 : dragOffset, false);
  });

  // Drag-to-swipe (touch, mouse, and pen alike via Pointer Events)
  const DRAG_THRESHOLD_RATIO = 0.2;

  lightboxViewport.addEventListener("pointerdown", (event) => {
    if (isAnimating) return;
    activePointerId = event.pointerId;
    dragStartX = event.clientX;
    dragOffset = 0;
    lightboxViewport.setPointerCapture(activePointerId);
  });

  // At either end, dragging toward the missing photo gets heavy resistance
  // instead of moving 1:1, so it reads as "hit the end" rather than
  // dragging into blank space.
  function withEdgeResistance(offset) {
    const atStart = currentIndex === 0;
    const atEnd = currentIndex === lightboxPhotos.length - 1;
    if ((offset > 0 && atStart) || (offset < 0 && atEnd)) return offset / 4;
    return offset;
  }

  lightboxViewport.addEventListener("pointermove", (event) => {
    if (dragStartX === null || event.pointerId !== activePointerId) return;
    dragOffset = event.clientX - dragStartX;
    setTrackPosition(withEdgeResistance(dragOffset), false);
  });

  function endDrag(event) {
    if (dragStartX === null || event.pointerId !== activePointerId) return;

    const threshold = viewportWidth * DRAG_THRESHOLD_RATIO;
    if (dragOffset <= -threshold) {
      settleTo(1);
    } else if (dragOffset >= threshold) {
      settleTo(-1);
    } else {
      settleTo(0);
    }

    dragStartX = null;
    dragOffset = 0;
    activePointerId = null;
  }

  lightboxViewport.addEventListener("pointerup", endDrag);
  lightboxViewport.addEventListener("pointercancel", endDrag);

  function renderRecipe(recipe) {
    document.title = `${recipe.title} - Cheoklate's Recipe Book`;

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
              (src, i) =>
                `<button type="button" class="photo-thumb" data-index="${i}"><img src="${escapeHtml(
                  src
                )}" alt="${escapeHtml(recipe.title)}" loading="lazy" /></button>`
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

    container.querySelectorAll(".photo-thumb").forEach((btn) => {
      btn.addEventListener("click", () => openLightbox(recipe.images, Number(btn.dataset.index)));
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
