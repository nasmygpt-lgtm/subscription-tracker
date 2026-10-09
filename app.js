// Subscription Tracker — vanilla JS, data stored in localStorage only.
(function () {
  "use strict";

  const STORAGE_KEY = "subscription-tracker.v1";

  // Emoji badges for known services (fallback uses first letter).
  const ICONS = {
    "Netflix": "🎬", "Amazon Prime Video": "📺", "Disney+": "🏰", "Hulu": "📺",
    "HBO Max": "🎞️", "Apple TV+": "🍿", "YouTube Premium": "▶️", "Paramount+": "⛰️",
    "Peacock": "🦚", "Spotify": "🎵", "Apple Music": "🎶", "YouTube Music": "🎧",
    "Amazon Music": "🎼", "Tidal": "🌊", "Amazon Prime": "📦", "Costco": "🛒",
    "Walmart+": "🛍️", "GitHub": "🐙", "GitLab": "🦊", "Google One": "☁️",
    "Google Workspace": "📧", "Gmail": "✉️", "YouTube TV": "📺",
    "Google Play Pass": "🎮", "Google Fi": "📱",
    "Microsoft 365": "🪟", "iCloud+": "☁️", "Dropbox": "📂", "Notion": "📝",
    "Adobe Creative Cloud": "🎨", "ChatGPT Plus": "🤖", "Xbox Game Pass": "🎮",
    "PlayStation Plus": "🎮", "Nintendo Switch Online": "🎮"
  };

  // --- DOM refs ---
  const form = document.getElementById("sub-form");
  const serviceSel = document.getElementById("service");
  const otherField = document.getElementById("other-field");
  const otherInput = document.getElementById("service-other");
  const emailInput = document.getElementById("email");
  const hintInput = document.getElementById("hint");
  const costInput = document.getElementById("cost");
  const renewalInput = document.getElementById("renewal");
  const editIdInput = document.getElementById("edit-id");
  const submitBtn = document.getElementById("submit-btn");
  const cancelBtn = document.getElementById("cancel-btn");
  const formTitle = document.getElementById("form-title");
  const listEl = document.getElementById("list");
  const summaryEl = document.getElementById("summary");
  const searchInput = document.getElementById("search");
  const clearBtn = document.getElementById("clear-btn");
  const exportBtn = document.getElementById("export-btn");
  const importBtn = document.getElementById("import-btn");
  const importFile = document.getElementById("import-file");

  let subscriptions = load();
  let searchTerm = "";

  // --- Storage helpers ---
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Failed to load subscriptions:", e);
      return [];
    }
  }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
    } catch (e) {
      alert("Could not save data to this browser. Storage may be full or disabled.");
    }
  }

  // --- Helpers ---
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
  function iconFor(service) {
    return ICONS[service] || service.charAt(0).toUpperCase();
  }
  function fmtMoney(n) {
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // --- Dropdown "Other" toggle ---
  serviceSel.addEventListener("change", () => {
    const isOther = serviceSel.value === "__other__";
    otherField.hidden = !isOther;
    otherInput.required = isOther;
    if (isOther) otherInput.focus();
  });

  // --- Form submit (add or edit) ---
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    let service = serviceSel.value;
    if (service === "__other__") {
      service = otherInput.value.trim();
      if (!service) { otherInput.focus(); return; }
    }

    const record = {
      id: editIdInput.value || uid(),
      service: service,
      email: emailInput.value.trim(),
      hint: hintInput.value.trim(),
      cost: costInput.value ? parseFloat(costInput.value) : null,
      renewal: renewalInput.value || null
    };

    if (editIdInput.value) {
      const idx = subscriptions.findIndex((s) => s.id === editIdInput.value);
      if (idx !== -1) subscriptions[idx] = record;
    } else {
      subscriptions.push(record);
    }

    save();
    resetForm();
    render();
  });

  cancelBtn.addEventListener("click", resetForm);

  function resetForm() {
    form.reset();
    editIdInput.value = "";
    otherField.hidden = true;
    otherInput.required = false;
    formTitle.textContent = "Add a subscription";
    submitBtn.textContent = "Add subscription";
    cancelBtn.hidden = true;
  }

  function startEdit(id) {
    const s = subscriptions.find((x) => x.id === id);
    if (!s) return;

    const known = Array.from(serviceSel.options).some((o) => o.value === s.service);
    if (known) {
      serviceSel.value = s.service;
      otherField.hidden = true;
      otherInput.required = false;
    } else {
      serviceSel.value = "__other__";
      otherField.hidden = false;
      otherInput.required = true;
      otherInput.value = s.service;
    }
    emailInput.value = s.email || "";
    hintInput.value = s.hint || "";
    costInput.value = s.cost != null ? s.cost : "";
    renewalInput.value = s.renewal || "";
    editIdInput.value = s.id;

    formTitle.textContent = "Edit subscription";
    submitBtn.textContent = "Save changes";
    cancelBtn.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteSub(id) {
    const s = subscriptions.find((x) => x.id === id);
    if (!s) return;
    if (!confirm(`Delete "${s.service}"?`)) return;
    subscriptions = subscriptions.filter((x) => x.id !== id);
    save();
    render();
  }

  // --- Search ---
  searchInput.addEventListener("input", () => {
    searchTerm = searchInput.value.trim().toLowerCase();
    render();
  });

  // --- Danger zone ---
  clearBtn.addEventListener("click", () => {
    if (!confirm("Delete ALL subscriptions? This cannot be undone.")) return;
    subscriptions = [];
    save();
    render();
  });

  exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(subscriptions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subscriptions.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import a previously exported backup file (works even on a fresh device).
  importBtn.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", () => {
    const file = importFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(reader.result);
      } catch (e) {
        alert("That file isn't valid backup JSON.");
        importFile.value = "";
        return;
      }
      if (!Array.isArray(data)) {
        alert("That doesn't look like a subscriptions backup file.");
        importFile.value = "";
        return;
      }
      // Keep only valid-looking records and give them fresh ids to avoid clashes.
      const incoming = data
        .filter((d) => d && typeof d.service === "string")
        .map((d) => ({
          id: uid(),
          service: d.service,
          email: typeof d.email === "string" ? d.email : "",
          hint: typeof d.hint === "string" ? d.hint : "",
          cost: d.cost != null && !isNaN(d.cost) ? Number(d.cost) : null,
          renewal: typeof d.renewal === "string" ? d.renewal : null
        }));

      if (incoming.length === 0) {
        alert("No subscriptions found in that file.");
        importFile.value = "";
        return;
      }

      let mode = "merge";
      if (subscriptions.length > 0) {
        mode = confirm(
          `Import ${incoming.length} subscription(s).\n\n` +
          "OK = ADD them to your current list.\n" +
          "Cancel = REPLACE your current list with the file."
        ) ? "merge" : "replace";
      }
      subscriptions = mode === "merge" ? subscriptions.concat(incoming) : incoming;
      save();
      render();
      importFile.value = "";
      alert(`Imported ${incoming.length} subscription(s).`);
    };
    reader.readAsText(file);
  });

  // --- Render ---
  function render() {
    const visible = subscriptions.filter((s) => {
      if (!searchTerm) return true;
      return (
        s.service.toLowerCase().includes(searchTerm) ||
        (s.email || "").toLowerCase().includes(searchTerm)
      );
    });

    // Summary
    const total = subscriptions.length;
    const monthly = subscriptions.reduce((sum, s) => sum + (s.cost || 0), 0);
    if (total === 0) {
      summaryEl.textContent = "No subscriptions yet.";
      clearBtn.hidden = true;
    } else {
      summaryEl.innerHTML =
        `<strong>${total}</strong> subscription${total === 1 ? "" : "s"}` +
        (monthly > 0 ? ` · ~<strong>$${fmtMoney(monthly)}</strong>/mo` : "");
      clearBtn.hidden = false;
    }

    // List
    listEl.innerHTML = "";
    if (visible.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = total === 0
        ? "Add your first subscription using the form above ☝️"
        : "No matches for your search.";
      listEl.appendChild(empty);
      return;
    }

    const sorted = [...visible].sort((a, b) => a.service.localeCompare(b.service));
    for (const s of sorted) {
      const item = document.createElement("div");
      item.className = "sub-item";

      const costPill = s.cost != null
        ? `<span class="pill">$${fmtMoney(s.cost)}/mo</span>` : "";
      const renewalRow = s.renewal
        ? `<div class="row"><span class="label">Renews</span><span>${escapeHtml(s.renewal)}</span></div>` : "";
      const hintRow = s.hint
        ? `<div class="row"><span class="label">Hint</span><span>${escapeHtml(s.hint)}</span></div>` : "";

      item.innerHTML = `
        <div class="sub-main">
          <div class="sub-service">
            <span class="badge">${escapeHtml(iconFor(s.service))}</span>
            ${escapeHtml(s.service)}
          </div>
          <div class="sub-meta">
            <div class="row"><span class="label">Email</span><code>${escapeHtml(s.email || "—")}</code></div>
            ${hintRow}
            ${renewalRow}
          </div>
          ${costPill}
        </div>
        <div class="sub-actions">
          <button class="icon-btn" data-edit="${s.id}">✏️ Edit</button>
          <button class="icon-btn delete" data-del="${s.id}">🗑️ Delete</button>
        </div>
      `;
      listEl.appendChild(item);
    }

    listEl.querySelectorAll("[data-edit]").forEach((b) =>
      b.addEventListener("click", () => startEdit(b.getAttribute("data-edit"))));
    listEl.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", () => deleteSub(b.getAttribute("data-del"))));
  }

  render();
})();
