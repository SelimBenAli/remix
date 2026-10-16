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
    entityForm.innerHTML = "";
    let fieldTarget = entityForm;
    if (cfg.baseEditor) {
      const nav = document.createElement("div");
      nav.className = "base-editor-tabs";
      nav.setAttribute("role", "tablist");
      const sections = {};
      [["details", "Details"], ["sizes", "Sizes"], ["images", "Images"]].forEach(([key, title], index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "base-editor-tab" + (index === 0 ? " active" : "");
        button.textContent = title;
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
      const sectionKey = cfg.baseEditor && (field === "images" || field === "image_url" ? "images" :
        ["sizes", "size_stock", "size_guide"].includes(field) ? "sizes" : "details");
      const target = sectionKey ? entityForm._baseSections[sectionKey] : (fieldTarget || entityForm);

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
        label.textContent = (rule.label || field) + (rule.required ? " *" : "");
        wrapper.appendChild(input);
        wrapper.appendChild(label);
        target.appendChild(wrapper);
        return;
      }

      const label = document.createElement("label");
      label.className = "form-label";
      label.textContent = (rule.label || field) + (rule.required ? " *" : "");
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
        emptyOpt.textContent = "— Sélectionner —";
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
          emptyOpt.textContent = "— Sélectionner —";
          select.appendChild(emptyOpt);
        }
        rule.choices.forEach((choice) => {
          const opt = document.createElement("option");
          opt.value = choice;
          opt.textContent = choice;
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
          hint.textContent = "You can select multiple images. JPEG, PNG, GIF, WebP or AVIF; up to 10 MB each.";
          wrapper.appendChild(hint);
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

      target.appendChild(wrapper);
    });
    if (cfg.baseEditor) {
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
    }
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
    if (rule && rule.type === "bool") return rawValue ? "Oui" : "Non";
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
      orderItemsSummary.textContent = `${result.fullName || "Customer"} · ${result.status || ""} · Order total ${orderMoney(result.total)}`;
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

      if (rule && rule.type === "images" && Array.isArray(rawValue)) {
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
        link.textContent = "voir le fichier";
        td.appendChild(link);
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

    if (cfg.actions.includes("update")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-sm btn-outline-primary btn-icon me-1";
      btn.innerHTML = '<i class="bi bi-pencil"></i>';
      btn.title = "Modifier";
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

    if (cfg.actions.includes("delete") || cfg.actions.includes("update")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-sm btn-outline-danger btn-icon";
      btn.innerHTML = '<i class="bi bi-trash3"></i>';
      btn.title = "Supprimer";
      btn.addEventListener("click", () => deleteItem(item[cfg.pk]));
      actionsTd.appendChild(btn);
    }

    tr.appendChild(actionsTd);
    tableBody.appendChild(tr);
  }

  function renderLoading() {
    const colspan = cfg.listFields.length + 2;
    tableBody.innerHTML = `<tr class="table-loading-row"><td colspan="${colspan}">
      <div class="spinner-border spinner-border-sm text-secondary me-2" role="status"></div>Chargement...
    </td></tr>`;
  }

  function renderEmpty() {
    const colspan = cfg.listFields.length + 2;
    tableBody.innerHTML = `<tr class="table-empty-row"><td colspan="${colspan}">
      <i class="bi bi-inbox fs-3 d-block mb-2"></i>Aucun résultat
    </td></tr>`;
  }

  function updateResultCount(total) {
    const el = document.getElementById("result-count");
    if (el) el.textContent = total + (total > 1 ? " résultats" : " résultat");
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
    modalTitle.textContent = "Ajouter";
    buildFormFields(cfg.insertFields);
    bsModal.show();
  }

  function openEditModal(item) {
    mode = "edit";
    modalTitle.textContent = "Modifier";
    buildFormFields(cfg.updateFields);
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
          images.forEach((image) => {
            const card = document.createElement("div");
            card.className = "admin-image-item";
            const img = document.createElement("img");
            img.src = image.url;
            img.alt = "Uploaded product image";
            const meta = document.createElement("div");
            meta.className = "admin-image-meta";
            const showroomLabel = document.createElement("label");
            const showroom = document.createElement("input");
            showroom.type = "radio";
            showroom.name = "showroom_image_id";
            showroom.value = image.id;
            showroom.checked = !!image.useInShowroom;
            showroom.title = "Use this image in the showroom preview";
            showroomLabel.append(showroom, document.createTextNode(" Showroom"));
            const remove = document.createElement("input");
            remove.type = "checkbox";
            remove.name = "remove_image_ids";
            remove.value = image.id;
            remove.title = "Remove this image";
            remove.addEventListener("change", () => {
              if (remove.checked && showroom.checked) {
                remove.checked = false;
                showToast("Choose a different showroom image before removing this one.", "warning");
              }
            });
            const removeLabel = document.createElement("label");
            removeLabel.append(remove, document.createTextNode(" Remove"));
            meta.append(showroomLabel, removeLabel);
            card.append(img, meta);
            gallery.appendChild(card);
          });
          const hint = document.createElement("div");
          hint.className = "form-text";
          hint.textContent = "Choose the showroom preview image. Select images to remove; new uploads are added to this gallery.";
          input.insertAdjacentElement("afterend", gallery);
          gallery.insertAdjacentElement("afterend", hint);
        }
      } else if (rule.type === "file" || rule.type === "image") {
        // Impossible de préremplir un <input type="file"> (restriction
        // navigateur) — on affiche juste un lien vers le fichier actuel.
        if (item[field]) {
          const hint = document.createElement("div");
          hint.className = "form-text";
          hint.innerHTML = `Fichier actuel : <a href="/uploads/${item[field]}" target="_blank">voir</a> (laisser vide pour ne pas changer)`;
          input.insertAdjacentElement("afterend", hint);
        }
      } else {
        const fkRule = cfg.foreignKeys && cfg.foreignKeys[field];
        const value = fkRule && fkRule.sourceField ? item[fkRule.sourceField] : item[field];
        input.value = value != null ? value : "";
      }
    });
    entityForm.querySelector(`[name="${cfg.pk}"]`).value = item[cfg.pk];
    bsModal.show();
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
      const payload = collectPayload(fieldsConfig);
      const body = hasFileField(fieldsConfig) ? toFormData(payload) : JSON.stringify(payload);
      if (isCreate) {
        await apiRequest(apiUrl(), { method: "POST", body });
        showToast("Créé avec succès.", "success");
      } else {
        const id = entityForm.querySelector(`[name="${cfg.pk}"]`).value;
        await apiRequest(apiUrl("/" + id), { method: "PUT", body });
        showToast("Modifié avec succès.", "success");
      }
      bsModal.hide();
      fetchList();
    } catch (e) {
      showToast(e.message, "danger");
    }
  }

  async function deleteItem(id) {
    const ok = await confirmAction("Confirmer la suppression ?");
    if (!ok) return;
    try {
      await apiRequest(apiUrl("/" + id), { method: "DELETE" });
      showToast("Supprimé.", "success");
      fetchList();
    } catch (e) {
      showToast(e.message, "danger");
    }
  }

  async function bulkDeleteSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const ok = await confirmAction(`Supprimer les ${ids.length} élément(s) sélectionné(s) ?`);
    if (!ok) return;
    try {
      await Promise.all(ids.map((id) => apiRequest(apiUrl("/" + id), { method: "DELETE" })));
      showToast(`${ids.length} élément(s) supprimé(s).`, "success");
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
      const ok = await confirmAction(`Confirmer l'action "${action.label || action.name}" ?`);
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
      showToast("Action effectuée.", "success");
      fetchList();
    } catch (e) {
      showToast(e.message, "danger");
    }
  }

  function toCsv(rows) {
    const headers = cfg.listFields;
    const escape = (v) => `"${String(v != null ? v : "").replace(/"/g, '""')}"`;
    const lines = [headers.map(escape).join(",")];
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

  if (btnAdd) btnAdd.addEventListener("click", openCreateModal);
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

  loadForeignKeyOptions().then(fetchList);
})();
