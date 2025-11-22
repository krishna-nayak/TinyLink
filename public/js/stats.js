(async () => {
  const code = window.TINYLINK_CODE;
  const loading = document.getElementById("stats-loading");
  const error = document.getElementById("stats-error");
  const container = document.getElementById("stats");
  const keyEl = document.getElementById("stat-key");
  const urlEl = document.getElementById("stat-url");
  const clicksEl = document.getElementById("stat-clicks");
  const lastEl = document.getElementById("stat-last");
  const openBtn = document.getElementById("open-short");

  function hide(el) {
    el.classList.add("hidden");
  }
  function show(el) {
    el.classList.remove("hidden");
  }

  try {
    const res = await fetch("/api/links");
    if (!res.ok) throw new Error("Failed");
    const list = await res.json();
    const link = list.find((l) => l.short_key === code);
    if (!link) {
      throw new Error("not found");
    }
    keyEl.textContent = link.short_key;
    urlEl.textContent = link.url;
    urlEl.href = link.url;
    clicksEl.textContent = link.stats || 0;
    lastEl.textContent = link.last_clicked_time
      ? new Date(link.last_clicked_time).toLocaleString()
      : "-";
    hide(loading);
    show(container);
    openBtn.addEventListener("click", () => window.open("/" + code, "_blank"));
  } catch (err) {
    hide(loading);
    error.textContent = err.message || "Failed to load";
    error.classList.remove("hidden");
  }
})();
