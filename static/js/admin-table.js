/* Auto-généré par scaffold_frontend.py.
 * Moteur générique piloté par window.ENTITY_CONFIG (injecté dans chaque
 * template <model>_list.html). Un seul fichier sert toutes les pages. */
(function () {
  const cfg = window.ENTITY_CONFIG;
  if (!cfg) return;

  const tableBody = document.getElementById("table-body");
  const searchForm = document.getElementById("search-form");
  const btnAdd = document.getElementById("btn-add");
  const btnSave = document.getElementById("btn-save");
  const btnResetSearch = document.getElementById("btn-reset-search");
  const btnPrevPage = document.getElementById("btn-prev-page");
  const btnNextPage = document.getElementById("btn-next-page");
  const btnExportCsv = document.getElementById("btn-export-csv");
  const selectAllCheckbox = document.getElementById("select-all");
  const bulkBar = document.getElementById("bulk-bar");
  const bulkCount = document.getElementById("bulk-count");
  const btnBulkDelete = document.getElementById("btn-bulk-delete");
  const btnBulkUpdate = document.getElementById("btn-bulk-update");
  const btnImportCsv = document.getElementById("btn-import-csv");
  const pageIndicator = document.getElementById("page-indicator");
  const modalEl = document.getElementById("entity-modal");
  const modalTitle = document.getElementById("entity-modal-title");
  const entityForm = document.getElementById("entity-form");
  const bsModal = modalEl ? new bootstrap.Modal(modalEl) : null;
  const orderItemsModalEl = document.getElementById("order-items-modal");
  const orderItemsModal = orderItemsModalEl ? new bootstrap.Modal(orderItemsModalEl) : null;
  const orderItemsModalTitle = document.getElementById("order-items-modal-title");
  const orderItemsSummary = document.getElementById("order-items-summary");
  const orderItemsBody = document.getElementById("order-items-body");

  let mode = "create"; // ou "edit"
  let formDirty = false;
  let allowModalClose = false;
  let savingEntity = false;
  const fkCache = {}; // { "user_id": [{id:1, name:"Alice", ...}, ...] }
  const selectedIds = new Set();
  let lastItems = []; // items actuellement affichés (pour l'export CSV de la page)

  // État de la liste courante (persiste entre les rechargements).
  const state = {
    page: 1,
    perPage: 20,
    sort: null,
    order: "asc",
    searchParams: {},
  };

  window.addEventListener("dashboard-update", function (event) {
    const changed = event.detail && event.detail.model;
    if (changed && cfg.apiBase.split("/").pop() === changed) fetchList();
  });

  function apiUrl(suffix) {
    return cfg.apiBase + (suffix || "");
  }

  function showUndoToast(message, undo) {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toastEl = document.createElement("div");
    toastEl.className = "toast align-items-center text-bg-success border-0 admin-undo-toast";
    toastEl.setAttribute("role", "status");
    const row = document.createElement("div"); row.className = "d-flex align-items-center";
    const body = document.createElement("div"); body.className = "toast-body"; body.textContent = message;
    const button = document.createElement("button"); button.type = "button"; button.className = "btn btn-sm btn-light ms-auto me-2"; button.textContent = "Undo";
    const close = document.createElement("button"); close.type = "button"; close.className = "btn-close btn-close-white me-2"; close.setAttribute("data-bs-dismiss", "toast"); close.setAttribute("aria-label", "Close");
    button.addEventListener("click", async () => {
      button.disabled = true;
      try { await undo(); toast.hide(); }
      catch (error) { button.disabled = false; showToast(`Could not undo: ${error.message}`, "danger"); }
    });
    row.append(body, button, close); toastEl.appendChild(row); container.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl, { delay: 10000 });
    toast.show(); toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
  }

  function fieldKind(rule) {
    if (rule && rule.choices) return "choices";
    if (rule && rule.type === "bool") return "bool";
    if (rule && rule.type === "json") return "json";
    if (rule && rule.type === "textarea") return "textarea";
    if (rule && (rule.type === "file" || rule.type === "image" || rule.type === "images")) return rule.type;
    if (rule && (rule.type === "date" || rule.type === "datetime")) return rule.type;
    return "text";
  }

  function inputTypeFor(rule) {
    if (rule && (rule.type === "int" || rule.type === "float")) return "number";
    if (rule && rule.type === "date") return "date";
    if (rule && rule.type === "datetime") return "datetime-local";
    return "text";
  }

  function friendlyEntityName() {
    const name = String(cfg.entityLabel || "item").trim().replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
    return name.endsWith("s") ? name.slice(0, -1) : name;
  }

  async function loadForeignKeyOptions() {
    const entries = Object.entries(cfg.foreignKeys || {});
    await Promise.all(
      entries.map(async ([field, rule]) => {
        try {
          // per_page élevé : suffisant pour peupler un <select> de choix
          // liés sans paginer ce sous-appel (à revoir si >200 lignes).
          const result = await apiRequest(rule.apiBase + "?per_page=200");
          fkCache[field] = result.items || [];
        } catch (e) {
          fkCache[field] = [];
        }
      })
    );
  }

  function fkDisplayValue(field, rawId) {
    const rule = cfg.foreignKeys && cfg.foreignKeys[field];
    if (!rule) return rawId;
    const items = fkCache[field] || [];
    const match = items.find((it) => String(it[cfg.pk] != null ? it[cfg.pk] : it.id) === String(rawId));
    return match ? match[rule.displayField] : rawId;
  }

  function buildFormFields(fieldsConfig) {
    if (entityForm.dataset.previewObjectUrl) URL.revokeObjectURL(entityForm.dataset.previewObjectUrl);
    delete entityForm.dataset.previewObjectUrl;
    delete entityForm.dataset.previewFile;
    entityForm.innerHTML = "";
    let fieldTarget = entityForm;
    if (cfg.productEditor) {
      const nav = document.createElement("div");
      nav.className = "base-editor-tabs";
      nav.setAttribute("role", "tablist");
      const sections = {};
      let detailFields;
      (cfg.baseEditor ? [["details", "Details"], ["sizes", "Sizes"], ["images", "Images"]] : [["details", "Details"], ["images", "Images"]]).forEach(([key, title], index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "base-editor-tab" + (index === 0 ? " active" : "");
        button.textContent = title;
        button.dataset.tabKey = key;
        button.setAttribute("role", "tab");
        button.setAttribute("aria-selected", index === 0 ? "true" : "false");
        button.addEventListener("click", () => {
          nav.querySelectorAll(".base-editor-tab").forEach((tab) => {
            const active = tab === button;
            tab.classList.toggle("active", active);
            tab.setAttribute("aria-selected", String(active));
          });
          Object.entries(sections).forEach(([name, panel]) => { panel.hidden = name !== key; });
        });
        nav.appendChild(button);
        const panel = document.createElement("section");
        panel.className = "base-editor-section";
        panel.hidden = index !== 0;
        panel.dataset.baseSection = key;
        if (key === "details") {
          const layout = document.createElement("div"); layout.className = "base-editor-details-layout";
          detailFields = document.createElement("div"); detailFields.className = "base-editor-detail-fields";
          const preview = document.createElement("aside"); preview.className = "base-product-preview"; preview.setAttribute("aria-label", "Live product preview");
          preview.innerHTML = '<div class="base-preview-label"><span><i class="bi bi-eye me-1"></i> Store preview</span><span class="base-preview-visibility">Visible to customers</span></div><div class="base-preview-image-wrap"><img class="base-preview-image" alt="Base product preview"><span class="base-preview-image-empty"><i class="bi bi-image"></i><br>Product image preview</span></div><div class="base-preview-copy"><div class="base-preview-type"></div><h3 class="base-preview-name">Your product name</h3><div class="base-preview-price">$0.00</div><p class="base-preview-description">Your short description will appear here.</p><div class="base-preview-features"></div><div class="base-preview-sizes"></div><a class="base-preview-open" target="_blank" rel="noopener">Open shop page <i class="bi bi-box-arrow-up-right"></i></a></div>';
          layout.append(detailFields, preview); panel.appendChild(layout);
          entityForm._baseDetailFields = detailFields; entityForm._basePreview = preview;
        }
        sections[key] = panel;
        entityForm.appendChild(panel);
      });
      entityForm.prepend(nav);
      fieldTarget = null;
      entityForm._baseSections = sections;
    }
    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.name = cfg.pk;
    entityForm.appendChild(hidden);

    Object.entries(fieldsConfig || {}).forEach(([field, rule]) => {
      const wrapper = document.createElement("div");
      wrapper.className = "mb-3";
      const sectionKey = cfg.productEditor && (field === "images" || field === "image_url" ? "images" :
        ["sizes", "size_stock", "size_guide"].includes(field) ? "sizes" : "details");
      const target = sectionKey === "details" && entityForm._baseDetailFields ? entityForm._baseDetailFields :
        (sectionKey ? entityForm._baseSections[sectionKey] : (fieldTarget || entityForm));

      const fkRule = cfg.foreignKeys && cfg.foreignKeys[field];
      const kind = fkRule ? "fk" : fieldKind(rule);

      if (kind === "bool") {
        // Case à cocher : label et champ inversés (convention Bootstrap).
        wrapper.className = "mb-3 form-check";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.className = "form-check-input";
        input.name = field;
        input.id = "field-" + field;
        input.checked = !!rule.default;
        const label = document.createElement("label");
        label.className = "form-check-label";
        label.htmlFor = input.id;
        label.textContent = (rule.label || field.replaceAll("_", " ")) + (rule.required ? " *" : "");
        wrapper.appendChild(input);
        wrapper.appendChild(label);
        if (rule.help) { const hint = document.createElement("div"); hint.className = "form-text ms-4"; hint.textContent = rule.help; wrapper.appendChild(hint); }
        target.appendChild(wrapper);
        return;
      }

      const label = document.createElement("label");
      label.className = "form-label";
      label.textContent = (rule.label || field.replaceAll("_", " ")) + (rule.required ? " *" : "");
      wrapper.appendChild(label);

      if (["friendly_list", "friendly_stock", "friendly_size_guide"].includes(rule.type)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = field;
        input.dataset.friendlyType = rule.type;
        wrapper.appendChild(input);
        const editor = document.createElement("div");
        editor.className = "friendly-editor";
        editor.dataset.editorFor = field;
        wrapper.appendChild(editor);
        if (rule.type === "friendly_list") buildFriendlyList(editor, input, field === "sizes" ? "Size, e.g. S" : "Highlight, e.g. Comfortable");
        if (rule.type === "friendly_stock") buildFriendlyStock(editor, input);
        if (rule.type === "friendly_size_guide") buildFriendlyGuide(editor, input);
        if (rule.help) {
          const hint = document.createElement("div"); hint.className = "form-text"; hint.textContent = rule.help; wrapper.appendChild(hint);
        }
      } else if (kind === "fk") {
        const select = document.createElement("select");
        select.className = "form-select";
        select.name = field;
        if (rule.required) select.required = true;

        const emptyOpt = document.createElement("option");
        emptyOpt.value = "";
        emptyOpt.textContent = "Choose an artist";
        select.appendChild(emptyOpt);

        (fkCache[field] || []).forEach((item) => {
          const opt = document.createElement("option");
          opt.value = item.id;
          opt.textContent = item[fkRule.displayField];
          select.appendChild(opt);
        });

        wrapper.appendChild(select);
      } else if (kind === "choices") {
        const select = document.createElement("select");
        select.className = "form-select";
        select.name = field;
        if (rule.required) select.required = true;

        if (!rule.required) {
          const emptyOpt = document.createElement("option");
          emptyOpt.value = "";
          emptyOpt.textContent = "Choose an option";
          select.appendChild(emptyOpt);
        }
        rule.choices.forEach((choice) => {
          const opt = document.createElement("option");
          opt.value = choice;
          opt.textContent = (rule.choiceLabels && rule.choiceLabels[choice]) || choice;
          select.appendChild(opt);
        });
        wrapper.appendChild(select);
      } else if (kind === "file" || kind === "image" || kind === "images") {
        const input = document.createElement("input");
        input.type = "file";
        input.className = "form-control";
        input.name = kind === "images" ? "images" : field;
        if (kind === "images") input.multiple = true;
        if (kind === "image" || kind === "images") input.accept = "image/*";
        if (rule.required) input.dataset.required = "true"; // pas .required : bloquerait la modif sans re-uploader
        wrapper.appendChild(input);
        if (kind === "images") {
          const hint = document.createElement("div");
          hint.className = "form-text";
          hint.textContent = "Add images to the product gallery (up to 10 MB each). Choose a main image below; new images are added to the end.";
          wrapper.appendChild(hint);
          input.addEventListener("change", updateBasePreview);
        }
      } else if (kind === "json" || kind === "textarea") {
        const input = document.createElement("textarea");
        input.className = "form-control" + (kind === "json" ? " font-monospace" : "");
        input.name = field;
        input.rows = rule.rows || (kind === "json" ? 6 : 4);
        input.placeholder = rule.placeholder || "";
        if (rule.required) input.required = true;
        wrapper.appendChild(input);
        if (rule.help) {
          const hint = document.createElement("div");
          hint.className = "form-text";
          hint.textContent = rule.help;
          wrapper.appendChild(hint);
        }
      } else {
        const input = document.createElement("input");
        input.className = "form-control";
        input.name = field;
        input.type = inputTypeFor(rule);
        if (rule.required) input.required = true;
        wrapper.appendChild(input);
      }

      if (rule.help && !wrapper.querySelector(".form-text")) {
        const hint = document.createElement("div"); hint.className = "form-text"; hint.textContent = rule.help; wrapper.appendChild(hint);
      }

      target.appendChild(wrapper);
    });
    if (cfg.productEditor) {
      const sizesInput = entityForm.querySelector('[name="sizes"]');
      const stockInput = entityForm.querySelector('[name="size_stock"]');
      const stockEditor = entityForm.querySelector('[data-editor-for="size_stock"]');
      if (sizesInput && stockInput && stockEditor) {
        const refreshStockSizes = () => {
          let sizes = []; let stock = {};
          try { sizes = JSON.parse(sizesInput.value || "[]"); } catch (_) {}
          try { stock = JSON.parse(stockInput.value || "{}"); } catch (_) {}
          stockEditor._setValues(sizes, stock);
        };
        entityForm.querySelector('[data-editor-for="sizes"]')?.addEventListener("input", refreshStockSizes);
      }
      entityForm.querySelectorAll("input,textarea,select").forEach((input) => {
        input.addEventListener("input", updateBasePreview);
        input.addEventListener("change", updateBasePreview);
      });
      updateBasePreview();
    }
  }

  function updateBasePreview() {
    const preview = entityForm && entityForm._basePreview;
    if (!preview) return;
    const read = (name) => entityForm.querySelector(`[name="${name}"]`);
    const text = (selector, value) => { const node = preview.querySelector(selector); if (node) node.textContent = value; };
    const name = read("name")?.value.trim() || "Your product name";
    const descriptionInput = read("description");
    const description = descriptionInput?.value.trim() || "Your short description will appear here.";
    const artist = read("artist")?.selectedOptions?.[0]?.textContent;
    const type = [read("color")?.value, read("type")?.value, artist && artist !== "Choose an artist" ? artist : ""].filter(Boolean).join(" · ");
    const price = Number(read("price")?.value || 0);
    text(".base-preview-name", name);
    text(".base-preview-description", description);
    preview.querySelector(".base-preview-description").hidden = !descriptionInput;
    text(".base-preview-type", type);
    const visibleInput = read("is_active");
    const visibility = preview.querySelector(".base-preview-visibility");
    if (visibility) {
      const visible = !visibleInput || visibleInput.checked;
      visibility.textContent = visible ? "Visible to customers" : "Hidden from customers";
      visibility.classList.toggle("is-hidden", !visible);
    }
    const openShop = preview.querySelector(".base-preview-open");
    const recordId = read(cfg.pk)?.value;
    if (openShop) {
      openShop.hidden = !recordId || !!visibleInput && !visibleInput.checked;
      openShop.href = `/product/${cfg.baseEditor ? "base" : "swap"}/${encodeURIComponent(recordId || "")}`;
    }
    text(".base-preview-price", read("is_free")?.checked ? "Free" : new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number.isFinite(price) ? price : 0));
    const image = preview.querySelector(".base-preview-image");
    const empty = preview.querySelector(".base-preview-image-empty");
    const upload = read("images")?.files?.[0];
    const selectedMain = entityForm.querySelector('[name="main_image_id"]:checked');
    const imageUrl = selectedMain?.dataset.previewUrl || read("image_url")?.value.trim() || entityForm.dataset.previewImage || "";
    if (upload) {
      const signature = `${upload.name}:${upload.lastModified}:${upload.size}`;
      if (entityForm.dataset.previewFile !== signature) {
        if (entityForm.dataset.previewObjectUrl) URL.revokeObjectURL(entityForm.dataset.previewObjectUrl);
        entityForm.dataset.previewObjectUrl = URL.createObjectURL(upload);
        entityForm.dataset.previewFile = signature;
      }
      image.src = entityForm.dataset.previewObjectUrl;
    } else {
      if (entityForm.dataset.previewObjectUrl) URL.revokeObjectURL(entityForm.dataset.previewObjectUrl);
      delete entityForm.dataset.previewObjectUrl;
      delete entityForm.dataset.previewFile;
      if (imageUrl) image.src = imageUrl;
    }
    image.hidden = !(upload || imageUrl);
    empty.hidden = !!(upload || imageUrl);
    const features = preview.querySelector(".base-preview-features");
    const sizes = preview.querySelector(".base-preview-sizes");
    features.replaceChildren(); sizes.replaceChildren();
    try { (JSON.parse(read("features")?.value || "[]") || []).forEach((value) => { const tag = document.createElement("span"); tag.textContent = value; features.appendChild(tag); }); } catch (_) {}
    try { (JSON.parse(read("sizes")?.value || "[]") || []).forEach((value) => { const tag = document.createElement("span"); tag.textContent = value; sizes.appendChild(tag); }); } catch (_) {}
  }

  function addFriendlyRow(editor, placeholder, value = "") {
    const row = document.createElement("div"); row.className = "friendly-row";
    const input = document.createElement("input"); input.className = "form-control"; input.placeholder = placeholder; input.value = value;
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "btn btn-outline-danger"; remove.textContent = "Remove";
    remove.addEventListener("click", () => { row.remove(); editor.dispatchEvent(new Event("input", { bubbles: true })); });
    row.append(input, remove); editor.appendChild(row);
    input.addEventListener("input", () => editor.dispatchEvent(new Event("input", { bubbles: true })));
    return input;
  }

  function buildFriendlyList(editor, hidden, placeholder) {
    const rows = document.createElement("div"); editor.appendChild(rows);
    const add = document.createElement("button"); add.type = "button"; add.className = "btn btn-sm btn-outline-secondary mt-2"; add.textContent = "+ Add another";
    add.addEventListener("click", () => { addFriendlyRow(rows, placeholder); sync(); rows.lastElementChild?.querySelector("input")?.focus(); }); editor.appendChild(add);
    const sync = () => { hidden.value = JSON.stringify(Array.from(rows.querySelectorAll("input")).map((i) => i.value.trim()).filter(Boolean)); };
    rows.addEventListener("input", sync); addFriendlyRow(rows, placeholder); sync();
    editor._setValues = (values) => { rows.replaceChildren(); (Array.isArray(values) ? values : []).forEach((value) => addFriendlyRow(rows, placeholder, value)); if (!rows.children.length) addFriendlyRow(rows, placeholder); sync(); };
  }

  function buildFriendlyStock(editor, hidden) {
    const hint = document.createElement("div"); hint.className = "form-text mb-2"; hint.textContent = "Size quantities follow the sizes listed above."; editor.appendChild(hint);
    const rows = document.createElement("div"); editor.appendChild(rows);
    editor._setValues = (sizes, stock = {}) => {
      rows.replaceChildren();
      (Array.isArray(sizes) ? sizes : []).forEach((size) => {
        const row = document.createElement("div"); row.className = "friendly-row friendly-stock-row";
        const label = document.createElement("span"); label.className = "friendly-stock-size"; label.textContent = size;
        const qty = document.createElement("input"); qty.type = "number"; qty.min = "0"; qty.step = "1"; qty.className = "form-control"; qty.placeholder = "Not tracked";
        if (Object.prototype.hasOwnProperty.call(stock, size)) qty.value = stock[size];
        qty.addEventListener("input", sync); row.append(label, qty); rows.appendChild(row);
      }); sync();
    };
    const sync = () => { const output = {}; rows.querySelectorAll(".friendly-stock-row").forEach((row) => { const v = row.querySelector("input").value; if (v !== "") output[row.querySelector("span").textContent] = Math.max(0, Number(v) || 0); }); hidden.value = JSON.stringify(output); };
    editor._sync = sync;
    editor._setValues([], {});
  }

  function buildFriendlyGuide(editor, hidden) {
    editor.classList.add("friendly-guide");
    const heading = document.createElement("p"); heading.className = "friendly-guide-intro";
    heading.textContent = "Add the measurements customers will see in the size guide. You can enter a single number or a range, such as 36-38.";
    const measureCard = document.createElement("div"); measureCard.className = "friendly-guide-card";
    const measureTitle = document.createElement("h6"); measureTitle.textContent = "Size measurements";
    const columnsLabel = document.createElement("label"); columnsLabel.className = "form-label"; columnsLabel.textContent = "Measurement columns";
    const columns = document.createElement("input"); columns.className = "form-control"; columns.placeholder = "Chest, Length";
    const columnsHelp = document.createElement("div"); columnsHelp.className = "form-text mb-3"; columnsHelp.textContent = "Separate measurement names with commas. For example: Chest, Waist, Hips.";
    const tableScroll = document.createElement("div"); tableScroll.className = "friendly-guide-table-scroll";
    const table = document.createElement("div"); table.className = "friendly-guide-rows";
    tableScroll.appendChild(table);
    const add = document.createElement("button"); add.type = "button"; add.className = "btn btn-sm btn-outline-secondary mt-3";
    add.innerHTML = '<i class="bi bi-plus-lg me-1"></i>Add size row';
    measureCard.append(measureTitle, columnsLabel, columns, columnsHelp, tableScroll, add);
    const extras = document.createElement("div"); extras.className = "friendly-guide-extras";
    const howCard = document.createElement("div"); howCard.className = "friendly-guide-card";
    const howTitle = document.createElement("h6"); howTitle.textContent = "How to measure";
    const howHelp = document.createElement("p"); howHelp.className = "form-text"; howHelp.textContent = "Add one instruction per line. Use “Name: instruction”, for example “Chest: Measure around the fullest part”.";
    const how = document.createElement("textarea"); how.className = "form-control"; how.rows = 4;
    howCard.append(howTitle, howHelp, how);
    const adviceCard = document.createElement("div"); adviceCard.className = "friendly-guide-card";
    const adviceTitle = document.createElement("h6"); adviceTitle.textContent = "Fit advice";
    const adviceHelp = document.createElement("p"); adviceHelp.className = "form-text"; adviceHelp.textContent = "Add one tip per line, such as “men: Choose your usual size”.";
    const advice = document.createElement("textarea"); advice.className = "form-control"; advice.rows = 4;
    adviceCard.append(adviceTitle, adviceHelp, advice);
    extras.append(howCard, adviceCard);
    editor.append(heading, measureCard, extras);
    function addGuideRow(size = "", values = {}) {
      const row = document.createElement("div"); row.className = "friendly-guide-row";
      const sizeInput = document.createElement("input"); sizeInput.className = "form-control"; sizeInput.placeholder = "Size"; sizeInput.setAttribute("aria-label", "Size name"); sizeInput.value = size; row.appendChild(sizeInput);
      columns.value.split(",").map((x) => x.trim()).filter(Boolean).forEach((column) => { const input = document.createElement("input"); input.className = "form-control"; input.placeholder = "Enter value"; input.setAttribute("aria-label", column); const value = values[column.toLowerCase()]; input.value = Array.isArray(value) ? value.join("-") : (value ?? ""); row.appendChild(input); });
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "btn btn-sm btn-light friendly-guide-remove"; remove.title = "Remove this size"; remove.setAttribute("aria-label", "Remove this size"); remove.innerHTML = '<i class="bi bi-trash3"></i>'; remove.addEventListener("click", () => { row.remove(); sync(); }); row.appendChild(remove);
      row.querySelectorAll("input").forEach((input) => input.addEventListener("input", sync)); table.appendChild(row);
    }
    function parseMeasure(raw) { const parts = raw.split(/\s*[-–]\s*/).map(Number); if (!raw.trim() || parts.some((n) => !Number.isFinite(n))) return raw.trim() || null; return parts.length > 1 ? parts : parts[0]; }
    function sync() {
      const names = columns.value.split(",").map((x) => x.trim()).filter(Boolean);
      table.style.setProperty("--guide-columns", `minmax(5.5rem, .8fr) repeat(${names.length}, minmax(7rem, 1fr)) 2.5rem`);
      table.querySelector(".friendly-guide-header")?.remove();
      const header = document.createElement("div"); header.className = "friendly-guide-header";
      ["Size", ...names, ""].forEach((title) => { const cell = document.createElement("span"); cell.textContent = title; header.appendChild(cell); });
      table.prepend(header);
      const rows = Array.from(table.children).filter((row) => !row.classList.contains("friendly-guide-header")).map((row) => { const inputs = Array.from(row.querySelectorAll("input")); if (!inputs.length) return null; const item = { size: inputs[0].value.trim() }; names.forEach((name, index) => { const value = parseMeasure(inputs[index + 1]?.value || ""); if (value !== null) item[name.toLowerCase()] = value; }); return item; }).filter((row) => row && row.size);
      const parseLines = (text) => Object.fromEntries(text.split(/\r?\n/).map((line) => { const split = line.indexOf(":"); return split < 0 ? null : [line.slice(0, split).trim(), line.slice(split + 1).trim()]; }).filter((item) => item && item[0] && item[1]));
      const howItems = how.value.split(/\r?\n/).map((line) => { const split = line.indexOf(":"); return split < 0 ? null : { label: line.slice(0, split).trim(), text: line.slice(split + 1).trim() }; }).filter((x) => x && x.label && x.text);
      hidden.value = JSON.stringify({ columns: names, rows, how_to_measure: howItems, advice: parseLines(advice.value) });
    }
    columns.addEventListener("input", () => { const oldNames = table.querySelector(".friendly-guide-header") ? Array.from(table.querySelector(".friendly-guide-header").children).slice(1, -1).map((cell) => cell.textContent.toLowerCase()) : []; const existing = Array.from(table.children).filter((row) => !row.classList.contains("friendly-guide-header")).map((row) => { const inputs = Array.from(row.querySelectorAll("input")); return { size: inputs[0].value, values: Object.fromEntries(oldNames.map((name, i) => [name, inputs[i + 1]?.value || ""])) }; }); table.replaceChildren(); existing.forEach((r) => addGuideRow(r.size, r.values)); sync(); });
    [how, advice].forEach((input) => input.addEventListener("input", sync));
    add.addEventListener("click", () => { addGuideRow(); sync(); });
    editor._setValues = (guide = {}) => { columns.value = (guide.columns || []).join(", "); table.replaceChildren(); (guide.rows || []).forEach((row) => addGuideRow(row.size, row)); how.value = (guide.how_to_measure || []).map((item) => `${item.label}: ${item.text}`).join("\n"); advice.value = Object.entries(guide.advice || {}).map(([key, value]) => `${key}: ${value}`).join("\n"); sync(); };
    editor._setValues({});
  }

  function formatCellValue(field, rule, rawValue) {
    if (cfg.foreignKeys && cfg.foreignKeys[field]) return fkDisplayValue(field, rawValue);
    if (rule && rule.type === "bool") return rawValue ? "Yes" : "No";
    return rawValue;
  }

  function orderMoney(value) {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number(value) || 0);
  }

  async function viewOrderItems(orderId) {
    if (!orderItemsModal || !orderItemsBody) return;
    orderItemsModalTitle.textContent = `Order #${orderId} details`;
    orderItemsSummary.textContent = "Loading order items…";
    orderItemsBody.innerHTML = '<tr><td colspan="6" class="text-muted text-center py-4">Loading…</td></tr>';
    orderItemsModal.show();
    try {
      const result = await apiRequest(`${cfg.orderItemsApiBase}/${encodeURIComponent(orderId)}/items`);
      orderItemsSummary.textContent = `${result.fullName || "Customer"} · ${cfg.statusLabels?.[result.status] || result.status || ""} · Order total ${orderMoney(result.total)}`;
      const customer = document.getElementById("order-customer-details");
      if (customer) {
        customer.replaceChildren();
        const details = result.customer || {};
        [["Email", details.email], ["Phone", details.phone], ["Address", [details.address, details.city, details.region, details.country].filter(Boolean).join(", ")], ["Payment", details.paymentMethod ? details.paymentMethod.replaceAll("_", " ") : ""]].forEach(([label, value]) => {
          if (!value) return;
          const line = document.createElement("div"); line.className = "order-customer-line";
          const strong = document.createElement("strong"); strong.textContent = `${label}: `;
          line.append(strong, document.createTextNode(value)); customer.appendChild(line);
        });
      }
      orderItemsBody.replaceChildren();
      if (!result.items?.length) {
        orderItemsBody.innerHTML = '<tr><td colspan="6" class="text-muted text-center py-4">This order has no items.</td></tr>';
        return;
      }
      result.items.forEach((item) => {
        const row = document.createElement("tr");
        [item.name, item.kind === "base" ? "Base" : item.kind === "swap" ? "Swap" : item.kind, item.size || "—", item.quantity, orderMoney(item.unitPrice), orderMoney(item.lineTotal)].forEach((value, index) => {
          const cell = document.createElement("td");
          cell.textContent = value == null ? "" : String(value);
          if (index >= 3) cell.className = "text-end";
          row.appendChild(cell);
        });
        orderItemsBody.appendChild(row);
      });
    } catch (error) {
      orderItemsSummary.textContent = "Could not load order items.";
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 6;
      cell.className = "text-danger text-center py-4";
      cell.textContent = String(error.message || error);
      row.appendChild(cell);
      orderItemsBody.replaceChildren(row);
    }
  }

  function renderStockCell(td, field, rawValue, item) {
    const rule = cfg.stockFields && cfg.stockFields[field];
    if (!rule) return false;
    const badge = (label, state) => { const el = document.createElement("span"); el.className = `stock-badge stock-${state}`; el.textContent = label; td.appendChild(el); };
    if (rule.type === "quantity") {
      const quantity = rawValue == null || rawValue === "" ? null : Number(rawValue);
      if (quantity === null || !Number.isFinite(quantity)) badge("Not tracked", "unknown");
      else if (quantity <= 0) badge("Out of stock", "out");
      else if (quantity <= (rule.lowThreshold || 3)) badge(`Low · ${quantity} left`, "low");
      else badge(`In stock · ${quantity}`, "in");
      return true;
    }
    if (rule.type === "size_map") {
      let stock = {};
      try { stock = rawValue && typeof rawValue === "object" ? rawValue : JSON.parse(rawValue || "{}"); } catch (_) {}
      let sizes = [];
      try { sizes = item.sizes && typeof item.sizes === "object" ? item.sizes : JSON.parse(item.sizes || "[]"); } catch (_) {}
      if (!Object.keys(stock).length) { badge("Not tracked", "unknown"); return true; }
      (sizes.length ? sizes : Object.keys(stock)).forEach((size) => {
        const quantity = Object.prototype.hasOwnProperty.call(stock, size) ? Number(stock[size]) : null;
        const label = document.createElement("span");
        label.className = `stock-size-badge ${quantity === null ? "stock-unknown" : quantity <= 0 ? "stock-out" : quantity <= (rule.lowThreshold || 3) ? "stock-low" : "stock-in"}`;
        label.textContent = `${size}: ${quantity === null ? "Not tracked" : quantity <= 0 ? "Out" : quantity}`;
        label.title = quantity === null ? `${size}: stock not tracked` : `${size}: ${quantity} in stock`;
        td.appendChild(label);
      });
      return true;
    }
    return false;
  }

  async function setOrderStatus(item, status, label) {
    const needsConfirm = ["confirmed", "shipped", "cancelled"].includes(status);
    if (needsConfirm && !(await confirmAction(`${label} for order #${item[cfg.pk]}?`))) return;
    try {
      await apiRequest(apiUrl("/" + item[cfg.pk]), { method: "PUT", body: JSON.stringify({ status }) });
      showUndoToast(`Order #${item[cfg.pk]} updated: ${label.toLowerCase()}.`, async () => {
        await apiRequest(apiUrl("/" + item[cfg.pk]), { method: "PUT", body: JSON.stringify({ status: item.status }) });
        fetchList();
      });
      fetchList();
    } catch (error) { showToast(error.message, "danger"); }
  }

  function updateBulkBar() {
    if (!bulkBar) return;
    const n = selectedIds.size;
    bulkBar.classList.toggle("d-none", n === 0);
    bulkBar.classList.toggle("d-flex", n > 0);
    if (bulkCount) bulkCount.textContent = n;
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = n > 0 && n === lastItems.length;
      selectAllCheckbox.indeterminate = n > 0 && n < lastItems.length;
    }
  }

  function renderRow(item) {
    const tr = document.createElement("tr");
    const rowId = item[cfg.pk];

    if (document.getElementById("select-all")) {
      const td = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "form-check-input row-checkbox";
      checkbox.checked = selectedIds.has(rowId);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) selectedIds.add(rowId);
        else selectedIds.delete(rowId);
        updateBulkBar();
      });
      td.appendChild(checkbox);
      tr.appendChild(td);
    }

    cfg.listFields.forEach((field) => {
      const td = document.createElement("td");
      const rule = (cfg.insertFields && cfg.insertFields[field]) || (cfg.updateFields && cfg.updateFields[field]);
      const fkRule = cfg.foreignKeys && cfg.foreignKeys[field];
      const rawValue = fkRule && fkRule.sourceField ? item[fkRule.sourceField] : item[field];

      // Identifiants et nombres en police à chasse fixe — une donnée se lit
      // différemment d'une phrase, la typo le signale.
      const isDataLike = field === cfg.pk || (rule && (rule.type === "int" || rule.type === "float"));
      if (isDataLike) td.classList.add("cell-mono");

      if (renderStockCell(td, field, rawValue, item)) {
        // Stock has a dedicated, plain-language status display.
      } else if (cfg.statusLabels && field === "status" && rawValue != null) {
        const status = document.createElement("span");
        const key = String(rawValue).toLowerCase();
        status.className = "status-pill status-" + key.replace(/[^a-z0-9-]/g, "");
        status.textContent = cfg.statusLabels[key] || key.replaceAll("_", " ");
        td.appendChild(status);
      } else if (cfg.jsonListFields && cfg.jsonListFields.includes(field)) {
        let values = [];
        try { values = Array.isArray(rawValue) ? rawValue : JSON.parse(rawValue || "[]"); } catch (_) {}
        values.forEach((value) => { const tag = document.createElement("span"); tag.className = "admin-list-tag"; tag.textContent = value; td.appendChild(tag); });
      } else if (rule && rule.type === "images" && Array.isArray(rawValue)) {
        rawValue.slice(0, 4).forEach((image) => {
          const img = document.createElement("img");
          img.src = image.url;
          img.alt = "Product image";
          img.title = image.url;
          img.style.cssText = "width:40px;height:40px;object-fit:cover;border-radius:6px;margin-right:3px;";
          td.appendChild(img);
        });
        if (rawValue.length > 4) td.append(" +" + (rawValue.length - 4));
      } else if (rule && rule.type === "image" && rawValue) {
        const img = document.createElement("img");
        img.src = "/uploads/" + rawValue;
        img.alt = field;
        img.style.cssText = "width:40px;height:40px;object-fit:cover;border-radius:6px;";
        td.appendChild(img);
      } else if (rule && rule.type === "file" && rawValue) {
        const link = document.createElement("a");
        link.href = "/uploads/" + rawValue;
        link.target = "_blank";
        link.textContent = "View file";
        td.appendChild(link);
      } else if (field === "created_at" && rawValue) {
        const date = new Date(rawValue);
        td.textContent = Number.isNaN(date.getTime()) ? String(rawValue) : date.toLocaleString();
      } else {
        const value = formatCellValue(field, rule, rawValue);
        td.textContent = value === null || value === undefined ? "" : value;
      }
      tr.appendChild(td);
    });

    const actionsTd = document.createElement("td");
    actionsTd.className = "text-end";

    if (cfg.orderItemsApiBase) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-sm btn-outline-secondary btn-icon me-1";
      btn.innerHTML = '<i class="bi bi-eye"></i>';
      btn.title = "View order items";
      btn.setAttribute("aria-label", `View items for order ${rowId}`);
      btn.addEventListener("click", () => viewOrderItems(rowId));
      actionsTd.appendChild(btn);
    }

    if (cfg.orderWorkflow) {
      const status = String(item.status || "pending").toLowerCase();
      const next = status === "pending" ? ["contacted", "Mark contacted"]
        : status === "contacted" ? ["confirmed", "Confirm order"]
        : ["shipped", "Mark shipped"];
      if (!["shipped", "cancelled"].includes(status)) {
        const advance = document.createElement("button");
        advance.type = "button";
        advance.className = "btn btn-sm btn-outline-success me-1";
        advance.textContent = next[1];
        advance.addEventListener("click", () => setOrderStatus(item, next[0], next[1]));
        actionsTd.appendChild(advance);
        const cancel = document.createElement("button");
        cancel.type = "button"; cancel.className = "btn btn-sm btn-outline-danger me-1"; cancel.textContent = "Cancel";
        cancel.addEventListener("click", () => setOrderStatus(item, "cancelled", "Cancel order"));
        actionsTd.appendChild(cancel);
      }
    }

    if (cfg.actions.includes("update")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-sm btn-outline-primary btn-icon me-1";
      btn.innerHTML = '<i class="bi bi-pencil"></i>';
      btn.title = "Edit";
      btn.addEventListener("click", () => openEditModal(item));
      actionsTd.appendChild(btn);
    }

    (cfg.customActions || []).forEach((action) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-sm btn-outline-warning btn-icon me-1";
      btn.innerHTML = '<i class="bi bi-lightning-charge"></i> ' + (action.label || action.name);
      btn.addEventListener("click", () => runCustomAction(item[cfg.pk], action));
      actionsTd.appendChild(btn);
    });

    if (cfg.actions.includes("delete")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-sm btn-outline-danger btn-icon";
      btn.innerHTML = '<i class="bi bi-trash3"></i>';
      btn.title = "Delete";
      btn.addEventListener("click", () => deleteItem(item[cfg.pk]));
      actionsTd.appendChild(btn);
    }

    tr.appendChild(actionsTd);
    tableBody.appendChild(tr);
  }

  function renderLoading() {
    const colspan = cfg.listFields.length + 2;
    tableBody.innerHTML = `<tr class="table-loading-row"><td colspan="${colspan}">
      <div class="spinner-border spinner-border-sm text-secondary me-2" role="status"></div>Loading...
    </td></tr>`;
  }

  function renderEmpty() {
    const colspan = cfg.listFields.length + 2;
    tableBody.innerHTML = `<tr class="table-empty-row"><td colspan="${colspan}">
      <i class="bi bi-inbox fs-3 d-block mb-2"></i>No results found
    </td></tr>`;
  }

  function updateResultCount(total) {
    const el = document.getElementById("result-count");
    if (el) el.textContent = total + (total === 1 ? " result" : " results");
  }

  function updatePagination(result) {
    if (pageIndicator) {
      pageIndicator.textContent = `Page ${result.page} / ${result.total_pages}`;
    }
    if (btnPrevPage) btnPrevPage.disabled = result.page <= 1;
    if (btnNextPage) btnNextPage.disabled = result.page >= result.total_pages;
  }

  function updateSortIcons() {
    document.querySelectorAll(".sort-icon").forEach((icon) => {
      const field = icon.dataset.field;
      icon.className = "bi sort-icon";
      if (field === state.sort) {
        icon.classList.add(state.order === "desc" ? "bi-caret-down-fill" : "bi-caret-up-fill");
      } else {
        icon.classList.add("bi-arrow-down-up");
      }
    });
  }

  function renderList(result) {
    tableBody.innerHTML = "";
    lastItems = result.items || [];
    selectedIds.clear();
    if (lastItems.length === 0) {
      renderEmpty();
    } else {
      lastItems.forEach(renderRow);
    }
    updateResultCount(result.total || 0);
    updatePagination(result);
    updateSortIcons();
    updateBulkBar();
  }

  function buildQuery(extra) {
    const params = { ...state.searchParams, ...(extra || {}) };
    if (state.sort) {
      params.sort = state.sort;
      params.order = state.order;
    }
    return new URLSearchParams(params).toString();
  }

  async function fetchList() {
    renderLoading();
    const hasSearch = Object.keys(state.searchParams).length > 0;
    const path = (hasSearch ? "/search" : "") + "?" + buildQuery({ page: state.page, per_page: state.perPage });
    try {
      const result = await apiRequest(apiUrl(path));
      renderList(result);
    } catch (e) {
      showToast(e.message, "danger");
    }
  }

  function goToPage(page) {
    state.page = Math.max(1, page);
    fetchList();
  }

  function applySort(field) {
    if (state.sort === field) {
      state.order = state.order === "asc" ? "desc" : "asc";
    } else {
      state.sort = field;
      state.order = "asc";
    }
    state.page = 1;
    fetchList();
  }

  function runSearch(params) {
    state.searchParams = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
    state.page = 1;
    fetchList();
  }

  function openCreateModal() {
    mode = "create";
    modalTitle.textContent = `Add ${friendlyEntityName()}`;
    buildFormFields(cfg.insertFields);
    formDirty = false;
    savingEntity = false;
    if (btnSave) btnSave.innerHTML = `<i class="bi bi-check-lg"></i> Add ${friendlyEntityName()}`;
    if (cfg.productEditor) { entityForm.dataset.previewImage = ""; updateBasePreview(); }
    bsModal.show();
  }

  function openEditModal(item) {
    mode = "edit";
    modalTitle.textContent = `Edit ${friendlyEntityName()}`;
    buildFormFields(cfg.updateFields);
    formDirty = false;
    savingEntity = false;
    if (btnSave) btnSave.innerHTML = '<i class="bi bi-check-lg"></i> Save changes';
    if (cfg.productEditor) {
      const images = Array.isArray(item.images) ? item.images : [];
      entityForm.dataset.previewImage = images[0]?.originalUrl || images[0]?.url || "";
    }
    Object.entries(cfg.updateFields || {}).forEach(([field, rule]) => {
      const input = entityForm.querySelector(`[name="${field}"]`);
      if (!input) return;
      if (["friendly_list", "friendly_stock", "friendly_size_guide"].includes(rule.type)) {
        try {
          const value = item[field] ? JSON.parse(item[field]) : (rule.type === "friendly_list" ? [] : rule.type === "friendly_stock" ? {} : {});
          const editor = entityForm.querySelector(`[data-editor-for="${field}"]`);
          if (rule.type === "friendly_list") editor?._setValues(value);
          else if (rule.type === "friendly_stock") editor?._setValues(JSON.parse(item.sizes || "[]"), value);
          else editor?._setValues(value);
        } catch (_) { /* Invalid legacy JSON opens with empty guided controls. */ }
      } else if (rule.type === "bool") {
        input.checked = !!item[field];
      } else if (rule.type === "json" && item[field]) {
        try { input.value = JSON.stringify(JSON.parse(item[field]), null, 2); }
        catch (_) { input.value = item[field]; }
      } else if (rule.type === "images") {
        const images = Array.isArray(item.images) ? item.images : [];
        if (images.length) {
          const gallery = document.createElement("div");
          gallery.className = "admin-image-gallery";
          images.forEach((image, imageIndex) => {
            const card = document.createElement("div");
            card.className = "admin-image-item";
            const img = document.createElement("img");
            img.src = image.url;
            img.alt = "Uploaded product image";
            const meta = document.createElement("div");
            meta.className = "admin-image-meta";
            const mainLabel = document.createElement("label");
            const mainImage = document.createElement("input");
            mainImage.type = "radio"; mainImage.name = "main_image_id"; mainImage.value = image.id;
            mainImage.dataset.previewUrl = image.originalUrl || image.url;
            const firstStorefrontImage = images.find((candidate) => !candidate.showroomPlaceholder);
            mainImage.disabled = !!(cfg.baseEditor && image.showroomPlaceholder);
            mainImage.checked = (!cfg.baseEditor || !image.showroomPlaceholder) && image.id === (cfg.baseEditor ? firstStorefrontImage?.id : images[0]?.id);
            mainImage.title = "Show this image first on the storefront";
            mainImage.addEventListener("change", updateBasePreview);
            mainLabel.append(mainImage, document.createTextNode(cfg.baseEditor && image.showroomPlaceholder ? " Mix placeholder" : " Main image"));
            meta.appendChild(mainLabel);
            const showroomLabel = document.createElement("label");
            let showroom;
            if (cfg.baseEditor) {
              showroom = document.createElement("input");
              showroom.type = "radio";
              showroom.name = "showroom_image_id";
              showroom.value = image.id;
              showroom.checked = !!image.useInShowroom;
              showroom.title = "Use this image in the mix preview";
              showroomLabel.append(showroom, document.createTextNode(" Mix preview"));
              meta.appendChild(showroomLabel);
            }
            const remove = document.createElement("input");
            remove.type = "checkbox";
            remove.name = "remove_image_ids";
            remove.value = image.id;
            remove.title = "Remove this image";
            remove.addEventListener("change", () => {
              if (remove.checked && mainImage.checked) {
                mainImage.checked = false;
                const replacement = gallery.querySelector('input[name="main_image_id"]:checked');
                if (!replacement) {
                  const next = Array.from(gallery.querySelectorAll('input[name="main_image_id"]')).find((radio) => radio !== mainImage && !radio.disabled && !radio.closest(".admin-image-item").querySelector('[name="remove_image_ids"]:checked'));
                  if (next) next.checked = true;
                  else remove.checked = false;
                }
              }
              if (remove.checked && showroom?.checked) {
                remove.checked = false;
                showToast("Choose another mix preview image before removing this one.", "warning");
              }
              updateBasePreview();
            });
            const removeLabel = document.createElement("label");
            removeLabel.append(remove, document.createTextNode(" Remove"));
            meta.append(removeLabel);
            card.append(img, meta);
            gallery.appendChild(card);
          });
          const hint = document.createElement("div");
          hint.className = "form-text";
          hint.textContent = cfg.baseEditor
            ? "Choose which image appears first on the storefront and which image is used in the mix preview. New uploads are added to the gallery."
            : "Choose which image appears first on the storefront. New uploads are added to the gallery.";
          input.insertAdjacentElement("afterend", gallery);
          gallery.insertAdjacentElement("afterend", hint);
        }
      } else if (rule.type === "file" || rule.type === "image") {
        // Impossible de préremplir un <input type="file"> (restriction
        // navigateur) — on affiche juste un lien vers le fichier actuel.
        if (item[field]) {
          const hint = document.createElement("div");
          hint.className = "form-text";
          const label = document.createTextNode("Fichier actuel : ");
          const link = document.createElement("a");
          const safePath = String(item[field]).split("/").map(encodeURIComponent).join("/");
          link.href = "/uploads/" + safePath;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = "voir";
          hint.append(label, link, document.createTextNode(" (laisser vide pour ne pas changer)"));
          input.insertAdjacentElement("afterend", hint);
        }
      } else {
        const fkRule = cfg.foreignKeys && cfg.foreignKeys[field];
        const value = fkRule && fkRule.sourceField ? item[fkRule.sourceField] : item[field];
        input.value = value != null ? value : "";
      }
    });
    entityForm.querySelector(`[name="${cfg.pk}"]`).value = item[cfg.pk];
    if (cfg.productEditor) updateBasePreview();
    bsModal.show();
  }

  function validateRequiredFields(fieldsConfig) {
    for (const [field, rule] of Object.entries(fieldsConfig || {})) {
      if (!rule.required) continue;
      const input = entityForm.querySelector(`[name="${field}"]`);
      if (!input || (input.type === "checkbox" ? input.checked : String(input.value || "").trim() !== "")) continue;
      const section = input.closest("[data-base-section]");
      if (section) entityForm.querySelector(`.base-editor-tab[data-tab-key="${section.dataset.baseSection}"]`)?.click();
      input.focus();
      showToast(`Please fill in “${rule.label || field.replaceAll("_", " ")}” before saving.`, "warning");
      return false;
    }
    return true;
  }

  function hasFileField(fieldsConfig) {
      return Object.values(fieldsConfig || {}).some((rule) => rule.type === "file" || rule.type === "image" || rule.type === "images");
  }

  function collectPayload(fieldsConfig) {
    const payload = {};
    Object.entries(fieldsConfig || {}).forEach(([field, rule]) => {
      const input = entityForm.querySelector(`[name="${field}"]`);
      if (!input) return;
      if (rule.type === "bool") {
        payload[field] = input.checked;
      } else if (["friendly_list", "friendly_stock", "friendly_size_guide"].includes(rule.type)) {
        try {
          const value = input.value.trim() ? JSON.parse(input.value) : (rule.type === "friendly_list" ? [] : {});
          payload[field] = value.length === 0 || Object.keys(value).length === 0 ? null : JSON.stringify(value);
        } catch (_) { throw new Error(`Please check the entries in “${rule.label || field}”.`); }
      } else if (rule.type === "images") {
        const input = entityForm.querySelector('[name="images"]');
        if (input && input.files.length) payload.images = Array.from(input.files);
        entityForm.querySelectorAll('[name="remove_image_ids"]:checked').forEach((checkbox) => {
          if (!payload.remove_image_ids) payload.remove_image_ids = [];
          payload.remove_image_ids.push(checkbox.value);
        });
      } else if (rule.type === "file" || rule.type === "image") {
        // Un input file vide veut dire "ne pas changer le fichier existant"
        // en modification — on ne l'inclut simplement pas dans le payload.
        if (input.files && input.files.length > 0) payload[field] = input.files[0];
      } else if (rule.type === "json") {
        if (!input.value.trim()) payload[field] = null;
        else {
          try { payload[field] = JSON.stringify(JSON.parse(input.value)); }
          catch (_) { throw new Error(`${rule.label || field} must contain valid JSON.`); }
        }
      } else if (input.value !== "") {
        payload[field] = input.value;
      }
    });
    const showroomChoice = entityForm.querySelector('[name="showroom_image_id"]:checked');
    if (showroomChoice) payload.showroom_image_id = showroomChoice.value;
    const mainImageChoice = entityForm.querySelector('[name="main_image_id"]:checked');
    if (mainImageChoice) payload.main_image_id = mainImageChoice.value;
    return payload;
  }

  function toFormData(payload) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (Array.isArray(value)) value.forEach((entry) => formData.append(key, entry));
      else formData.append(key, value);
    });
    return formData;
  }

  async function saveEntity() {
    const isCreate = mode === "create";
    const fieldsConfig = isCreate ? cfg.insertFields : cfg.updateFields;
    try {
      if (!validateRequiredFields(fieldsConfig)) return;
      const payload = collectPayload(fieldsConfig);
      const recordId = !isCreate ? entityForm.querySelector(`[name="${cfg.pk}"]`).value : null;
      const original = !isCreate ? lastItems.find((row) => String(row[cfg.pk]) === String(recordId)) : null;
      const previousValues = {};
      const changedFields = [];
      let photoChanges = !!(payload.images?.length || payload.remove_image_ids?.length);
      if (original?.images?.length) {
        const selectedMain = payload.main_image_id;
        const oldMain = original.images.find((image) => cfg.baseEditor ? !image.showroomPlaceholder : true);
        if (selectedMain && oldMain && String(selectedMain) !== String(oldMain.id)) photoChanges = true;
        const selectedShowroom = payload.showroom_image_id;
        const oldShowroom = original.images.find((image) => image.useInShowroom);
        if (selectedShowroom && oldShowroom && String(selectedShowroom) !== String(oldShowroom.id)) photoChanges = true;
      }
      if (original) Object.keys(fieldsConfig || {}).forEach((field) => {
        if (["images", "main_image_id", "remove_image_ids"].includes(field)) return;
        const oldValue = original[field] !== undefined ? original[field] : original[`${field}_id`];
        if (JSON.stringify(oldValue ?? null) !== JSON.stringify(payload[field] ?? null)) {
          previousValues[field] = oldValue ?? null;
          changedFields.push(field);
        }
      });
      const body = hasFileField(fieldsConfig) ? toFormData(payload) : JSON.stringify(payload);
      savingEntity = true;
      if (btnSave) btnSave.disabled = true;
      if (isCreate) {
        const created = await apiRequest(apiUrl(), { method: "POST", body });
        showUndoToast("Added successfully.", async () => {
          await apiRequest(apiUrl("/" + created[cfg.pk]), { method: "DELETE" });
          fetchList();
        });
      } else {
        await apiRequest(apiUrl("/" + recordId), { method: "PUT", body });
        if (changedFields.length) showUndoToast(photoChanges ? "Product saved. Undo details and stock changes." : "Changes saved.", async () => {
          await apiRequest(apiUrl("/" + recordId), { method: "PUT", body: JSON.stringify(previousValues) });
          fetchList();
        });
        else if (photoChanges) showToast("Product photos saved.", "success");
        else showToast("Changes saved.", "success");
      }
      formDirty = false;
      savingEntity = false;
      if (btnSave) btnSave.disabled = false;
      bsModal.hide();
      fetchList();
    } catch (e) {
      savingEntity = false;
      if (btnSave) btnSave.disabled = false;
      showToast(e.message, "danger");
    }
  }

  async function deleteItem(id) {
    const item = lastItems.find((row) => String(row[cfg.pk]) === String(id));
    const label = item && (item.name || item.full_name || item.email || item[cfg.pk]);
    const ok = await confirmAction(`Delete ${label ? `“${label}”` : "this item"} permanently? This cannot be undone.`);
    if (!ok) return;
    try {
      await apiRequest(apiUrl("/" + id), { method: "DELETE" });
      showToast("Deleted.", "success");
      fetchList();
    } catch (e) {
      showToast(e.message, "danger");
    }
  }

  async function bulkDeleteSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const ok = await confirmAction(`Delete the ${ids.length} selected items permanently?`);
    if (!ok) return;
    try {
      await Promise.all(ids.map((id) => apiRequest(apiUrl("/" + id), { method: "DELETE" })));
      showToast(`Deleted ${ids.length} items.`, "success");
      fetchList();
    } catch (e) {
      showToast(e.message, "danger");
    }
  }

  async function bulkUpdateSelected() {
    const ids = Array.from(selectedIds);
    const fields = Object.keys(cfg.updateFields || {});
    if (!ids.length || !fields.length) return;
    const field = prompt("Field to update (" + fields.join(", ") + "):", fields[0]);
    if (!field || !fields.includes(field)) return;
    const raw = prompt("New value for " + field + ":");
    if (raw === null) return;
    const rule = cfg.updateFields[field] || {};
    let value = raw;
    if (rule.type === "bool") value = ["true", "1", "yes", "on"].includes(raw.toLowerCase());
    else if (rule.type === "int" || rule.type === "float") value = Number(raw);
    if ((rule.type === "int" || rule.type === "float") && !Number.isFinite(value)) {
      showToast("Enter a valid number.", "danger");
      return;
    }
    const confirmed = await confirmAction(`Update ${field} on ${ids.length} selected records?`);
    if (!confirmed) return;
    try {
      await Promise.all(ids.map((id) => apiRequest(apiUrl("/" + id), {
        method: "PUT", body: JSON.stringify({ [field]: value }),
      })));
      showToast("Updated " + ids.length + " records.", "success");
      fetchList();
    } catch (e) {
      showToast(e.message, "danger");
    }
  }

  function parseCsv(text) {
    const rows = [];
    let row = [], value = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"' && quoted && text[i + 1] === '"') { value += '"'; i++; }
      else if (ch === '"') quoted = !quoted;
      else if (ch === "," && !quoted) { row.push(value); value = ""; }
      else if ((ch === "\n" || ch === "\r") && !quoted) {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(value); value = "";
        if (row.some((cell) => cell !== "")) rows.push(row);
        row = [];
      } else value += ch;
    }
    row.push(value);
    if (row.some((cell) => cell !== "")) rows.push(row);
    return rows;
  }

  async function importCsvFile(file) {
    try {
      const rows = parseCsv(await file.text());
      if (rows.length < 2) throw new Error("CSV needs a header and at least one data row.");
      const headers = rows[0].map((header) => header.trim());
      const required = Object.entries(cfg.insertFields || {}).filter(([, rule]) => rule.required).map(([field]) => field);
      const missing = required.filter((field) => !headers.includes(field));
      if (missing.length) throw new Error("Missing required CSV columns: " + missing.join(", "));
      if (rows.length > 1001) throw new Error("Import is limited to 1000 data rows at a time.");
      let imported = 0;
      const errors = [];
      for (let index = 1; index < rows.length; index++) {
        const cells = rows[index];
        const payload = {};
        Object.entries(cfg.insertFields || {}).forEach(([field, rule]) => {
          const column = headers.indexOf(field);
          if (column < 0 || cells[column] === "") return;
          const raw = cells[column];
          if (rule.type === "file" || rule.type === "image") throw new Error("CSV import does not upload file fields: " + field);
          if (rule.type === "bool") payload[field] = ["true", "1", "yes", "on"].includes(raw.toLowerCase());
          else if (rule.type === "int" || rule.type === "float") {
            const numeric = Number(raw);
            if (!Number.isFinite(numeric)) throw new Error("Invalid number in row " + (index + 1) + ", field " + field);
            payload[field] = numeric;
          }
          else payload[field] = raw;
        });
        try {
          await apiRequest(cfg.apiBase, { method: "POST", body: JSON.stringify(payload) });
          imported++;
        } catch (e) { errors.push("Row " + (index + 1) + ": " + e.message); }
      }
      showToast("Imported " + imported + " records" + (errors.length ? "; " + errors.length + " failed." : "."), errors.length ? "danger" : "success");
      if (errors.length) console.warn("CSV import errors", errors);
      fetchList();
    } catch (e) { showToast(e.message, "danger"); }
    finally { btnImportCsv.value = ""; }
  }

  function buildActionUrl(route, id) {
    // Remplace n'importe quel convertisseur Flask (<int:id>, <string:x>...)
    // par l'id de la ligne courante — les actions du dashboard agissent
    // toujours sur UN enregistrement (celui de la ligne cliquée).
    return route.replace(/<[^>]+>/g, id);
  }

  async function runCustomAction(id, action) {
    if (action.confirm) {
      const ok = await confirmAction(`Run “${action.label || action.name}” for this item?`);
      if (!ok) return;
    }

    const paramValues = {};
    for (const p of action.params || []) {
      const value = prompt(`Valeur pour "${p}" :`);
      if (value === null) return; // annulé par l'utilisateur
      paramValues[p] = value;
    }

    const url = buildActionUrl(action.route, id);
    const method = (action.method || "PATCH").toUpperCase();
    const isGetLike = method === "GET" || method === "DELETE";
    const finalUrl = isGetLike && Object.keys(paramValues).length
      ? url + "?" + new URLSearchParams(paramValues).toString()
      : url;

    try {
      await apiRequest(finalUrl, {
        method,
        ...(isGetLike ? {} : { body: JSON.stringify(paramValues) }),
      });
      showToast("Action completed.", "success");
      fetchList();
    } catch (e) {
      showToast(e.message, "danger");
    }
  }

  function toCsv(rows) {
    const headers = cfg.listFields;
    const escape = (v) => {
      let value = String(v != null ? v : "");
      // Prevent spreadsheet formula execution when an exported field is opened.
      if (/^[\s\u0000-\u001f]*[=+@-]/.test(value)) value = "'" + value;
      return `"${value.replace(/"/g, '""')}"`;
    };
    const displayHeaders = headers.map((field) => (cfg.listFieldLabels && cfg.listFieldLabels[field]) || field.replaceAll("_", " "));
    const lines = [displayHeaders.map(escape).join(",")];
    rows.forEach((row) => {
      lines.push(headers.map((f) => escape(formatCellValue(f, null, row[f]))).join(","));
    });
    return lines.join("\r\n");
  }

  async function exportCsv() {
    try {
      // Récupère tout (jusqu'à 10000 lignes) avec les filtres/tri courants,
      // pas seulement la page affichée.
      const hasSearch = Object.keys(state.searchParams).length > 0;
      const path = (hasSearch ? "/search" : "") + "?" + buildQuery({ page: 1, per_page: 10000 });
      const result = await apiRequest(apiUrl(path));
      const csv = toCsv(result.items || []);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (cfg.apiBase.split("/").pop() || "export") + ".csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      showToast(e.message, "danger");
    }
  }

  if (btnAdd) {
    if (cfg.entityLabel) btnAdd.innerHTML = `<i class="bi bi-plus-lg"></i> Add ${friendlyEntityName()}`;
    btnAdd.addEventListener("click", openCreateModal);
  }
  if (btnSave) btnSave.addEventListener("click", saveEntity);
  if (btnExportCsv) btnExportCsv.addEventListener("click", exportCsv);
  if (btnBulkDelete) btnBulkDelete.addEventListener("click", bulkDeleteSelected);
  if (btnBulkUpdate) btnBulkUpdate.addEventListener("click", bulkUpdateSelected);
  if (btnImportCsv) btnImportCsv.addEventListener("change", () => {
    if (btnImportCsv.files && btnImportCsv.files[0]) importCsvFile(btnImportCsv.files[0]);
  });
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", () => {
      selectedIds.clear();
      if (selectAllCheckbox.checked) lastItems.forEach((item) => selectedIds.add(item[cfg.pk]));
      renderList({ items: lastItems, total: lastItems.length, page: state.page, total_pages: 1 });
      updateBulkBar();
    });
  }
  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      runSearch(Object.fromEntries(new FormData(searchForm).entries()));
    });
    const initialParams = new URLSearchParams(window.location.search);
    let hasInitialFilters = false;
    initialParams.forEach((value, key) => {
      const input = searchForm.elements.namedItem(key);
      if (!input || !value) return;
      input.value = value;
      hasInitialFilters = true;
    });
    if (hasInitialFilters) state.searchParams = Object.fromEntries(new FormData(searchForm).entries());
  }
  if (btnResetSearch) {
    btnResetSearch.addEventListener("click", () => {
      searchForm.reset();
      state.searchParams = {};
      state.page = 1;
      fetchList();
    });
  }
  if (btnPrevPage) btnPrevPage.addEventListener("click", () => goToPage(state.page - 1));
  if (btnNextPage) btnNextPage.addEventListener("click", () => goToPage(state.page + 1));
  document.querySelectorAll(".sortable-th").forEach((th) => {
    th.addEventListener("click", () => applySort(th.dataset.field));
  });

  if (entityForm) {
    entityForm.addEventListener("input", () => { formDirty = true; });
    entityForm.addEventListener("change", () => { formDirty = true; });
  }
  if (modalEl) {
    modalEl.addEventListener("hide.bs.modal", (event) => {
      if (allowModalClose || !formDirty) { allowModalClose = false; return; }
      if (savingEntity) { event.preventDefault(); return; }
      event.preventDefault();
      confirmAction("You have unsaved changes. Discard them and close this form?").then((confirmed) => {
        if (confirmed) { formDirty = false; allowModalClose = true; bsModal.hide(); }
      });
    });
  }

  loadForeignKeyOptions().then(fetchList);
})();
