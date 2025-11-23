// Minimal client script: copy-to-clipboard helper and attachment
function attachCopyHandler(btn) {
  btn.addEventListener("click", async () => {
    const key = btn.dataset.key;
    const prev = btn.innerHTML;
    try {
      await navigator.clipboard.writeText(window.location.origin + "/" + key);
      btn.innerHTML = `<i class="fa-solid fa-copy"></i>`;
      setTimeout(() => (btn.innerHTML = prev), 1200);
    } catch (err) {
      alert("Copy failed: " + (err && err.message ? err.message : ""));
      btn.innerHTML = prev;
    }
  });
}

document.querySelectorAll(".copy-btn").forEach(attachCopyHandler);

// Client-side filter and sort
const filterInput = document.getElementById("filter");
const sortSelect = document.getElementById("sort");
const tableBody = document.querySelector("#links-table tbody");
if (filterInput && sortSelect && tableBody) {
  function getRows() {
    return Array.from(tableBody.querySelectorAll("tr"));
  }

  function applyFilterAndSort() {
    const q = (filterInput.value || "").toLowerCase().trim();
    const sort = sortSelect.value;
    let rows = getRows();

    // filter
    if (q) {
      rows.forEach((r) => {
        const key = (r.dataset.key || "").toLowerCase();
        const url = (r.dataset.url || "").toLowerCase();
        if (key.includes(q) || url.includes(q)) r.style.display = "";
        else r.style.display = "none";
      });
    } else {
      rows.forEach((r) => (r.style.display = ""));
    }

    // sort (only reorder visible rows)
    const visible = rows.filter((r) => r.style.display !== "none");
    if (sort === "most") {
      visible.sort((a, b) => Number(b.dataset.stats || 0) - Number(a.dataset.stats || 0));
    } else if (sort === "old") {
      visible.reverse();
    }

    // re-append visible rows in order
    visible.forEach((r) => tableBody.appendChild(r));
  }

  filterInput.addEventListener("input", applyFilterAndSort);
  sortSelect.addEventListener("change", applyFilterAndSort);
}

// Minimal fetch helpers used directly in handlers (keeps code simple)
async function postJson(url, data) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, statusText: res.statusText, body };
}

// Add a row to the table for a created link (keeps same structure as server-rendered rows)
function addRowToTable(data) {
  if (!tableBody) return;
  const tr = document.createElement("tr");
  tr.dataset.key = data.short_key;
  tr.dataset.url = data.url;
  tr.dataset.stats = data.stats || 0;

  // Key cell
  const tdKey = document.createElement("td");
  const aKey = document.createElement("a");
  aKey.href = `/code/${data.short_key}`;
  aKey.textContent = data.short_key;
  tdKey.appendChild(aKey);

  // URL cell
  const tdUrl = document.createElement("td");
  tdUrl.className = "url";
  const aUrl = document.createElement("a");
  aUrl.href = data.url;
  aUrl.target = "_blank";
  aUrl.rel = "noopener";
  const disp = data.url.length > 80 ? data.url.substring(0, 77) + "..." : data.url;
  aUrl.textContent = disp;
  tdUrl.appendChild(aUrl);

  // clicks
  const tdClicks = document.createElement("td");
  tdClicks.className = "small";
  tdClicks.textContent = data.stats || 0;

  // last click
  const tdLast = document.createElement("td");
  tdLast.className = "small";
  tdLast.textContent = "-";

  // actions
  const tdActions = document.createElement("td");
  tdActions.className = "actions";

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "delete-btn";
  delBtn.dataset.key = data.short_key;
  delBtn.title = "Delete";
  delBtn.setAttribute("aria-label", `Delete ${data.short_key}`);
  delBtn.textContent = "Delete";

  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-btn";
  copyBtn.dataset.key = data.short_key;
  copyBtn.setAttribute("aria-label", "Copy short link");
  copyBtn.title = "Copy";
  copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i>`;

  tdActions.appendChild(delBtn);
  tdActions.appendChild(copyBtn);

  tr.appendChild(tdKey);
  tr.appendChild(tdUrl);
  tr.appendChild(tdClicks);
  tr.appendChild(tdLast);
  tr.appendChild(tdActions);

  tableBody.insertBefore(tr, tableBody.firstChild);

  // Attach handlers
  attachCopyHandler(copyBtn);
  attachDeleteHandler(delBtn);
}

// Delete handler: calls DELETE /api/links/:code and removes row
function attachDeleteHandler(btn) {
  btn.addEventListener("click", async () => {
    const key = btn.dataset.key;
    if (!key) return;
    if (!confirm(`Delete ${key}?`)) return;
    try {
      const res = await fetch(`/api/links/${encodeURIComponent(key)}`, { method: "DELETE" });
      if (!res.ok) {
        let body = null;
        try {
          body = await res.json();
        } catch (e) {}
        alert(body && body.error ? body.error : `Delete failed: ${res.statusText}`);
        return;
      }
      const row = tableBody.querySelector(`tr[data-key="${CSS.escape(key)}"]`);
      if (row) row.remove();
    } catch (err) {
      alert("Network error while deleting");
    }
  });
}

// Attach delete handlers for existing rows
document.querySelectorAll(".delete-btn").forEach((b) => attachDeleteHandler(b));

// Simplified create form handler using requestJSON and DOM insertion
const createForm = document.getElementById("create-form");
if (createForm) {
  createForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const urlInput = document.getElementById("url-input");
    const keyInput = document.getElementById("custom-key");
    const msgEl = document.getElementById("form-message");
    const url = ((urlInput && urlInput.value) || "").trim();
    if (!url) {
      if (msgEl) msgEl.textContent = "Please enter a URL.";
      return;
    }
    if (msgEl) msgEl.textContent = "Creating...";
    const payload = { url };
    if (keyInput && keyInput.value.trim()) payload.short_key = keyInput.value.trim();
    try {
      const res = await postJson("/api/links", payload);
      if (!res.ok) {
        if (msgEl)
          msgEl.textContent =
            res.body && res.body.error ? `Error: ${res.body.error}` : `Error: ${res.statusText}`;
        return;
      }
      if (res.body) addRowToTable(res.body);
      createForm.reset();
      if (msgEl) msgEl.textContent = "Created.";
    } catch (err) {
      if (msgEl) msgEl.textContent = "Network error while creating link.";
    }
  });
}
