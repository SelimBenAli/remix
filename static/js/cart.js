/* Guest cart backed by the Flask session and storefront API. */
let currentCart = { items: [], total: 0, count: 0 };

async function refreshCart() {
  currentCart = await storeApi("/store/cart");
  updateCartCount();
  renderCartDrawer();
  return currentCart;
}

async function addToCart(kind, productId, quantity = 1, size = null) {
  currentCart = await storeApi("/store/cart/items", {
    method: "POST",
    body: JSON.stringify({ kind, product_id: productId, quantity, size }),
  });
  updateCartCount();
  renderCartDrawer();
  showToast(kind === "base" ? "Base added to your cart" : "Panel added to your cart");
}

async function removeFromCart(itemId) {
  currentCart = await storeApi(`/store/cart/items/${itemId}`, { method: "DELETE" });
  updateCartCount();
  renderCartDrawer();
}

async function changeCartQuantity(itemId, quantity) {
  currentCart = await storeApi(`/store/cart/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
  updateCartCount();
  renderCartDrawer();
}

function updateCartCount() {
  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    el.textContent = currentCart.count || 0;
  });
}

function renderCartDrawer() {
  const list = document.querySelector("[data-cart-items]");
  const subtotal = document.querySelector("[data-cart-subtotal]");
  const total = document.querySelector("[data-cart-total]");
  if (!list) return;
  const items = currentCart.items || [];
  list.innerHTML = items.length ? items.map((item) => `
    <div class="cart-slot ${item.available ? "" : "is-unavailable"}">
      <div class="cart-thumb">${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}">` : item.kind === "base" ? "✧" : "✦"}</div>
      <div class="cart-slot-info"><strong>${escapeHtml(item.name)}</strong>
        <span>${item.kind === "base" ? "Base" : "Art panel"}${item.size ? ` · Size ${escapeHtml(item.size)}` : ""}${item.available ? "" : " · Unavailable"}</span>
      </div>
      <div class="cart-slot-actions">
        <div class="cart-slot-price">${formatPrice(item.lineTotal)}</div>
        <div class="cart-quantity" aria-label="Quantity for ${escapeHtml(item.name)}">
          <button type="button" data-quantity-change="-1" data-item-id="${item.id}" aria-label="Decrease quantity" ${item.quantity <= 0 ? "disabled" : ""}>−</button>
          <span>${item.quantity}</span>
          <button type="button" data-quantity-change="1" data-item-id="${item.id}" aria-label="Increase quantity" ${item.quantity >= 20 ? "disabled" : ""}>+</button>
        </div>
        <button class="cart-remove" data-remove="${item.id}">Remove</button>
      </div>
    </div>`).join("") : '<div class="cart-empty">Your cart is empty.<br>Add a base to start your collection.</div>';
  if (subtotal) subtotal.textContent = formatPrice(currentCart.total);
  if (total) total.textContent = formatPrice(currentCart.total);
  list.querySelectorAll("[data-remove]").forEach((button) => button.addEventListener("click", async () => {
    button.disabled = true;
    try { await removeFromCart(button.dataset.remove); }
    catch (error) { showToast(error.message); button.disabled = false; }
  }));
  list.querySelectorAll("[data-quantity-change]").forEach((button) => button.addEventListener("click", async () => {
    const itemId = button.dataset.itemId;
    const delta = Number(button.dataset.quantityChange);
    const item = currentCart.items.find((entry) => String(entry.id) === itemId);
    if (!item || !delta) return;
    button.disabled = true;
    try { await changeCartQuantity(itemId, item.quantity + delta); }
    catch (error) { showToast(error.message); button.disabled = false; }
  }));
}

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

document.addEventListener("DOMContentLoaded", () => {
  refreshCart().catch((error) => showToast(`Cart could not be loaded: ${error.message}`));
});
