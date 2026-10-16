document.addEventListener("DOMContentLoaded", () => {
  const itemsRoot = document.querySelector("[data-order-items]");
  const emptyState = document.querySelector("[data-order-empty]");
  const totals = document.querySelector("[data-order-totals]");
  const subtotal = document.querySelector("[data-order-subtotal]");
  const total = document.querySelector("[data-order-total]");
  const count = document.querySelector("[data-order-count]");
  const form = document.querySelector("[data-order-form]");
  const message = document.querySelector("[data-order-message]");
  const submit = document.querySelector("[data-order-submit]");
  if (!itemsRoot || !form) return;

  function renderOrderCart(cart) {
    const items = cart.items || [];
    itemsRoot.innerHTML = items.length ? items.map((item) => `
      <article class="order-line ${item.available ? "" : "is-unavailable"}">
        ${item.imageUrl ? `<img class="order-line-image" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}">` : `<div class="order-line-image"></div>`}
        <div class="order-line-info"><strong>${escapeHtml(item.name)}</strong>
          <span>${item.kind === "base" ? "Base" : "Art panel"}${item.size ? ` · Size ${escapeHtml(item.size)}` : ""}${item.available ? "" : " · Unavailable"}</span>
          <div class="order-line-controls" aria-label="Quantity controls for ${escapeHtml(item.name)}">
            <button type="button" data-order-quantity="-1" data-item-id="${item.id}" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-order-quantity="1" data-item-id="${item.id}" aria-label="Increase quantity" ${item.quantity >= 20 ? "disabled" : ""}>+</button>
            <button class="order-line-remove" type="button" data-order-remove="${item.id}">Remove</button>
          </div>
        </div>
        <strong class="order-line-price">${formatPrice(item.lineTotal)}</strong>
      </article>`).join("") : "";
    count.textContent = `${cart.count || 0} ${(cart.count || 0) === 1 ? "item" : "items"}`;
    subtotal.textContent = formatPrice(cart.total);
    total.textContent = formatPrice(cart.total);
    emptyState.hidden = items.length > 0;
    totals.hidden = items.length === 0;
    submit.disabled = items.length === 0;
    itemsRoot.hidden = items.length === 0;

    itemsRoot.querySelectorAll("[data-order-quantity]").forEach((button) => button.addEventListener("click", async () => {
      const itemId = button.dataset.itemId;
      const item = cart.items.find((row) => String(row.id) === itemId);
      if (!item) return;
      button.disabled = true;
      try {
        const delta = Number(button.dataset.orderQuantity);
        const updated = await storeApi(`/store/cart/items/${itemId}`, {
          method: "PATCH", body: JSON.stringify({ quantity: item.quantity + delta }),
        });
        if (typeof currentCart !== "undefined") currentCart = updated;
        updateCartCount(); renderCartDrawer(); renderOrderCart(updated);
      } catch (error) { showToast(error.message); button.disabled = false; }
    }));

    itemsRoot.querySelectorAll("[data-order-remove]").forEach((button) => button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const updated = await storeApi(`/store/cart/items/${button.dataset.orderRemove}`, { method: "DELETE" });
        if (typeof currentCart !== "undefined") currentCart = updated;
        updateCartCount(); renderCartDrawer(); renderOrderCart(updated);
      } catch (error) { showToast(error.message); button.disabled = false; }
    }));
  }

  refreshCart().then(renderOrderCart).catch((error) => {
    itemsRoot.innerHTML = `<p class="order-form-message">Could not load your bag: ${escapeHtml(error.message)}</p>`;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    submit.disabled = true;
    submit.querySelector("span").textContent = "Placing your order…";
    message.textContent = "";
    try {
      const customer = Object.fromEntries(new FormData(form).entries());
      await storeApi("/store/checkout", { method: "POST", body: JSON.stringify(customer) });
      window.location.assign("/?order=placed");
    } catch (error) {
      message.textContent = error.message;
      submit.disabled = false;
      submit.querySelector("span").textContent = "Place order";
    }
  });
});
