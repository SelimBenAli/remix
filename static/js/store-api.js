/* Public storefront API helpers. Requests stay on the Flask session origin. */
async function storeApi(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers,
  });
  let data = null;
  try { data = await response.json(); } catch (_) { /* empty response */ }
  if (!response.ok) {
    const errors = data && data.errors;
    throw new Error(Array.isArray(errors) ? errors.join(", ") : (data && data.error) || response.statusText);
  }
  return data;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function formatPrice(value) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number(value) || 0);
}
