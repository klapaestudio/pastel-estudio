/* Sección Presupuestos */

(() => {
  let currentId = null;

  const ESTADOS = ["Borrador", "Enviado", "Aprobado", "Rechazado"];
  const ESTADO_BADGE = { Borrador: "gray", Enviado: "lavender", Aprobado: "sage", Rechazado: "red" };

  async function load() {
    const filterSelect = document.getElementById("filter-client-presupuestos");
    filterSelect.innerHTML = Pastel.clientOptionsHTML("", true);
    filterSelect.onchange = renderList;
    document.getElementById("btn-new-presupuesto").onclick = () => openPresupuestoForm();
    currentId = null;
    await renderList();
  }

  async function renderList() {
    currentId = null;
    const clientId = document.getElementById("filter-client-presupuestos").value;
    const list = await Pastel.api("/presupuestos" + (clientId ? `?client_id=${clientId}` : ""));
    const wrap = document.getElementById("presupuestos-list");
    if (!list.length) {
      wrap.innerHTML = `<div class="empty"><div class="icon">▤</div>Todavía no hay presupuestos.</div>`;
      return;
    }
    wrap.innerHTML = `
      <table>
        <thead><tr><th>Título</th><th>Cliente</th><th>Fecha</th><th>Estado</th><th class="text-right">Total</th><th></th></tr></thead>
        <tbody>
          ${list.map((p) => `
            <tr>
              <td><strong>${Pastel.esc(p.titulo)}</strong></td>
              <td class="text-secondary">${Pastel.esc(p.client_nombre)}</td>
              <td class="text-secondary">${Pastel.esc(p.fecha)}</td>
              <td><span class="badge badge-${ESTADO_BADGE[p.estado] || "gray"}">${Pastel.esc(p.estado)}</span></td>
              <td class="text-right mono"><strong>${Pastel.money(p.total)}</strong></td>
              <td class="text-right">
                <button class="btn btn-ghost btn-sm" data-open="${p.id}">Abrir</button>
                <button class="btn btn-ghost btn-sm" data-del="${p.id}">Eliminar</button>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>`;
    wrap.querySelectorAll("[data-open]").forEach((btn) => {
      btn.onclick = () => openDetail(btn.dataset.open);
    });
    wrap.querySelectorAll("[data-del]").forEach((btn) => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm("¿Eliminar este presupuesto?")) return;
        await Pastel.api(`/presupuestos/${btn.dataset.del}`, { method: "DELETE" });
        renderList();
      };
    });
  }

  async function openDetail(id) {
    currentId = id;
    const p = await Pastel.api(`/presupuestos/${id}`);
    const wrap = document.getElementById("presupuestos-list");
    wrap.innerHTML = `
      <div class="flex-between mb-8" style="margin-bottom:16px;">
        <button class="btn btn-ghost btn-sm no-print" id="btn-back">← Volver</button>
        <div class="flex gap-8 no-print">
          <button class="btn btn-secondary btn-sm" id="btn-print">Imprimir / PDF</button>
          <button class="btn btn-secondary btn-sm" id="btn-edit-meta">Editar datos</button>
        </div>
      </div>
      <div class="card">
        <div class="flex-between">
          <div>
            <h2>${Pastel.esc(p.titulo)}</h2>
            <p class="text-secondary">${Pastel.esc(p.client_nombre)} · ${Pastel.esc(p.fecha)}</p>
          </div>
          <span class="badge badge-${ESTADO_BADGE[p.estado] || "gray"}">${Pastel.esc(p.estado)}</span>
        </div>
        ${p.notas ? `<p class="text-secondary mt-8">${Pastel.esc(p.notas)}</p>` : ""}
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Productos</h3>
          <button class="btn btn-primary btn-sm no-print" id="btn-add-item">+ Agregar producto</button>
        </div>
        <div id="items-wrap"></div>
        <div class="totals-panel">
          <div class="row"><span class="text-secondary">Subtotal productos</span><span class="mono">${Pastel.money(p.subtotal_items)}</span></div>
          <div class="row"><span class="text-secondary">Envío (${Pastel.esc(p.envio_tipo)})</span><span class="mono">${Pastel.money(p.envio_costo)}</span></div>
          <div class="row grand"><span>Total</span><span class="mono">${Pastel.money(p.total)}</span></div>
          <div class="row no-print"><span class="text-secondary">Margen total (interno)</span><span class="mono text-secondary">${Pastel.money(p.margen_total)}</span></div>
        </div>
      </div>
    `;
    renderItems(p);
    document.getElementById("btn-back").onclick = renderList;
    document.getElementById("btn-add-item").onclick = () => openItemForm(p);
    document.getElementById("btn-edit-meta").onclick = () => openPresupuestoForm(p, () => openDetail(id));
    document.getElementById("btn-print").onclick = () => printPresupuesto(p);
  }

  function renderItems(p) {
    const wrap = document.getElementById("items-wrap");
    if (!p.items.length) {
      wrap.innerHTML = `<div class="empty"><div class="icon">▤</div>Todavía no agregaste productos a este presupuesto.</div>`;
      return;
    }
    wrap.innerHTML = `
      <div style="overflow-x:auto;">
      <table class="items-full-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Medidas</th>
            <th>Tela</th>
            <th class="text-right">Cant. tela (m)</th>
            <th class="text-right">Tela $/m</th>
            <th class="text-right">Costo tela</th>
            <th class="text-right">Mano de obra</th>
            <th>Estado M.O.</th>
            <th class="text-right">Insumos (cant. × $)</th>
            <th class="text-right">Costo unitario</th>
            <th class="text-right">Unidades</th>
            <th class="text-right">Precio unidad</th>
            <th class="text-right">Subtotal</th>
            <th class="text-right no-print">Margen</th>
            <th class="no-print"></th>
          </tr>
        </thead>
        <tbody>
          ${p.items.map((it) => `
            <tr>
              <td><strong>${Pastel.esc(it.producto)}</strong></td>
              <td class="text-secondary">${Pastel.esc(it.medidas || "—")}</td>
              <td class="text-secondary">${Pastel.esc(it.tela || "—")}</td>
              <td class="text-right mono">${it.cantidad_tela}</td>
              <td class="text-right mono">${Pastel.money(it.precio_tela_metro)}</td>
              <td class="text-right mono text-secondary">${Pastel.money(it.costo_tela)}</td>
              <td class="text-right mono">${Pastel.money(it.mano_obra_costo)}</td>
              <td><span class="badge badge-${it.mano_obra_estado === "Definido" ? "sage" : "gold"}">${it.mano_obra_estado}</span></td>
              <td class="text-right mono text-secondary">${it.insumos_cantidad} × ${Pastel.money(it.insumos_valor_unitario)} = ${Pastel.money(it.insumos_subtotal)}</td>
              <td class="text-right mono"><strong>${Pastel.money(it.costo_unitario)}</strong></td>
              <td class="text-right mono">${it.unidades}</td>
              <td class="text-right mono">${Pastel.money(it.precio_unidad)}</td>
              <td class="text-right mono"><strong>${Pastel.money(it.subtotal)}</strong></td>
              <td class="text-right mono no-print text-secondary">${Pastel.money(it.margen)}</td>
              <td class="no-print text-right">
                <button class="btn btn-ghost btn-sm" data-edit-item="${it.id}">Editar</button>
                <button class="btn btn-ghost btn-sm" data-del-item="${it.id}">✕</button>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
      </div>`;

    wrap.querySelectorAll("[data-edit-item]").forEach((btn) => {
      btn.onclick = () => openItemForm(p, p.items.find((i) => String(i.id) === btn.dataset.editItem));
    });
    wrap.querySelectorAll("[data-del-item]").forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm("¿Eliminar este producto del presupuesto?")) return;
        await Pastel.api(`/presupuesto_items/${btn.dataset.delItem}?presupuesto_id=${p.id}`, { method: "DELETE" });
        openDetail(p.id);
      };
    });
  }

  function openPresupuestoForm(presupuesto, onSaved) {
    const isEdit = !!presupuesto;
    Pastel.openModal(isEdit ? "Editar presupuesto" : "Nuevo presupuesto", `
      <div class="field"><label>Cliente</label><select id="f-client">${Pastel.clientOptionsHTML(presupuesto?.client_id)}</select></div>
      <div class="field"><label>Título</label><input id="f-titulo" value="${Pastel.esc(presupuesto?.titulo)}" placeholder="Ej. Living Familia Gómez"></div>
      <div class="field-row">
        <div class="field"><label>Fecha</label><input id="f-fecha" type="date" value="${presupuesto?.fecha || Pastel.todayISO()}"></div>
        <div class="field"><label>Estado</label><select id="f-estado">${ESTADOS.map((s) => `<option ${s === presupuesto?.estado ? "selected" : ""}>${s}</option>`).join("")}</select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Envío — tipo</label><select id="f-envio-tipo"><option ${presupuesto?.envio_tipo !== "Definido" ? "selected" : ""}>Estimativo</option><option ${presupuesto?.envio_tipo === "Definido" ? "selected" : ""}>Definido</option></select></div>
        <div class="field"><label>Envío — costo</label><input id="f-envio-costo" type="number" step="0.01" value="${presupuesto?.envio_costo ?? 0}"></div>
      </div>
      <div class="field"><label>Notas</label><textarea id="f-notas" rows="2">${Pastel.esc(presupuesto?.notas)}</textarea></div>
      <div class="flex" style="justify-content:flex-end;gap:8px;margin-top:8px;">
        <button class="btn btn-secondary" id="f-cancel">Cancelar</button>
        <button class="btn btn-primary" id="f-save">Guardar</button>
      </div>
    `);
    document.getElementById("f-cancel").onclick = Pastel.closeModal;
    document.getElementById("f-save").onclick = async () => {
      const data = {
        client_id: document.getElementById("f-client").value,
        titulo: document.getElementById("f-titulo").value.trim(),
        fecha: document.getElementById("f-fecha").value,
        estado: document.getElementById("f-estado").value,
        envio_tipo: document.getElementById("f-envio-tipo").value,
        envio_costo: parseFloat(document.getElementById("f-envio-costo").value) || 0,
        notas: document.getElementById("f-notas").value.trim(),
      };
      if (!data.client_id) { alert("Elegí un cliente"); return; }
      if (!data.titulo) { alert("El título es obligatorio"); return; }
      let saved;
      if (isEdit) saved = await Pastel.api(`/presupuestos/${presupuesto.id}`, { method: "PUT", body: JSON.stringify(data) });
      else saved = await Pastel.api("/presupuestos", { method: "POST", body: JSON.stringify(data) });
      Pastel.closeModal();
      if (onSaved) onSaved();
      else if (isEdit) openDetail(saved.id);
      else openDetail(saved.id);
    };
  }

  function openItemForm(presupuesto, item) {
    const isEdit = !!item;
    Pastel.openModal(isEdit ? "Editar producto" : "Agregar producto", `
      <div class="field"><label>Producto</label><input id="i-producto" value="${Pastel.esc(item?.producto)}" placeholder="Ej. Sillón Pastel — Lino Beige"></div>
      <div class="field-row">
        <div class="field"><label>Medidas</label><input id="i-medidas" value="${Pastel.esc(item?.medidas)}"></div>
        <div class="field"><label>Tela</label><input id="i-tela" value="${Pastel.esc(item?.tela)}"></div>
      </div>

      <h4 class="mt-16" style="font-size:13px;color:var(--lavender-deep);">Costo (interno)</h4>
      <div class="field-row mt-8">
        <div class="field"><label>Cantidad de tela (m)</label><input id="i-cant-tela" type="number" step="0.01" value="${item?.cantidad_tela ?? 0}"></div>
        <div class="field"><label>Tela $/m</label><input id="i-precio-tela" type="number" step="0.01" value="${item?.precio_tela_metro ?? 0}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Mano de obra ($)</label><input id="i-mano" type="number" step="0.01" value="${item?.mano_obra_costo ?? 0}"></div>
        <div class="field"><label>Mano de obra — estado</label><select id="i-mano-estado"><option ${item?.mano_obra_estado !== "Definido" ? "selected" : ""}>Estimativo</option><option ${item?.mano_obra_estado === "Definido" ? "selected" : ""}>Definido</option></select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Insumos extra — cantidad</label><input id="i-insumos-cant" type="number" step="0.01" value="${item?.insumos_cantidad ?? 0}"></div>
        <div class="field"><label>Insumos extra — valor unitario</label><input id="i-insumos-valor" type="number" step="0.01" value="${item?.insumos_valor_unitario ?? 0}"></div>
      </div>
      <p class="text-secondary text-sm" id="i-costo-preview"></p>

      <h4 class="mt-16" style="font-size:13px;color:var(--lavender-deep);">Venta</h4>
      <div class="field-row mt-8">
        <div class="field"><label>Unidades</label><input id="i-unidades" type="number" step="1" value="${item?.unidades ?? 1}"></div>
        <div class="field"><label>Precio por unidad</label><input id="i-precio-unidad" type="number" step="0.01" value="${item?.precio_unidad ?? 0}"></div>
      </div>
      <p class="text-secondary text-sm" id="i-venta-preview"></p>

      <div class="flex" style="justify-content:flex-end;gap:8px;margin-top:8px;">
        <button class="btn btn-secondary" id="f-cancel">Cancelar</button>
        <button class="btn btn-primary" id="f-save">Guardar</button>
      </div>
    `, { wide: true, onMount: () => {
      const ids = ["i-cant-tela", "i-precio-tela", "i-mano", "i-insumos-cant", "i-insumos-valor", "i-unidades", "i-precio-unidad"];
      const update = () => {
        const g = (id) => parseFloat(document.getElementById(id).value) || 0;
        const costoTela = g("i-cant-tela") * g("i-precio-tela");
        const insumosSub = g("i-insumos-cant") * g("i-insumos-valor");
        const costoUnitario = costoTela + g("i-mano") + insumosSub;
        const subtotal = g("i-unidades") * g("i-precio-unidad");
        const margen = subtotal - costoUnitario * g("i-unidades");
        document.getElementById("i-costo-preview").textContent =
          `Costo tela: ${Pastel.money(costoTela)} · Insumos: ${Pastel.money(insumosSub)} · Costo unitario: ${Pastel.money(costoUnitario)}`;
        document.getElementById("i-venta-preview").textContent =
          `Subtotal: ${Pastel.money(subtotal)} · Margen: ${Pastel.money(margen)}`;
      };
      ids.forEach((id) => document.getElementById(id).addEventListener("input", update));
      update();
    }});
    document.getElementById("f-cancel").onclick = Pastel.closeModal;
    document.getElementById("f-save").onclick = async () => {
      const data = {
        producto: document.getElementById("i-producto").value.trim(),
        medidas: document.getElementById("i-medidas").value.trim(),
        tela: document.getElementById("i-tela").value.trim(),
        cantidad_tela: parseFloat(document.getElementById("i-cant-tela").value) || 0,
        precio_tela_metro: parseFloat(document.getElementById("i-precio-tela").value) || 0,
        mano_obra_costo: parseFloat(document.getElementById("i-mano").value) || 0,
        mano_obra_estado: document.getElementById("i-mano-estado").value,
        insumos_cantidad: parseFloat(document.getElementById("i-insumos-cant").value) || 0,
        insumos_valor_unitario: parseFloat(document.getElementById("i-insumos-valor").value) || 0,
        unidades: parseFloat(document.getElementById("i-unidades").value) || 0,
        precio_unidad: parseFloat(document.getElementById("i-precio-unidad").value) || 0,
      };
      if (!data.producto) { alert("El producto es obligatorio"); return; }
      if (isEdit) {
        data.presupuesto_id = presupuesto.id;
        await Pastel.api(`/presupuesto_items/${item.id}`, { method: "PUT", body: JSON.stringify(data) });
      } else {
        await Pastel.api(`/presupuestos/${presupuesto.id}/items`, { method: "POST", body: JSON.stringify(data) });
      }
      Pastel.closeModal();
      openDetail(presupuesto.id);
    };
  }

  function printPresupuesto(p) {
    const w = window.open("", "_blank");
    const rows = p.items.map((it) => `
      <tr>
        <td>${Pastel.esc(it.producto)}</td>
        <td>${Pastel.esc(it.medidas || "")}</td>
        <td>${Pastel.esc(it.tela || "")}</td>
        <td style="text-align:right">${it.unidades}</td>
        <td style="text-align:right">${Pastel.money(it.precio_unidad)}</td>
        <td style="text-align:right">${Pastel.money(it.subtotal)}</td>
      </tr>`).join("");
    w.document.write(`
      <html><head><title>${Pastel.esc(p.titulo)} — Pastel Studio</title>
      <style>
        body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;color:#1d1d1f;padding:40px;}
        h1{font-size:22px;margin-bottom:2px;} .sub{color:#6e6e73;margin-bottom:24px;}
        table{width:100%;border-collapse:collapse;font-size:13px;} th{text-align:left;border-bottom:2px solid #1d1d1f;padding:8px;font-size:11px;text-transform:uppercase;letter-spacing:.04em;}
        td{padding:10px 8px;border-bottom:1px solid #e5e5e7;}
        .totals{margin-top:20px;text-align:right;} .totals div{margin-bottom:6px;} .grand{font-size:20px;font-weight:700;}
      </style></head><body>
      <h1>Pastel Studio</h1>
      <div class="sub">${Pastel.esc(p.titulo)} · ${Pastel.esc(p.client_nombre)} · ${Pastel.esc(p.fecha)}</div>
      <table><thead><tr><th>Producto</th><th>Medidas</th><th>Tela</th><th style="text-align:right">Unid.</th><th style="text-align:right">Precio unidad</th><th style="text-align:right">Subtotal</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="totals">
        <div>Subtotal productos: ${Pastel.money(p.subtotal_items)}</div>
        <div>Envío (${Pastel.esc(p.envio_tipo)}): ${Pastel.money(p.envio_costo)}</div>
        <div class="grand">Total: ${Pastel.money(p.total)}</div>
      </div>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  Pastel.registerSection("presupuestos", load);
})();
