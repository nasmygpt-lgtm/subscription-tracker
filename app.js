// Subscription Tracker — vanilla JS, data stored in localStorage only.
(function () {
  "use strict";

  const STORAGE_KEY = "subscription-tracker.v1";
  const THEME_KEY = "subscription-tracker.theme";

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

  // Pleasant gradient palette for badges (picked by service name).
  const PALETTE = [
    "linear-gradient(135deg,#ff6b6b,#ee5253)",
    "linear-gradient(135deg,#5f27cd,#8854d0)",
    "linear-gradient(135deg,#00b894,#55efc4)",
    "linear-gradient(135deg,#0984e3,#74b9ff)",
    "linear-gradient(135deg,#fdcb6e,#e17055)",
    "linear-gradient(135deg,#e84393,#fd79a8)",
    "linear-gradient(135deg,#00cec9,#81ecec)",
    "linear-gradient(135deg,#6c5ce7,#a29bfe)"
  ];
  function badgeColor(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }

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
  const formSub = document.getElementById("form-sub");
  const listEl = document.getElementById("list");
  const summaryEl = document.getElementById("summary");
  const searchInput = document.getElementById("search");
  const clearBtn = document.getElementById("clear-btn");
  const exportBtn = document.getElementById("export-btn");
  const importBtn = document.getElementById("import-btn");
  const importFile = document.getElementById("import-file");
  const themeToggle = document.getElementById("theme-toggle");
  const statsEl = document.getElementById("stats");
  const statCount = document.getElementById("stat-count");
  const statMonthly = document.getElementById("stat-monthly");
  const statYearly = document.getElementById("stat-yearly");
  const toastEl = document.getElementById("toast");

  let subscriptions = load();
  let searchTerm = "";

  // --- Theme ---
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  }
  (function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    if (!saved) {
      saved = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    applyTheme(saved);
  })();
  themeToggle.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  });

  // --- Toast ---
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
  }

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
      toast("⚠️ Couldn't save — storage may be full or disabled.");
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
  function fmtDate(iso) {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
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

    const isEdit = !!editIdInput.value;
    const record = {
      id: editIdInput.value || uid(),
      service: service,
      email: emailInput.value.trim(),
      hint: hintInput.value.trim(),
      cost: costInput.value ? parseFloat(costInput.value) : null,
      renewal: renewalInput.value || null
    };

    if (isEdit) {
      const idx = subscriptions.findIndex((s) => s.id === editIdInput.value);
      if (idx !== -1) subscriptions[idx] = record;
    } else {
      subscriptions.push(record);
    }

    save();
    resetForm();
    render();
    toast(isEdit ? "✅ Saved your changes" : `🎉 Added ${service}`);
  });

  cancelBtn.addEventListener("click", resetForm);

  function resetForm() {
    form.reset();
    editIdInput.value = "";
    otherField.hidden = true;
    otherInput.required = false;
    formTitle.innerHTML = '<span class="emoji">➕</span> Add a subscription';
    formSub.textContent = "Fill in the details below and it saves automatically.";
    submitBtn.textContent = "➕ Add subscription";
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

    formTitle.innerHTML = '<span class="emoji">✏️</span> Edit subscription';
    formSub.textContent = "Update the details and save your changes.";
    submitBtn.textContent = "💾 Save changes";
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
    toast(`🗑️ Removed ${s.service}`);
  }

  // --- Search ---
  searchInput.addEventListener("input", () => {
    searchTerm = searchInput.value.trim().toLowerCase();
    render();
  });

  // --- Backup zone ---
  clearBtn.addEventListener("click", () => {
    if (!confirm("Delete ALL subscriptions? This cannot be undone.")) return;
    subscriptions = [];
    save();
    render();
    toast("🧹 Cleared everything");
  });

  exportBtn.addEventListener("click", () => {
    if (subscriptions.length === 0) { toast("Nothing to export yet."); return; }
    const blob = new Blob([JSON.stringify(subscriptions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subscriptions.json";
    a.click();
    URL.revokeObjectURL(url);
    toast("⬇️ Backup downloaded");
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
        toast("⚠️ That file isn't valid backup JSON.");
        importFile.value = "";
        return;
      }
      if (!Array.isArray(data)) {
        toast("⚠️ That doesn't look like a backup file.");
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
        toast("No subscriptions found in that file.");
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
      toast(`⬆️ Imported ${incoming.length} subscription(s)`);
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

    // Summary + stats
    const total = subscriptions.length;
    const monthly = subscriptions.reduce((sum, s) => sum + (s.cost || 0), 0);
    if (total === 0) {
      summaryEl.textContent = "No subscriptions yet.";
      clearBtn.hidden = true;
      statsEl.hidden = true;
    } else {
      summaryEl.innerHTML =
        `You're tracking <strong>${total}</strong> subscription${total === 1 ? "" : "s"}`;
      clearBtn.hidden = false;
      statsEl.hidden = false;
      statCount.textContent = total;
      statMonthly.textContent = "$" + fmtMoney(monthly);
      statYearly.textContent = "$" + fmtMoney(monthly * 12);
    }

    // List
    listEl.innerHTML = "";
    if (visible.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.innerHTML = total === 0
        ? '<span class="big">👋</span>No subscriptions yet — add your first one using the form above!'
        : '<span class="big">🔍</span>No matches for your search.';
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
        ? `<div class="row"><span class="label">Renews</span><span>${escapeHtml(fmtDate(s.renewal))}</span></div>` : "";
      const hintRow = s.hint
        ? `<div class="row"><span class="label">Hint</span><span>${escapeHtml(s.hint)}</span></div>` : "";

      item.innerHTML = `
        <div class="sub-main">
          <div class="sub-service">
            <span class="badge" style="background:${badgeColor(s.service)}">${escapeHtml(iconFor(s.service))}</span>
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
