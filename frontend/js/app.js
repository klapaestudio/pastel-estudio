/* Pastel Studio — router, estado global y helpers */

const Pastel = (() => {
  const API = "/api";
  const state = {
    clients: [],
    section: "clientes",
  };
  const sectionLoaders = {};
  const sectionTitles = {
    clientes: "Clientes",
    presupuestos: "Presupuestos",
    objetos: "Objetos Pastel",
    stock: "Stock",
    finanzas: "Finanzas",
  };

  async function api(path, options = {}) {
    const res = await fetch(API + path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok && res.status >= 500) throw new Error("Error de servidor");
    return res.json();
  }

  function money(n) {
    const v = Number(n) || 0;
    return "$" + v.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function esc(s) {
    if (s === null || s === undefined) return "";
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function registerSection(name, loadFn) {
    sectionLoaders[name] = loadFn;
  }

  function showSection(name) {
    state.section = name;
    document.querySelectorAll(".nav-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.section === name);
    });
    document.querySelectorAll(".section").forEach((el) => {
      el.classList.toggle("active", el.id === "section-" + name);
    });
    document.getElementById("section-title").textContent = sectionTitles[name] || "";
    document.getElementById("topbar-actions").innerHTML = "";
    if (sectionLoaders[name]) sectionLoaders[name]();
  }

  async function loadClients() {
    state.clients = await api("/clients");
    return state.clients;
  }

  function clientOptionsHTML(selectedId, includeAll) {
    let html = "";
    if (includeAll) html += `<option value="">Todos los clientes</option>`;
    for (const c of state.clients) {
      html += `<option value="${c.id}" ${String(c.id) === String(selectedId) ? "selected" : ""}>${esc(c.nombre)}</option>`;
    }
    return html;
  }

  function clientName(id) {
    const c = state.clients.find((c) => String(c.id) === String(id));
    return c ? c.nombre : "—";
  }

  // ── Modal genérico ───────────────────────────────────────────────────
  function openModal(title, bodyHTML, { wide = false, onMount } = {}) {
    const root = document.getElementById("modal-root");
    root.innerHTML = `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal ${wide ? "modal-wide" : ""}">
          <div class="modal-header">
            <h2>${esc(title)}</h2>
            <button class="btn-ghost btn" id="modal-close">✕</button>
          </div>
          <div id="modal-body">${bodyHTML}</div>
        </div>
      </div>`;
    document.getElementById("modal-close").onclick = closeModal;
    document.getElementById("modal-overlay").addEventListener("click", (e) => {
      if (e.target.id === "modal-overlay") closeModal();
    });
    if (onMount) onMount(document.getElementById("modal-body"));
  }

  function closeModal() {
    document.getElementById("modal-root").innerHTML = "";
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function init() {
    document.getElementById("year").textContent = new Date().getFullYear();
    document.querySelectorAll(".nav-item").forEach((el) => {
      el.addEventListener("click", () => showSection(el.dataset.section));
    });
    loadClients().then(() => showSection("clientes"));
  }

  document.addEventListener("DOMContentLoaded", init);

  return { api, money, esc, registerSection, showSection, state, loadClients, clientOptionsHTML, clientName, openModal, closeModal, todayISO };
})();
