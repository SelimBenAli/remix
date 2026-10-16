/* Catalogue pages backed by the public Flask storefront API. */
const PAGE_SIZE = 8;
const SWATCH_COLORS = ["#780000", "#C1121F", "#003049", "#669BBC", "#5c3d2e"];

function cardMedia(item, index) {
  const color = SWATCH_COLORS[index % SWATCH_COLORS.length];
  const galleryImages = item.images?.filter((image) => !image.useInShowroom && !image.showroomPlaceholder) || [];
  const images = galleryImages.length ? galleryImages : (item.imageUrl ? [{ url: item.imageUrl }] : []);
  if (!images.length) return `<span aria-hidden="true">${item.kind === "swap" ? "✦" : "✧"}</span>`;
  return `<div class="product-gallery" data-product-gallery>${images.map((image, i) =>
    `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(item.name)}${images.length > 1 ? `, image ${i + 1} of ${images.length}` : ""}" ${i ? "hidden" : ""} loading="lazy">`).join("")}${images.length > 1 ? `<button type="button" class="gallery-prev" aria-label="Previous image">‹</button><button type="button" class="gallery-next" aria-label="Next image">›</button><span class="gallery-count">1 / ${images.length}</span>` : ""}</div>`;
}

function bindProductGalleries(root) {
  root.querySelectorAll("[data-product-gallery]").forEach((gallery) => {
    const slides = Array.from(gallery.querySelectorAll("img"));
    let active = 0;
    const count = gallery.querySelector(".gallery-count");
    const show = (index) => {
      active = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => { slide.hidden = i !== active; });
      if (count) count.textContent = `${active + 1} / ${slides.length}`;
    };
    gallery.querySelector(".gallery-prev")?.addEventListener("click", () => show(active - 1));
    gallery.querySelector(".gallery-next")?.addEventListener("click", () => show(active + 1));
  });
}

function initBasesCatalogue() {
  const grid = document.querySelector("[data-bases-grid]");
  if (!grid) return;
  const chipRow = document.querySelector("[data-bases-filters]");
  const sortSelect = document.querySelector("[data-bases-sort]");
  const countEl = document.querySelector("[data-bases-count]");
  const moreBtn = document.querySelector("[data-bases-more]");
  const status = document.querySelector("[data-bases-status]");
  let items = [];
  let activeType = "All";
  let visibleCount = PAGE_SIZE;

  async function load() {
    grid.innerHTML = '<div class="empty-state">Loading bases…</div>';
    try {
      const params = new URLSearchParams({ sort: sortSelect.value });
      if (activeType !== "All") params.set("type", activeType);
      items = await storeApi(`/store/bases?${params}`);
      render();
    } catch (error) {
      grid.innerHTML = `<div class="empty-state">${escapeHtml(error.message)} <button class="btn btn-outline" data-retry-bases>Retry</button></div>`;
      grid.querySelector("[data-retry-bases]")?.addEventListener("click", load);
      countEl.textContent = "";
      moreBtn.style.display = "none";
    }
  }

  function render() {
    const shown = items.slice(0, visibleCount);
    grid.innerHTML = shown.length ? shown.map((base, i) => `
      <div class="product-card ${base.inStock === false ? "is-soldout" : ""}">
        <div class="product-media product-card-open" style="background:${SWATCH_COLORS[i % SWATCH_COLORS.length]}" data-product-href="/product/base/${base.id}" role="link" tabindex="0" aria-label="View ${escapeHtml(base.name)}">${cardMedia(base, i)}</div>
        <div class="product-body">
          ${base.inStock === false ? `<span class="product-flag is-soldout">${base.orderedEvenOutOfStock ? "Pre-order" : "Out of Stock"}</span>` : base.badge ? `<span class="product-flag">${escapeHtml(base.badge)}</span>` : ""}
          <a class="product-name product-detail-link" href="/product/base/${base.id}">${escapeHtml(base.name)}</a>
          <span class="product-price">${formatPrice(base.price)}</span>
        </div>
        <button class="add-btn" data-add-base="${base.id}">${base.sizes?.length || base.inStock === false && !base.orderedEvenOutOfStock ? "Choose options" : base.inStock === false ? "Pre-order" : "Add Base"}</button>
      </div>`).join("") : '<div class="empty-state">No bases match that filter yet — try another category.</div>';
    bindProductGalleries(grid);
    grid.querySelectorAll("[data-product-href]").forEach((media) => {
      media.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;
        window.location.href = media.dataset.productHref;
      });
      media.addEventListener("keydown", (event) => {
        if (event.target !== media || !["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        window.location.href = media.dataset.productHref;
      });
    });
    countEl.textContent = `${Math.min(visibleCount, items.length)} of ${items.length} bases`;
    moreBtn.style.display = visibleCount >= items.length ? "none" : "inline-flex";
    status.textContent = visibleCount >= items.length ? "You've reached the end of the rack." : "";
    grid.querySelectorAll("[data-add-base]").forEach((button) => button.addEventListener("click", async () => {
      const base = items.find((item) => String(item.id) === button.dataset.addBase);
      if (base?.sizes?.length || base?.inStock === false && !base?.orderedEvenOutOfStock) { window.location.href = `/product/base/${base.id}`; return; }
      button.disabled = true;
      try { await addToCart("base", Number(button.dataset.addBase)); }
      catch (error) { showToast(error.message); }
      finally { button.disabled = false; }
    }));
  }

  async function loadTypes() {
    try {
      const allBases = await storeApi("/store/bases");
      const types = ["All", ...new Set(allBases.map((base) => base.type))];
      chipRow.innerHTML = types.map((type) => `<button class="chip ${type === activeType ? "is-active" : ""}" data-type="${escapeHtml(type)}">${escapeHtml(type)}${type === "All" ? "" : "s"}</button>`).join("");
    } catch (_) {
      chipRow.innerHTML = '<button class="chip is-active" data-type="All">All</button>';
    }
  }
  chipRow.addEventListener("click", (event) => {
    const button = event.target.closest("[data-type]");
    if (!button) return;
    activeType = button.dataset.type;
    visibleCount = PAGE_SIZE;
    chipRow.querySelectorAll(".chip").forEach((chip) => chip.classList.toggle("is-active", chip === button));
    load();
  });
  sortSelect.addEventListener("change", () => { visibleCount = PAGE_SIZE; load(); });
  moreBtn.addEventListener("click", () => { visibleCount += PAGE_SIZE; render(); });
  loadTypes();
  load();
}

function initSwapsCatalogue() {
  const grid = document.querySelector("[data-swaps-grid]");
  if (!grid) return;
  const chipRow = document.querySelector("[data-swaps-filters]");
  const sortSelect = document.querySelector("[data-swaps-sort]");
  const countEl = document.querySelector("[data-swaps-count]");
  const moreBtn = document.querySelector("[data-swaps-more]");
  const status = document.querySelector("[data-swaps-status]");
  const mixModal = document.querySelector("[data-mix-modal]");
  const sizeChoices = document.querySelector("[data-mix-sizes]");
  const swapQuantityValue = document.querySelector("[data-mix-quantity-value]");
  const mixQuantityButtons = document.querySelectorAll("[data-mix-quantity-change]");
  const mixSubmit = document.querySelector("[data-mix-submit]");
  const mixStage = document.querySelector("[data-mix-preview]");
  const mixDropzone = document.querySelector("[data-mix-dropzone]");
  const mixZoom = document.querySelector("[data-mix-art-zoom]");
  const mixReset = document.querySelector("[data-mix-art-reset]");
  const cartBaseImage = document.querySelector("[data-cart-base-image]");
  const cartBaseShowroom = document.querySelector("[data-cart-base-showroom]");
  const cartBaseEmpty = document.querySelector("[data-cart-base-empty]");
  const cartBaseName = document.querySelector("[data-cart-base-name]");
  const cartBaseMeta = document.querySelector("[data-cart-base-meta]");
  const cartBasePicker = document.querySelector("[data-cart-base-picker]");
  const cartBaseOptions = document.querySelector("[data-cart-base-options]");
  const cartBaseOpenButtons = document.querySelectorAll("[data-cart-base-open]");
  const MIX_DESIGN_WIDTH = 458;
  const MIX_HOLE = { x1: 169, x2: 286, y1: 171, y2: 364 };
  const getMixArtDefault = () => window.matchMedia("(max-width: 760px)").matches
    ? { width: 43.9165, left: 27.3691, top: 32.5366 }
    : { width: 51.9165, left: 23.3691, top: 32.5366 };
  let artworkBounds = null;
  const artworkTransform = { x: 0, y: 0, z: 1 };
  let artworkDrag = null;
  let artworkInteracted = false;
  let bases = [], selectedCartBaseId = "", activeSwap = null, selectedBaseSize = "", swapQuantity = 1;
  const requestedArtist = new URLSearchParams(location.search).get("artist");
  let items = [];
  let activeCategory = "All";
  const categories = ["All", "Nature & Scenery", "Anime", "Fantasy", "Asian", "Cute", "Funny", "Floral", "Music", "Abstract", "Food & Drink"];
  let visibleCount = PAGE_SIZE;

  function itemCategories(swap) {
    const name = swap.name.toLowerCase();
    const matches = [];
    if (/fungi|garden|floral|wild fire|lunar|morning ritual|matcha/.test(name)) matches.push("Nature & Scenery");
    if (/ryujin|yamato|dim sum/.test(name)) matches.push("Asian");
    if (/ryujin|yamato|sword|lunar|wild fire|imaginary/.test(name)) matches.push("Fantasy");
    if (/ryujin|yamato/.test(name)) matches.push("Anime");
    if (/feline|cat|sugar rush|imaginary friends/.test(name)) matches.push("Cute");
    if (/sugar rush|coffee|matcha|dim sum|morning ritual/.test(name)) matches.push("Food & Drink");
    if (/sugar rush|imaginary friends|what a time/.test(name)) matches.push("Cute", "Funny");
    if (/retro wave|soul of|coffee dark liquid/.test(name)) matches.push("Music", "Abstract");
    if (/toxic|sword of damocles/.test(name)) matches.push("Grunge");
    if (/garden florals|fungi/.test(name)) matches.push("Floral");
    return matches;
  }

  function cartBaseImageUrl(base) {
    const showroom = base?.images?.find((image) => image.useInShowroom);
    return showroom?.url || base?.imageUrl || "";
  }
  function updateCartBaseShowroom() {
    const base = bases.find((item) => String(item.id) === String(selectedCartBaseId));
    cartBaseShowroom?.classList.toggle("has-selected-base", Boolean(base));
    document.body.classList.toggle("has-cart-base", Boolean(base));
    const imageUrl = cartBaseImageUrl(base);
    if (cartBaseImage) {
      cartBaseImage.hidden = !imageUrl;
      if (imageUrl && cartBaseImage.getAttribute("src") !== imageUrl) cartBaseImage.src = imageUrl;
      cartBaseImage.alt = base ? `${base.name} showroom image` : "Base in your cart";
    }
    if (cartBaseEmpty) {
      cartBaseEmpty.hidden = Boolean(imageUrl);
      cartBaseEmpty.textContent = bases.length ? "This base has no showroom image yet." : "Add a base to your bag to preview swaps on it.";
    }
    if (cartBaseName) cartBaseName.textContent = base?.name || (bases.length ? "Choose a base" : "Your bag is waiting");
    if (cartBaseMeta) cartBaseMeta.textContent = base ? `${base.type || "REMIX base"} · ${formatPrice(base.price)}` : "Choose a base to start styling";
    cartBaseOpenButtons.forEach((button) => { button.disabled = bases.length < 2; });
    renderCartBasePicker();
  }
  function renderCartBasePicker() {
    if (!cartBaseOptions) return;
    if (!bases.length) {
      cartBaseOptions.innerHTML = '<p class="cart-base-picker-empty">There are no bases in your bag yet.</p>';
      return;
    }
    cartBaseOptions.innerHTML = bases.map((base) => {
      const imageUrl = cartBaseImageUrl(base);
      const selected = String(base.id) === String(selectedCartBaseId);
      return `<button class="cart-base-choice ${selected ? "is-selected" : ""}" type="button" data-cart-base-choice="${base.id}" aria-pressed="${selected}">
        ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="">` : '<span class="cart-base-choice-image" aria-hidden="true">✧</span>'}
        <span><strong>${escapeHtml(base.name)}</strong><small>${escapeHtml(base.type || "REMIX base")} · ${formatPrice(base.price)}</small></span>
        <span class="cart-base-choice-check" aria-hidden="true">${selected ? "✓" : ""}</span>
      </button>`;
    }).join("");
  }
  async function loadCartBases() {
    bases = await storeApi("/store/cart/bases");
    if (!bases.some((base) => String(base.id) === String(selectedCartBaseId))) selectedCartBaseId = bases.length ? String(bases[0].id) : "";
    updateCartBaseShowroom();
    return bases;
  }
  function chooseCartBase(baseId) {
    const base = bases.find((item) => String(item.id) === String(baseId));
    if (!base) return;
    selectedCartBaseId = String(base.id);
    updateCartBaseShowroom();
    if (activeSwap) renderMixSizes();
    cartBasePicker?.close();
  }

  function renderFilters() {
    chipRow.innerHTML = categories.map((category) =>
      `<button type="button" class="chip ${category === activeCategory ? "is-active" : ""}" data-swap-category="${escapeHtml(category)}" aria-pressed="${category === activeCategory}">${escapeHtml(category)}</button>`).join("");
  }
  function selectedMixBase() { return bases.find((base) => String(base.id) === String(selectedCartBaseId)); }
  const mixPercent = (value) => `${value / MIX_DESIGN_WIDTH * 100}%`;
  function findArtworkBounds(image) {
    const fallback = { x1: 0, y1: 0, x2: image.naturalWidth, y2: image.naturalHeight };
    try {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let x1 = canvas.width, y1 = canvas.height, x2 = 0, y2 = 0;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] > 10) {
          if (x < x1) x1 = x;
          if (x > x2) x2 = x;
          if (y < y1) y1 = y;
          if (y > y2) y2 = y;
        }
      }
      return x2 > x1 && y2 > y1 ? { x1, y1, x2, y2 } : fallback;
    } catch (_) {
      // Some source images may disallow canvas inspection; fit the whole image in that case.
      return fallback;
    }
  }
  function clampArtwork() {
    if (!artworkBounds || !artworkInteracted) return;
    const mixArtDefault = getMixArtDefault();
    const bw = artworkBounds.x2 - artworkBounds.x1;
    const bh = artworkBounds.y2 - artworkBounds.y1;
    const imageWidth = mixArtDefault.width / 100 * MIX_DESIGN_WIDTH * artworkTransform.z;
    const scale = imageWidth / (mixModal.querySelector("[data-mix-art-image]")?.naturalWidth || 1);
    const left = mixArtDefault.left / 100 * MIX_DESIGN_WIDTH - (imageWidth - mixArtDefault.width / 100 * MIX_DESIGN_WIDTH) / 2;
    const top = mixArtDefault.top / 100 * MIX_DESIGN_WIDTH - (imageWidth - mixArtDefault.width / 100 * MIX_DESIGN_WIDTH) / 2;
    const lowX = MIX_HOLE.x2 - (left + artworkBounds.x2 * scale);
    const highX = MIX_HOLE.x1 - (left + artworkBounds.x1 * scale);
    const lowY = MIX_HOLE.y2 - (top + artworkBounds.y2 * scale);
    const highY = MIX_HOLE.y1 - (top + artworkBounds.y1 * scale);
    if (lowX <= highX) artworkTransform.x = Math.min(highX, Math.max(lowX, artworkTransform.x));
    if (lowY <= highY) artworkTransform.y = Math.min(highY, Math.max(lowY, artworkTransform.y));
  }
  function layoutArtwork() {
    const patch = mixModal?.querySelector("[data-mix-art-image]");
    const base = mixModal?.querySelector("[data-mix-base-image]");
    if (!patch || !mixStage || !patch.naturalWidth) return;
    if (!base || base.hidden) {
      Object.assign(patch.style, { width: "76%", left: "12%", top: "12%" });
      if (mixDropzone) mixDropzone.hidden = true;
      return;
    }
    if (!artworkBounds) artworkBounds = findArtworkBounds(patch);
    const mixArtDefault = getMixArtDefault();
    const defaultWidth = mixArtDefault.width / 100 * MIX_DESIGN_WIDTH;
    const imageWidth = defaultWidth * artworkTransform.z;
    clampArtwork();
    const left = mixArtDefault.left / 100 * MIX_DESIGN_WIDTH - (imageWidth - defaultWidth) / 2 + artworkTransform.x;
    const top = mixArtDefault.top / 100 * MIX_DESIGN_WIDTH - (imageWidth - defaultWidth) / 2 + artworkTransform.y;
    Object.assign(patch.style, {
      width: `${mixArtDefault.width * artworkTransform.z}%`,
      left: artworkTransform.x === 0 && artworkTransform.z === 1 ? `${mixArtDefault.left}%` : mixPercent(left),
      top: artworkTransform.y === 0 && artworkTransform.z === 1 ? `${mixArtDefault.top}%` : mixPercent(top),
    });
    if (mixZoom) mixZoom.value = String(artworkTransform.z);
    if (mixDropzone) {
      Object.assign(mixDropzone.style, {
        left: mixPercent(MIX_HOLE.x1), top: mixPercent(MIX_HOLE.y1),
        width: mixPercent(MIX_HOLE.x2 - MIX_HOLE.x1 + 1),
        height: mixPercent(MIX_HOLE.y2 - MIX_HOLE.y1 + 1),
      });
      mixDropzone.hidden = false;
    }
  }
  function renderArtwork() { clampArtwork(); layoutArtwork(); }

  mixDropzone?.addEventListener("pointerdown", (event) => {
    mixDropzone.setPointerCapture(event.pointerId);
    artworkDrag = { pointerX: event.clientX, pointerY: event.clientY, x: artworkTransform.x, y: artworkTransform.y };
  });
  mixDropzone?.addEventListener("pointermove", (event) => {
    if (!artworkDrag || !mixStage) return;
    const scale = MIX_DESIGN_WIDTH / mixStage.getBoundingClientRect().width;
    artworkTransform.x = artworkDrag.x + (event.clientX - artworkDrag.pointerX) * scale;
    artworkTransform.y = artworkDrag.y + (event.clientY - artworkDrag.pointerY) * scale;
    artworkInteracted = true;
    renderArtwork();
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => mixDropzone?.addEventListener(eventName, () => { artworkDrag = null; }));
  mixDropzone?.addEventListener("wheel", (event) => {
    event.preventDefault();
    artworkTransform.z = Math.min(2.5, Math.max(1, artworkTransform.z * (event.deltaY < 0 ? 1.04 : .96)));
    artworkInteracted = true;
    renderArtwork();
  }, { passive: false });
  mixZoom?.addEventListener("input", () => { artworkTransform.z = Number(mixZoom.value); artworkInteracted = true; renderArtwork(); });
  mixReset?.addEventListener("click", () => { Object.assign(artworkTransform, { x: 0, y: 0, z: 1 }); artworkInteracted = false; renderArtwork(); });
  window.addEventListener("resize", renderArtwork);

  function updateMixPreview() {
    if (!activeSwap || !mixModal) return;
    const base = selectedMixBase();
    const baseImage = mixModal.querySelector("[data-mix-base-image]");
    const artImage = mixModal.querySelector("[data-mix-art-image]");
    const name = mixModal.querySelector("[data-mix-swap-name]");
    const artist = mixModal.querySelector("[data-mix-artist]");
    const bio = mixModal.querySelector("[data-mix-bio]");
    const avatar = mixModal.querySelector("[data-mix-avatar]");
    const price = mixModal.querySelector("[data-mix-price]");
    const priceLabel = mixModal.querySelector("[data-mix-price-label]");
    const stock = mixModal.querySelector("[data-mix-stock]");
    const error = mixModal.querySelector("[data-mix-error]");
    const showroomImage = base?.images?.find((image) => image.useInShowroom) || null;
    const baseShowroomUrl = showroomImage?.url || base?.imageUrl || "";
    if (baseImage) {
      if (baseImage.getAttribute("src") !== baseShowroomUrl) baseImage.src = baseShowroomUrl;
      baseImage.alt = base ? `${base.name} showroom preview` : "Selected base";
      baseImage.hidden = !baseShowroomUrl;
    }
    if (mixDropzone) mixDropzone.hidden = !baseShowroomUrl;
    const realSwapImage = activeSwap.originalImageUrl || activeSwap.images?.[0]?.originalUrl || activeSwap.imageUrl || "";
    if (artImage && artImage.getAttribute("src") !== realSwapImage) {
      artworkBounds = null;
      artImage.onerror = null;
      artImage.onload = () => { artworkBounds = findArtworkBounds(artImage); renderArtwork(); };
      artImage.alt = `${activeSwap.name} art panel`;
      artImage.hidden = !realSwapImage;
      if (realSwapImage && realSwapImage !== activeSwap.imageUrl) {
        artImage.onerror = () => {
          artImage.onerror = null;
          artImage.onload = () => { artworkBounds = findArtworkBounds(artImage); renderArtwork(); };
          artImage.src = activeSwap.imageUrl || "";
        };
      }
      artImage.src = realSwapImage;
    } else if (artImage) {
      artImage.alt = `${activeSwap.name} art panel`;
      artImage.hidden = !realSwapImage;
    }
    renderArtwork();
    if (name) name.textContent = activeSwap.name;
    if (artist) artist.textContent = activeSwap.artist || "Independent artist";
    if (bio) bio.textContent = activeSwap.artistBio || `${activeSwap.artist || "This artist"} creates original artwork for the REMIX community.`;
    if (avatar) avatar.textContent = (activeSwap.artist || "A").trim().charAt(0).toUpperCase();
    const swapTotal = (activeSwap.free ? 0 : Number(activeSwap.price) || 0) * swapQuantity;
    if (price) price.textContent = formatPrice(swapTotal);
    if (priceLabel) priceLabel.textContent = "Swap total";
    if (error) error.textContent = "";
    const swapInStock = activeSwap.inStock !== false;
    if (stock) {
      const out = !swapInStock;
      stock.textContent = swapInStock ? "Swap is available." : "Swap is out of stock.";
      stock.classList.toggle("is-out", out);
    }
    const swapCanOrder = activeSwap.orderedEvenOutOfStock || activeSwap.stockQuantity == null || Number(activeSwap.stockQuantity) >= swapQuantity;
    const canOrder = swapCanOrder;
    const blockedByStock = !canOrder;
    if (stock && blockedByStock) stock.textContent = "Out of stock. Choose another option to continue.";
    else if (stock && !swapInStock) stock.textContent = "Out of stock — pre-order is available.";
    const validQuantity = Number.isInteger(swapQuantity) && swapQuantity >= 1 && swapQuantity <= 20;
    if (mixSubmit) mixSubmit.disabled = !validQuantity || !canOrder;
  }
  function renderMixSizes() {
    const base = selectedMixBase();
    const cartSizes = base?.cartSizes || [];
    selectedBaseSize = cartSizes[0]?.size || "";
    if (!sizeChoices) return;
    sizeChoices.replaceChildren();
    cartSizes.forEach((entry) => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "mix-size";
      const label = document.createElement("strong"); label.textContent = entry.size;
      const quantity = document.createElement("small"); quantity.textContent = `${entry.quantity} in bag`;
      button.append(label, quantity);
      const selectedInitially = entry.size === selectedBaseSize;
      button.classList.toggle("is-selected", selectedInitially);
      button.setAttribute("aria-pressed", String(selectedInitially));
      button.addEventListener("click", () => {
        selectedBaseSize = entry.size;
        sizeChoices.querySelectorAll("button").forEach((option) => {
          const selected = option === button;
          option.classList.toggle("is-selected", selected);
          option.setAttribute("aria-pressed", String(selected));
        });
        updateMixPreview();
      });
      sizeChoices.appendChild(button);
    });
    if (!cartSizes.length) {
      const note = document.createElement("span");
      note.textContent = !base
        ? "Add a base to your bag to choose its size."
        : (base.sizes?.length ? "No size is saved for this base in your bag." : "One size");
      sizeChoices.appendChild(note);
    }
    updateMixPreview();
  }
  function syncMixQuantityControls() {
    mixQuantityButtons.forEach((button) => {
      button.disabled = (swapQuantity === 1 && button.dataset.mixQuantityChange === "-1") ||
        (swapQuantity === 20 && button.dataset.mixQuantityChange === "1");
    });
  }
  async function openMixBuilder(swap) {
    if (!mixModal) return;
    activeSwap = swap;
    Object.assign(artworkTransform, { x: 0, y: 0, z: 1 });
    artworkBounds = null;
    artworkInteracted = false;
    swapQuantity = 1;
    if (swapQuantityValue) swapQuantityValue.textContent = "1";
    syncMixQuantityControls();
    mixModal.hidden = false;
    document.body.classList.add("no-scroll");
    const submit = mixModal.querySelector("[data-mix-submit]");
    const errorMessage = mixModal.querySelector("[data-mix-error]");
    if (errorMessage) errorMessage.textContent = "";
    if (submit) { submit.disabled = true; submit.textContent = "Loading…"; }
    try {
      await loadCartBases();
      if (submit) {
        submit.textContent = "Add swap";
        submit.disabled = false;
      }
      if (bases.length) {
        renderMixSizes();
      } else {
        sizeChoices?.replaceChildren();
        updateMixPreview();
      }
      mixModal.querySelector("[data-cart-base-open]")?.focus();
    } catch (error) {
      if (submit) { submit.textContent = "Bases unavailable"; submit.disabled = true; }
      const message = mixModal.querySelector("[data-mix-error]");
      if (message) message.textContent = `Could not load bases: ${error.message}`;
    }
  }
  cartBaseOpenButtons.forEach((button) => button.addEventListener("click", async () => {
    try {
      await loadCartBases();
      if (bases.length > 1 && cartBasePicker && !cartBasePicker.open) cartBasePicker.showModal();
    } catch (error) { showToast(`Could not load bases: ${error.message}`); }
  }));
  cartBaseOptions?.addEventListener("click", (event) => {
    const choice = event.target.closest("[data-cart-base-choice]");
    if (choice) chooseCartBase(choice.dataset.cartBaseChoice);
  });
  cartBasePicker?.querySelectorAll("[data-cart-base-close]").forEach((button) => button.addEventListener("click", () => cartBasePicker.close()));
  cartBasePicker?.addEventListener("click", (event) => { if (event.target === cartBasePicker) cartBasePicker.close(); });
  mixModal?.querySelectorAll("[data-mix-close]").forEach((button) => button.addEventListener("click", () => {
    mixModal.hidden = true; document.body.classList.remove("no-scroll");
  }));
  mixQuantityButtons.forEach((button) => button.addEventListener("click", () => {
    swapQuantity = Math.min(20, Math.max(1, swapQuantity + Number(button.dataset.mixQuantityChange)));
    if (swapQuantityValue) swapQuantityValue.textContent = String(swapQuantity);
    syncMixQuantityControls();
    updateMixPreview();
  }));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mixModal && !mixModal.hidden) {
      mixModal.hidden = true; document.body.classList.remove("no-scroll");
    }
  });
  mixSubmit?.addEventListener("click", async () => {
    const base = selectedMixBase();
    if (!activeSwap) return;
    mixSubmit.disabled = true;
    mixSubmit.textContent = "Adding your mix…";
    const error = mixModal.querySelector("[data-mix-error]");
    if (error) error.textContent = "";
    try {
      const cart = await storeApi("/store/cart/bundle", {
        method: "POST",
        body: JSON.stringify({ base_id: base?.id || null, base_size: selectedBaseSize || null, base_quantity: 0, swap_id: activeSwap.id, swap_quantity: swapQuantity }),
      });
      if (typeof currentCart !== "undefined") currentCart = cart;
      if (typeof updateCartCount === "function") updateCartCount();
      if (typeof renderCartDrawer === "function") renderCartDrawer();
      mixModal.hidden = true; document.body.classList.remove("no-scroll");
      showToast("Swap added to your bag");
    } catch (requestError) {
      if (error) error.textContent = requestError.message;
      mixSubmit.disabled = false;
      mixSubmit.textContent = "Add swap";
    }
  });
  async function load() {
    grid.innerHTML = '<div class="empty-state">Loading panels…</div>';
    try {
      const params = new URLSearchParams({ sort: sortSelect.value });
      items = await storeApi(`/store/swaps?${params}`);
      if (requestedArtist) items = items.filter((item) => item.artist?.toLowerCase() === requestedArtist.toLowerCase());
      render();
    } catch (error) {
      grid.innerHTML = `<div class="empty-state">${escapeHtml(error.message)} <button class="btn btn-outline" data-retry-swaps>Retry</button></div>`;
      grid.querySelector("[data-retry-swaps]")?.addEventListener("click", load);
      countEl.textContent = "";
      moreBtn.style.display = "none";
    }
  }
  function render() {
    const filtered = activeCategory === "All" ? items : items.filter((item) => itemCategories(item).includes(activeCategory));
    const shown = filtered.slice(0, visibleCount);
    grid.innerHTML = shown.length ? shown.map((swap, i) => `
      <div class="product-card">
        <div class="product-media" style="background:${SWATCH_COLORS[i % SWATCH_COLORS.length]}">${cardMedia({ ...swap, kind: "swap" }, i)}</div>
        <div class="product-body"><span class="product-artist">${escapeHtml(swap.artist)}</span><a class="product-name product-detail-link" href="/product/swap/${swap.id}">${escapeHtml(swap.name)}</a>
          <span class="product-price ${swap.free ? "is-free" : ""}">${swap.free ? "FREE" : formatPrice(swap.price)}</span></div>
        <button class="add-btn mix-trigger" data-mix-swap="${swap.id}">Let’s mix</button>
      </div>`).join("") : '<div class="empty-state">No panels from this artist yet — check back soon.</div>';
    bindProductGalleries(grid);
    countEl.textContent = `${Math.min(visibleCount, filtered.length)} of ${filtered.length} panels`;
    moreBtn.style.display = visibleCount >= filtered.length ? "none" : "inline-flex";
    status.textContent = visibleCount >= filtered.length ? "That's every panel in this set." : "";
    grid.querySelectorAll("[data-mix-swap]").forEach((button) => button.addEventListener("click", () => {
      const swap = filtered.find((item) => String(item.id) === button.dataset.mixSwap);
      if (swap) openMixBuilder(swap);
    }));
  }

  chipRow.addEventListener("click", (event) => {
    const button = event.target.closest("[data-swap-category]");
    if (!button) return;
    activeCategory = button.dataset.swapCategory;
    visibleCount = PAGE_SIZE;
    renderFilters();
    render();
  });
  sortSelect.addEventListener("change", () => { visibleCount = PAGE_SIZE; load(); });
  moreBtn.addEventListener("click", () => { visibleCount += PAGE_SIZE; render(); });
  loadCartBases().catch(() => updateCartBaseShowroom());
  renderFilters();
  load();
}

document.addEventListener("DOMContentLoaded", () => {
  initBasesCatalogue();
  initSwapsCatalogue();
});
