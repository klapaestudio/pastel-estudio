/* Sección Stock */

(() => {
  const ESTADO_BADGE = { "Disponible": "sage", "Reservado": "gold", "En producción": "lavender", "Agotado": "red" };

  async function load() {
    document.getElementById("btn-new-stock").onclick = () => openForm();
    document.getElementById("filter-estado-stock").onchange = render;
    await render();
  }

  async function render() {
    const all = await Pastel.api("/stock");
    const estadoFilter = document.getElementById("filter-estado-stock").value;
    const items = estadoFilter ? all.filter((s) => s.estado === estadoFilter) : all;
    const wrap = document.getElementById("stock-table-wrap");
    if (!items.length) {
      wrap.innerHTML = `<div class="empty"><div class="icon">▢</div>No hay stock cargado.</div>`;
      return;
    }
    wrap.innerHTML = `
      <table>
        <thead><tr><th>Producto</th><th>Tela</th><th class="text-right">Cantidad</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          ${items.map((s) => `
            <tr>
              <td><strong>${Pastel.esc(s.producto)}</strong></td>
              <td class="text-secondary">${Pastel.esc(s.tela || "—")}</td>
              <td class="text-right mono">${s.cantidad}</td>
              <td><span class="badge badge-${ESTADO_BADGE[s.estado] || "gray"}">${Pastel.esc(s.estado)}</span></td>
              <td class="text-right">
                <button class="btn btn-ghost btn-sm" data-edit="${s.id}">Editar</button>
                <button class="btn btn-ghost btn-sm" data-del="${s.id}">Eliminar</button>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>`;
    wrap.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.onclick = () => openForm(items.find((s) => String(s.id) === btn.dataset.edit));
    });
    wrap.querySelectorAll("[data-del]").forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm("¿Eliminar este registro de stock?")) return;
        await Pastel.api(`/stock/${btn.dataset.del}`, { method: "DELETE" });
        render();
      };
    });
  }

  function openForm(item) {
    const isEdit = !!item;
    Pastel.openModal(isEdit ? "Editar stock" : "Agregar stock", `
      <div class="field"><label>Producto</label><input id="f-producto" value="${Pastel.esc(item?.producto)}"></div>
      <div class="field-row">
        <div class="field"><label>Tela</label><input id="f-tela" value="${Pastel.esc(item?.tela)}"></div>
        <div class="field"><label>Cantidad</label><input id="f-cantidad" type="number" step="1" value="${item?.cantidad ?? 0}"></div>
      </div>
      <div class="field"><label>Estado</label>
        <select id="f-estado">
          ${["Disponible", "Reservado", "En producción", "Agotado"].map((e) => `<option ${e === item?.estado ? "selected" : ""}>${e}</option>`).join("")}
        </select>
      </div>
      <div class="flex" style="justify-content:flex-end;gap:8px;margin-top:8px;">
        <button class="btn btn-secondary" id="f-cancel">Cancelar</button>
        <button class="btn btn-primary" id="f-save">Guardar</button>
      </div>
    `);
    document.getElementById("f-cancel").onclick = Pastel.closeModal;
    document.getElementById("f-save").onclick = async () => {
      const data = {
        producto: document.getElementById("f-producto").value.trim(),
        tela: document.getElementById("f-tela").value.trim(),
        cantidad: parseFloat(document.getElementById("f-cantidad").value) || 0,
        estado: document.getElementById("f-estado").value,
      };
      if (!data.producto) { alert("El producto es obligatorio"); return; }
      if (isEdit) await Pastel.api(`/stock/${item.id}`, { method: "PUT", body: JSON.stringify(data) });
      else await Pastel.api("/stock", { method: "POST", body: JSON.stringify(data) });
      Pastel.closeModal();
      render();
    };
  }

  Pastel.registerSection("stock", load);
})();
