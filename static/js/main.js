/* Shared storefront interactions and live home page sections. */
const FAQS = [
  { q: "Can I buy more panels later?", a: "Yes. Every REMIX base and art panel is designed to stay compatible with every addition to the lineup." },
  { q: "Is it comfortable?", a: "Our hardware is engineered to feel invisible. After dozens of prototypes we refined every detail so the system stays secure and unnoticeable in wear." },
  { q: "How durable is the hardware?", a: "REMIX pieces are built for everyday wear with premium zippers and low-profile hook-and-loop that stays secure without losing its shape." },
  { q: "Can it be washed?", a: "Yes — swap the art panel back to the base's original panel before washing, then wash the base cold. Spot-clean panels as needed." },
  { q: "How do you support artists?", a: "We're built with real creators around the world. Every panel features original, human-made artwork, with a portion of each sale paid directly to the artist." }
];
const HOME_SWATCHES = ["#780000", "#C1121F", "#003049", "#669BBC", "#5c3d2e"];

document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.querySelector("[data-nav-toggle]");
  const mainNav = document.querySelector("[data-main-nav]");
  const navScrim = document.querySelector("[data-scrim]");
  const siteHeader = document.querySelector(".site-header");
  const closeNav = () => {
    mainNav?.classList.remove("is-open");
    navScrim?.classList.remove("is-open");
    siteHeader?.classList.remove("is-menu-open");
    navToggle?.setAttribute("aria-expanded", "false");
    navToggle?.setAttribute("aria-label", "Open menu");
    if (!document.querySelector("[data-cart-drawer].is-open")) document.body.classList.remove("no-scroll");
  };
  navToggle?.addEventListener("click", () => {
    const open = mainNav?.classList.toggle("is-open");
    navScrim?.classList.toggle("is-open", Boolean(open));
    siteHeader?.classList.toggle("is-menu-open", Boolean(open));
    navToggle.setAttribute("aria-expanded", String(Boolean(open)));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("no-scroll", Boolean(open));
  });
  navScrim?.addEventListener("click", closeNav);
  mainNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeNav));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeNav(); });

  const orderConfirmation = document.querySelector("[data-order-confirm-dialog]");
  document.querySelector("[data-order-confirm-close]")?.addEventListener("click", () => orderConfirmation?.close());
  orderConfirmation?.addEventListener("click", (event) => { if (event.target === orderConfirmation) orderConfirmation.close(); });
  if (new URLSearchParams(window.location.search).get("order") === "placed" && orderConfirmation) {
    orderConfirmation.showModal();
    window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
  }

  const drawer = document.querySelector("[data-cart-drawer]");
  const cartScrim = document.querySelector("[data-cart-scrim]");
  const openCart = () => { closeNav(); drawer?.classList.add("is-open"); cartScrim?.classList.add("is-open"); document.body.classList.add("no-scroll"); refreshCart().catch((e) => showToast(e.message)); };
  const closeCart = () => { drawer?.classList.remove("is-open"); cartScrim?.classList.remove("is-open"); document.body.classList.remove("no-scroll"); };
  document.querySelectorAll("[data-cart-open]").forEach((button) => button.addEventListener("click", openCart));
  document.querySelectorAll("[data-cart-close]").forEach((button) => button.addEventListener("click", closeCart));
  cartScrim?.addEventListener("click", closeCart);

  const faqList = document.querySelector("[data-faq-list]");
  if (faqList) {
    faqList.innerHTML = FAQS.map((item, i) => `<div class="faq-item" data-faq-item><button class="faq-q" aria-expanded="false" id="faq-q-${i}">${escapeHtml(item.q)}</button><div class="faq-a"><p>${escapeHtml(item.a)}</p></div></div>`).join("");
    faqList.querySelectorAll("[data-faq-item]").forEach((item) => item.querySelector(".faq-q").addEventListener("click", () => {
      const wasOpen = item.classList.contains("is-open");
      faqList.querySelectorAll("[data-faq-item]").forEach((other) => { other.classList.remove("is-open"); other.querySelector(".faq-q").setAttribute("aria-expanded", "false"); });
      if (!wasOpen) { item.classList.add("is-open"); item.querySelector(".faq-q").setAttribute("aria-expanded", "true"); }
    }));
  }

  document.querySelectorAll("[data-newsletter-form]").forEach((form) => form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const button = form.querySelector('button[type="submit"], button:not([type])');
    if (button) button.disabled = true;
    try {
      await storeApi("/store/newsletter", { method: "POST", body: JSON.stringify({ email: input.value }) });
      showToast("You're on the list — thanks for joining!");
      form.reset();
    } catch (error) { showToast(error.message); }
    finally { if (button) button.disabled = false; }
  }));

  loadHomeContent();
});

async function loadHomeContent() {
  const reviewsTarget = document.querySelector("[data-testimonials]");
  const panelsTarget = document.querySelector("[data-patch-scroller]");
  const artistsTarget = document.querySelector("[data-artist-grid]");
  const jobs = [];
  if (reviewsTarget) jobs.push(storeApi("/store/reviews?limit=3").then((reviews) => {
    reviewsTarget.innerHTML = reviews.length ? reviews.map((review) => `<div class="testimonial"><span class="stars">${"★".repeat(Math.max(0, Math.min(5, Number(review.rating) || 0)))}</span><p>“${escapeHtml(review.quote)}”</p><cite>${escapeHtml(review.name)}</cite></div>`).join("") : '<p class="empty-state">Customer reviews are coming soon.</p>';
  }).catch(() => { reviewsTarget.innerHTML = '<p class="empty-state">Reviews are temporarily unavailable.</p>'; }));
  if (panelsTarget) jobs.push(storeApi("/store/swaps?sort=popular").then((swaps) => {
    panelsTarget.innerHTML = swaps.slice(0, 10).map((swap, i) => `<a class="patch-card" href="/swaps"><div class="patch-swatch" style="background:${HOME_SWATCHES[i % HOME_SWATCHES.length]};color:var(--cream)">${swap.imageUrl ? `<img src="${escapeHtml(swap.imageUrl)}" alt="" loading="lazy">` : "✦"}</div><strong>${escapeHtml(swap.name)}</strong><span>${swap.free ? "FREE" : formatPrice(swap.price)}</span></a>`).join("") || '<p class="empty-state">New panels are coming soon.</p>';
  }).catch(() => { panelsTarget.innerHTML = '<p class="empty-state">Panels are temporarily unavailable.</p>'; }));
  if (artistsTarget) jobs.push(storeApi("/store/artists?limit=4").then((artists) => {
    artistsTarget.innerHTML = artists.map((artist, i) => `<div class="artist-card"><div class="artist-thumbs">${artist.swaps.slice(0, 3).map((swap, j) => `<div class="patch-swatch" style="background:${HOME_SWATCHES[(i + j) % HOME_SWATCHES.length]};color:var(--cream)" title="${escapeHtml(swap.name)}">${swap.imageUrl ? `<img src="${escapeHtml(swap.imageUrl)}" alt="${escapeHtml(swap.name)}" loading="lazy">` : "✦"}</div>`).join("")}</div><h4>${escapeHtml(artist.name)}</h4><span>Artist</span><a href="/swaps?artist=${encodeURIComponent(artist.name)}">View their art →</a></div>`).join("") || '<p class="empty-state">Artists are coming soon.</p>';
  }).catch(() => { artistsTarget.innerHTML = '<p class="empty-state">Artists are temporarily unavailable.</p>'; }));
  await Promise.all(jobs);
}

