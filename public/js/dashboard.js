// Minimal client script: handle copy-to-clipboard for server-rendered table
const copyButtons = document.querySelectorAll(".copy-btn");
copyButtons.forEach((btn) => {
  btn.addEventListener("click", async (e) => {
    const key = btn.dataset.key;
    try {
      await navigator.clipboard.writeText(window.location.origin + "/" + key);
      const prev = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(() => (btn.textContent = prev), 1200);
    } catch (err) {
      alert("Copy failed");
    }
  });
});

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
      visible.reverse(); // server already rendered newest-first, so reverse for old
    } // 'new' is server order

    // re-append visible rows in order
    visible.forEach((r) => tableBody.appendChild(r));
  }

  filterInput.addEventListener("input", applyFilterAndSort);
  sortSelect.addEventListener("change", applyFilterAndSort);
}
