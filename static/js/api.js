/* Auto-généré par scaffold_frontend.py.
 * Petit wrapper fetch + helpers UI (toasts, confirmation) partagés par
 * toutes les pages admin. */
async function apiRequest(url, options = {}) {
  const isFormData = options.body instanceof FormData;
  const method = (options.method || "GET").toUpperCase();
  const headers = {};

  // Ne force pas "Content-Type" sur un envoi FormData (upload de fichier) —
  // le navigateur doit fixer lui-même le boundary multipart.
  if (!isFormData) headers["Content-Type"] = "application/json";

  // Le jeton CSRF (posé par le serveur dans window.CSRF_TOKEN au login) est
  // requis par le serveur pour toute requête qui modifie des données quand
  // on est authentifié par la session du navigateur (voir _csrf_ok() côté
  // Flask). Les méthodes de lecture (GET/HEAD) n'en ont pas besoin.
  if (window.CSRF_TOKEN && !["GET", "HEAD"].includes(method)) {
    headers["X-CSRF-Token"] = window.CSRF_TOKEN;
  }

  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    /* pas de corps JSON (ex: 204 No Content) */
  }
  if (!res.ok) {
    const msg = (data && (data.errors || data.error)) || res.statusText;
    throw new Error(Array.isArray(msg) ? msg.join(", ") : String(msg));
  }
  return data;
}

/* showToast(message, type) — type: "success" | "danger" | "info" (défaut). */
function showToast(message, type) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const colors = { success: "text-bg-success", danger: "text-bg-danger", info: "text-bg-secondary" };
  const el = document.createElement("div");
  el.className = `toast align-items-center ${colors[type] || colors.info} border-0`;
  el.setAttribute("role", "alert");
  const row = document.createElement("div");
  row.className = "d-flex";
  const body = document.createElement("div");
  body.className = "toast-body";
  body.textContent = String(message);
  const close = document.createElement("button");
  close.type = "button";
  close.className = "btn-close btn-close-white me-2 m-auto";
  close.setAttribute("data-bs-dismiss", "toast");
  close.setAttribute("aria-label", "Close");
  row.append(body, close);
  el.appendChild(row);
  container.appendChild(el);
  const toast = new bootstrap.Toast(el, { delay: 4000 });
  toast.show();
  el.addEventListener("hidden.bs.toast", () => el.remove());
}

/* confirmAction(message) -> Promise<boolean>, remplace window.confirm() par
 * la modale Bootstrap partagée (#confirm-modal dans admin/base.html). */
function confirmAction(message) {
  return new Promise((resolve) => {
    const modalEl = document.getElementById("confirm-modal");
    if (!modalEl) {
      resolve(window.confirm(message));
      return;
    }
    document.getElementById("confirm-modal-body").textContent = message;
    const modal = new bootstrap.Modal(modalEl);
    const okBtn = document.getElementById("confirm-modal-ok");

    const onOk = () => {
      cleanup();
      modal.hide();
      resolve(true);
    };
    const onHide = () => {
      cleanup();
      resolve(false);
    };
    function cleanup() {
      okBtn.removeEventListener("click", onOk);
      modalEl.removeEventListener("hidden.bs.modal", onHide);
    }

    okBtn.addEventListener("click", onOk);
    modalEl.addEventListener("hidden.bs.modal", onHide);
    modal.show();
  });
}
