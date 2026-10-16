/* Backup product layout, populated from the live storefront API. */
(function () {
  const config = window.PRODUCT_CONFIG;
  const root = document.querySelector("[data-product-root]");
  if (!config || !root) return;
  const $ = (selector) => root.querySelector(selector);
  const nameEl = $("[data-product-name]"), categoryEl = $("[data-product-category]");
  const artistEl = $("[data-product-artist]"), priceEl = $("[data-product-price]");
  const messageEl = $("[data-product-message]"), addButton = $("[data-product-add]");
  const optionBox = $(".option-box"), baseStep = $("[data-product-step-base]"), swapsStep = $("[data-product-step-swaps]");
  const baseStepHint = $("[data-product-step-base-hint]"), swapsStepHint = $("[data-product-step-swaps-hint]");
  const imageEl = $("[data-product-main-image]"), imageEmpty = $("[data-product-image-empty]");
  const thumbs = $("[data-product-thumbnails]"), badge = $("[data-product-badge]");
  const counter = $("[data-product-counter]"), sizeRow = $("[data-size-row]");
  const sizeOptions = $("[data-product-sizes]"), featureList = $("[data-product-features]");
  const guideModal = document.querySelector("[data-size-guide-modal]");
  const mobileAdd = document.querySelector("[data-product-mobile-add]");
  const mobileBuy = document.querySelector("[data-mobile-buy]");
  const mobileProductName = document.querySelector("[data-mobile-product-name]");
  const mobileProductPrice = document.querySelector("[data-mobile-product-price]");
  const preorderDialog = document.querySelector("[data-preorder-dialog]");
  const preorderForm = document.querySelector("[data-preorder-form]");
  const preorderMessage = document.querySelector("[data-preorder-message]");
  let product = null, images = [], activeImage = 0, selectedSize = "", baseAddedToBag = false;
  const ravenLocalImages = [
    "/uploads/bases/3fdc0ec2d86041a6982b94cac90b2a1a.jpg",
    "/uploads/bases/7c673a87c6c9463eac352574be039df3.webp",
  ];
  const ravenRemoteImage = "https://swapwear.com/cdn/shop/files/raven-swapwear-jacket-front-panel.webp?v=1776110680&width=900";
  const isRavenBase = (item) => item?.kind === "base" && /raven/i.test(`${item.name || ""} ${item.color || ""}`);

  function setMessage(message, isError = false) {
    if (!messageEl) return;
    messageEl.textContent = message;
    messageEl.classList.toggle("is-error", isError);
  }
  function isSelectedSizeInStock(size = selectedSize) {
    if (!product) return false;
    if (product.kind === "base") {
      if (product.soldOut) return false;
      if (!size) return product.inStock !== false;
      const stock = product.sizeStock || {};
      if (!Object.keys(stock).length) return true;
      return Number(stock[size] || 0) > 0;
    }
    return product.stockQuantity == null || Number(product.stockQuantity) > 0;
  }
  function updateStockStatus() {
    if (!product) return;
    const inStock = isSelectedSizeInStock();
    root.querySelectorAll("[data-product-availability]").forEach((el) => {
      el.textContent = inStock ? "In stock" : "Out of stock";
      el.classList.toggle("is-sold-out", !inStock);
    });
    const needsSize = product.kind === "base" && product.sizes?.length > 0;
    const canRequest = !inStock && !product.orderedEvenOutOfStock;
    const label = needsSize && !selectedSize ? "SELECT A SIZE" : canRequest ? "REQUEST PRE-ORDER" : "ADD TO BAG";
    const disabled = needsSize && !selectedSize;
    if (addButton) { addButton.textContent = label; addButton.disabled = disabled; }
    const hasChosenBase = product.kind === "base" && (!needsSize || Boolean(selectedSize));
    if (optionBox) optionBox.hidden = product.kind !== "base";
    const canContinueToSwaps = hasChosenBase && baseAddedToBag;
    baseStep?.classList.toggle("active", !baseAddedToBag);
    swapsStep?.classList.toggle("active", baseAddedToBag);
    if (baseStepHint) baseStepHint.textContent = hasChosenBase
      ? baseAddedToBag ? "Base added to your bag" : "Base selected — add it to your bag"
      : "Pick a size to continue";
    if (swapsStep) {
      swapsStep.classList.toggle("is-ready", canContinueToSwaps);
      swapsStep.classList.toggle("is-disabled", !canContinueToSwaps);
      swapsStep.setAttribute("aria-disabled", String(!canContinueToSwaps));
      swapsStep.tabIndex = canContinueToSwaps ? 0 : -1;
    }
    if (swapsStepHint) swapsStepHint.textContent = baseAddedToBag
      ? "Base added — click to choose panels"
      : hasChosenBase ? "Add this base to unlock swaps" : "Choose a size to unlock swaps";
    mobileBuy?.classList.toggle("is-next-step", baseAddedToBag && product.kind === "base");
    if (baseAddedToBag && product.kind === "base") {
      if (mobileProductName) mobileProductName.textContent = "STEP 2 · CHOOSE YOUR PANELS";
      if (mobileProductPrice) mobileProductPrice.textContent = "Continue styling";
      if (mobileAdd) { mobileAdd.textContent = "CHOOSE PANELS"; mobileAdd.disabled = false; }
    } else if (mobileAdd) {
      mobileAdd.textContent = label;
      mobileAdd.disabled = disabled;
    }
  }
  async function refreshProductStock() {
    if (!product) return;
    const latest = await storeApi(`/store/products/${encodeURIComponent(product.kind)}/${encodeURIComponent(product.id)}`);
    product = { ...product, ...latest };
    updateStockStatus();
  }
  function handleMainImageError() {
    if (isRavenBase(product) && imageEl) {
      const fallbackIndex = Number(imageEl.dataset.ravenFallbackIndex || 0);
      const fallback = [...ravenLocalImages, ravenRemoteImage][fallbackIndex];
      if (fallback && imageEl.src !== new URL(fallback, location.href).href) {
        imageEl.dataset.ravenFallbackIndex = String(fallbackIndex + 1);
        imageEl.src = fallback;
        return;
      }
    }
    if (imageEl) { imageEl.onerror = null; imageEl.hidden = true; }
    if (imageEmpty) imageEmpty.hidden = false;
  }
  function showImage(index) {
    if (!images.length) return;
    activeImage = (index + images.length) % images.length;
    if (!imageEl) return;
    imageEl.dataset.ravenFallbackIndex = "0";
    imageEl.onerror = handleMainImageError;
    imageEl.src = images[activeImage].url;
    imageEl.alt = `${product.name} view ${activeImage + 1}`;
    imageEl.hidden = false;
    if (imageEmpty) imageEmpty.hidden = true;
    if (counter) { counter.textContent = `${activeImage + 1} / ${images.length}`; counter.hidden = images.length < 2; }
    const prev = root.querySelector("[data-product-prev]"), next = root.querySelector("[data-product-next]");
    if (prev) prev.hidden = images.length < 2;
    if (next) next.hidden = images.length < 2;
    thumbs?.querySelectorAll("button").forEach((button, i) => button.classList.toggle("active", i === activeImage));
  }
  function renderSizeGuide(guide) {
    if (!guideModal || !guide || !Array.isArray(guide.rows)) return;
    const head = guideModal.querySelector("[data-size-guide-head]");
    const body = guideModal.querySelector("[data-size-guide-body]");
    if (!head || !body) return;
    head.replaceChildren(); body.replaceChildren();
    const columns = Array.isArray(guide.columns) ? guide.columns : ["Chest", "Waist", "Hips"];
    const header = document.createElement("tr");
    ["Size", ...columns].forEach((label) => { const th = document.createElement("th"); th.textContent = label; header.appendChild(th); });
    head.appendChild(header);
    guide.rows.forEach((row) => {
      const tr = document.createElement("tr");
      [row.size, ...columns.map((column) => row[column.toLowerCase()])].forEach((value, index) => {
        const cell = document.createElement(index === 0 ? "th" : "td");
        if (index === 0) cell.scope = "row";
        const unit = guide.unit === undefined ? "\"" : guide.unit;
        cell.textContent = Array.isArray(value) ? `${value[0]}–${value[1]}${unit}` : value == null ? "—" : typeof value === "number" ? `${value}${unit}` : String(value);
        tr.appendChild(cell);
      });
      body.appendChild(tr);
    });
    const measureGrid = guideModal.querySelector("[data-size-guide-help]");
    if (measureGrid) measureGrid.replaceChildren();
    (guide.how_to_measure || []).forEach((item) => {
      const card = document.createElement("div"), title = document.createElement("b"), text = document.createElement("p");
      title.textContent = item.label || "Measure"; text.textContent = item.text || "";
      card.append(title, text); measureGrid?.appendChild(card);
    });
    const advice = guideModal.querySelector("[data-size-guide-advice]");
    if (advice) {
      advice.replaceChildren();
      Object.entries(guide.advice || {}).forEach(([label, text]) => {
        const strong = document.createElement("b"); strong.textContent = `${label}: `;
        advice.append(strong, document.createTextNode(text), document.createElement("br"));
      });
    }
  }
  function render(data) {
    product = data;
    baseAddedToBag = false;
    document.title = `${data.name} — REMIX`;
    if (nameEl) nameEl.textContent = data.name;
    const mobileName = document.querySelector("[data-mobile-product-name]");
    if (mobileName) mobileName.textContent = data.name;
    const category = data.category || "REMIX";
    const isWomensFit = data.kind === "base" && /women/i.test(data.fit || "");
    const displayCategory = data.kind === "base"
      ? (/hoodie/i.test(data.name) ? "RETRO CORD HOODIE" : /workwear/i.test(data.name) ? "ATELIER CANVAS JACKET" : "OG DENIM JACKET")
      : String(category).toUpperCase();
    if (categoryEl) categoryEl.textContent = `${data.kind === "base" ? "BASE" : "ART PANEL"} • ${displayCategory}${data.kind === "base" ? ` • ${isWomensFit ? "WOMEN'S FIT" : "UNISEX"}` : ""}`;
    if (priceEl) priceEl.textContent = data.free ? "FREE" : formatPrice(data.price);
    const mobilePrice = document.querySelector("[data-mobile-product-price]");
    if (mobilePrice) mobilePrice.textContent = data.free ? "FREE" : formatPrice(data.price);
    if (data.artist && artistEl) { artistEl.textContent = `Art by ${data.artist}`; artistEl.hidden = false; }
    if (data.badge && badge) { badge.textContent = data.badge.toUpperCase(); badge.hidden = false; }

    const description = root.querySelector("[data-product-description]");
    if (description) description.textContent = data.description || (data.kind === "swap" ? `An original art panel${data.artist ? ` by ${data.artist}` : ""}, ready to pair with a REMIX base.` : "");
    const detailsTitle = root.querySelector("[data-details-title]");
    if (detailsTitle) detailsTitle.textContent = data.name;
    if (featureList) {
      featureList.replaceChildren();
      (data.features || []).forEach((feature) => { const span = document.createElement("span"); span.textContent = feature; featureList.appendChild(span); });
    }
    const specs = root.querySelector("[data-product-specs]");
    if (specs) {
      specs.replaceChildren();
      (data.details || "").split(/\r?\n/).map((line) => line.trim().replace(/^[-•]\s*/, "")).filter(Boolean).forEach((line) => {
        const li = document.createElement("li"); li.textContent = line; specs.appendChild(li);
      });
      if (data.includedPanel && !specs.textContent.toLowerCase().includes("blank")) {
        const li = document.createElement("li"); li.textContent = "Includes x1 blank denim swap"; specs.appendChild(li);
      }
    }
    const fitNote = root.querySelector("[data-fit-note]");
    if (fitNote) { fitNote.textContent = data.fit || ""; fitNote.hidden = !data.fit; }
    const faqFit = root.querySelector("[data-faq-fit]"); if (faqFit && data.description) faqFit.textContent = data.description;
    const faqCare = root.querySelector("[data-faq-care]"); if (faqCare && data.materialsCare) faqCare.textContent = data.materialsCare;
    const faqShipping = root.querySelector("[data-faq-shipping]"); if (faqShipping && data.shippingReturns) faqShipping.textContent = data.shippingReturns;

    images = (data.images || []).filter((image) => image && image.url && !image.useInShowroom && !image.showroomPlaceholder);
    if (!images.length && data.imageUrl) images = [{ url: data.imageUrl }];
    if (!images.length && isRavenBase(data)) {
      images = ravenLocalImages.map((url) => ({ url }));
    }
    if (thumbs) thumbs.replaceChildren();
    images.forEach((image, index) => {
      const button = document.createElement("button"); button.type = "button"; button.className = "thumb";
      button.setAttribute("aria-label", `${data.name} view ${index + 1}`);
      const img = document.createElement("img"); img.src = image.url; img.alt = `${data.name} view ${index + 1}`;
      img.onerror = () => {
        if (isRavenBase(data)) {
          img.onerror = null;
          const fallback = ravenLocalImages[index % ravenLocalImages.length];
          if (img.src === new URL(fallback, location.href).href) img.hidden = true;
          else img.src = fallback;
        } else img.hidden = true;
      };
      button.appendChild(img); button.addEventListener("click", () => showImage(index)); thumbs?.appendChild(button);
    });
    if (images.length) showImage(0); else if (imageEl && imageEmpty) { imageEl.hidden = true; imageEmpty.hidden = false; }

    const sizes = data.kind === "base" && Array.isArray(data.sizes) ? data.sizes : [];
    if (sizeRow) sizeRow.hidden = sizes.length === 0;
    const noSizeRow = root.querySelector("[data-no-size-row]");
    if (noSizeRow) noSizeRow.hidden = sizes.length > 0;
    selectedSize = ""; sizeOptions?.replaceChildren();
    sizes.forEach((size) => {
      const button = document.createElement("button"); button.type = "button"; button.dataset.size = size; button.textContent = size;
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", async () => {
        selectedSize = size;
        sizeOptions?.querySelectorAll("button").forEach((option) => {
          const active = option === button; option.classList.toggle("selected", active); option.setAttribute("aria-pressed", String(active));
        });
        setMessage("");
        updateStockStatus();
        try { await refreshProductStock(); }
        catch (error) { setMessage(`Stock could not be refreshed: ${error.message}`, true); }
      });
      sizeOptions?.appendChild(button);
    });
    const guideButton = root.querySelector("[data-size-guide-open]");
    if (guideButton) {
      guideButton.hidden = !data.sizeGuide || !Array.isArray(data.sizeGuide.rows);
      guideButton.textContent = `${isWomensFit ? "Women's" : "Unisex"} Size Guide →`;
    }
    const guideLabel = root.querySelector("[data-size-guide-label]");
    if (guideLabel) guideLabel.textContent = `${isWomensFit ? "WOMEN'S" : "UNISEX"} SIZE GUIDE`;
    renderSizeGuide(data.sizeGuide || {});
    updateStockStatus();
  }
  async function loadReviews() {
    try {
      const reviews = await storeApi("/store/reviews?limit=4");
      if (!reviews.length) return;
      const list = document.querySelector("[data-product-reviews]");
      if (!list) return;
      list.replaceChildren();
      reviews.forEach((review) => {
        const article = document.createElement("article"), top = document.createElement("div"); top.className = "review-top";
        const author = document.createElement("b"); author.textContent = review.name;
        const stars = document.createElement("span"); stars.textContent = "★".repeat(Math.max(0, Math.min(5, Number(review.rating) || 5)));
        const quote = document.createElement("p"); quote.textContent = review.quote;
        top.append(author, stars); article.append(top, quote); list.appendChild(article);
      });
    } catch (_) { /* Product details remain usable if reviews are unavailable. */ }
  }
  async function loadProduct() {
    if (addButton) addButton.disabled = true;
    if (nameEl) nameEl.textContent = "Loading product…";
    try { render(await storeApi(`/store/products/${encodeURIComponent(config.kind)}/${encodeURIComponent(config.id)}`)); }
    catch (error) { if (nameEl) nameEl.textContent = "Product unavailable"; setMessage(error.message, true); }
  }

  root.querySelector("[data-product-prev]")?.addEventListener("click", () => showImage(activeImage - 1));
  root.querySelector("[data-product-next]")?.addEventListener("click", () => showImage(activeImage + 1));
  root.querySelector("[data-size-guide-open]")?.addEventListener("click", () => {
    if (!guideModal) return;
    guideModal.hidden = false; guideModal.classList.add("open");
    guideModal.querySelector("[data-size-guide-close]")?.focus();
  });
  document.querySelectorAll("[data-size-guide-close]").forEach((button) => button.addEventListener("click", () => {
    if (guideModal) { guideModal.hidden = true; guideModal.classList.remove("open"); }
  }));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && guideModal && !guideModal.hidden) { guideModal.hidden = true; guideModal.classList.remove("open"); }
  });
  async function addSelectedProduct() {
    if (product?.kind === "base" && baseAddedToBag) { window.location.href = "/swaps"; return; }
    if (!product) return loadProduct();
    if (product.sizes?.length && !selectedSize) { setMessage("Choose a size first.", true); sizeOptions?.querySelector("button")?.focus(); return; }
    try { await refreshProductStock(); }
    catch (error) { setMessage(`Stock could not be verified: ${error.message}`, true); return; }
    if (!isSelectedSizeInStock() && !product.orderedEvenOutOfStock) {
      if (preorderDialog) { if (preorderMessage) preorderMessage.textContent = ""; preorderDialog.showModal(); }
      else setMessage("This item is out of stock. Contact us to request a pre-order.", true);
      return;
    }
    if (addButton) addButton.disabled = true;
    setMessage("");
    if (mobileAdd) mobileAdd.disabled = true;
    try {
      await addToCart(product.kind, product.id, 1, selectedSize || null);
      if (product.kind === "base") baseAddedToBag = true;
      setMessage(`${product.name}${selectedSize ? ` (${selectedSize})` : ""} added to your bag.`);
    }
    catch (error) {
      try { await refreshProductStock(); } catch (_) { /* Keep the original cart error visible. */ }
      setMessage(error.message, true);
    }
    finally {
      updateStockStatus();
    }
  }
  addButton?.addEventListener("click", addSelectedProduct);
  mobileAdd?.addEventListener("click", addSelectedProduct);
  baseStep?.addEventListener("click", () => {
    const target = sizeRow && !sizeRow.hidden ? sizeRow : addButton;
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (sizeRow && !sizeRow.hidden) sizeOptions?.querySelector("button")?.focus({ preventScroll: true });
  });
  document.querySelector("[data-preorder-close]")?.addEventListener("click", () => preorderDialog?.close());
  preorderForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = preorderForm.querySelector("[data-preorder-submit]");
    if (submit) submit.disabled = true;
    if (preorderMessage) preorderMessage.textContent = "";
    const customer = Object.fromEntries(new FormData(preorderForm).entries());
    try {
      await storeApi("/store/product-requests", {
        method: "POST",
        body: JSON.stringify({ ...customer, kind: product.kind, product_id: product.id, size: selectedSize || null, quantity: 1 }),
      });
      preorderDialog?.close();
      preorderForm.reset();
      setMessage("Your pre-order request has been sent.");
    } catch (error) {
      if (preorderMessage) preorderMessage.textContent = error.message;
    } finally { if (submit) submit.disabled = false; }
  });
  loadProduct();
  loadReviews();
})();
