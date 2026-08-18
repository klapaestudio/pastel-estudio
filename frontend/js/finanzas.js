/* Sección Finanzas */

(() => {
  const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  let activeTab = "ingresos";

  function currentMesAnio() {
    return {
      mes: parseInt(document.getElementById("finanzas-mes").value, 10),
      anio: parseInt(document.getElementById("finanzas-anio").value, 10),
    };
  }

  async function load() {
    const now = new Date();
    const mesSel = document.getElementById("finanzas-mes");
    const anioSel = document.getElementById("finanzas-anio");
    if (!mesSel.options.length) {
      mesSel.innerHTML = MESES.map((m, i) => `<option value="${i + 1}" ${i + 1 === now.getMonth() + 1 ? "selected" : ""}>${m}</option>`).join("");
      const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
      anioSel.innerHTML = years.map((y) => `<option ${y === now.getFullYear() ? "selected" : ""}>${y}</option>`).join("");
      mesSel.onchange = refresh;
      anioSel.onchange = refresh;
    }
    document.querySelectorAll(".tab").forEach((t) => {
      t.onclick = () => { activeTab = t.dataset.tab; document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === t)); renderTab(); };
    });
    await refresh();
  }

  async function refresh() {
    await renderKPIs();
    await renderTab();
  }

  async function renderKPIs() {
    const { mes, anio } = currentMesAnio();
    const s = await Pastel.api(`/finanzas/resumen?mes=${mes}&anio=${anio}`);
    document.getElementById("finanzas-kpis").innerHTML = `
      <div class="kpi-card accent-sage"><div class="label">Ingresos</div><div class="value">${Pastel.money(s.ingresos)}</div></div>
      <div class="kpi-card accent-pink"><div class="label">Gastos</div><div class="value">${Pastel.money(s.gastos)}</div></div>
      <div class="kpi-card accent-gold"><div class="label">Pagos a proveedores</div><div class="value">${Pastel.money(s.pagos_proveedores)}</div></div>
      <div class="kpi-card accent-lavender"><div class="label">Balance del mes</div><div class="value">${Pastel.money(s.balance)}</div></div>
    `;
  }

  async function renderTab() {
    const { mes, anio } = currentMesAnio();
    const wrap = document.getElementById("finanzas-tab-content");
    if (activeTab === "ingresos") {
      const items = await Pastel.api(`/finanzas/ingresos?mes=${mes}&anio=${anio}`);
      wrap.innerHTML = tableHTML(items, [
        ["fecha", "Fecha"], ["concepto", "Concepto"], ["categoria", "Categoría"], ["client_nombre", "Cliente"], ["monto", "Monto", true],
      ], "ingresos");
      bindAdd("ingresos", () => openIngresoForm());
      bindDelete(items, "ingresos");
    } else if (activeTab === "gastos") {
      const items = await Pastel.api(`/finanzas/gastos?mes=${mes}&anio=${anio}`);
      wrap.innerHTML = tableHTML(items, [
        ["fecha", "Fecha"], ["concepto", "Concepto"], ["categoria", "Categoría"], ["proveedor", "Proveedor"], ["monto", "Monto", true],
      ], "gastos");
      bindAdd("gastos", () => openGastoForm());
      bindDelete(items, "gastos");
    } else if (activeTab === "proveedores") {
      const items = await Pastel.api(`/finanzas/pagos_proveedores`);
      wrap.innerHTML = tableHTML(items, [
        ["fecha", "Fecha"], ["proveedor", "Proveedor"], ["concepto", "Concepto"], ["metodo", "Método"], ["monto", "Monto", true],
      ], "pagos_proveedores");
      bindAdd("pagos_proveedores", () => openPagoForm());
      bindDelete(items, "pagos_proveedores");
    } else if (activeTab === "retiros") {
      const items = await Pastel.api(`/finanzas/retiros`);
      wrap.innerHTML = tableHTML(items, [
        ["fecha", "Fecha"], ["socia", "Socia"], ["notas", "Notas"], ["monto", "Monto", true],
      ], "retiros");
      bindAdd("retiros", () => openRetiroForm());
      bindDelete(items, "retiros");
    }
  }

  function tableHTML(items, cols, kind) {
    const addLabel = { ingresos: "+ Nuevo ingreso", gastos: "+ Nuevo gasto", pagos_proveedores: "+ Nuevo pago", retiros: "+ Nuevo retiro" }[kind];
    const header = `<div class="flex-between" style="margin-bottom:14px;"><span></span><button class="btn btn-primary btn-sm" id="btn-add-${kind}">${addLabel}</button></div>`;
    if (!items.length) return header + `<div class="empty"><div class="icon">◈</div>Sin movimientos este mes.</div>`;
    return header + `
      <table>
        <thead><tr>${cols.map((c) => `<th${c[2] ? ' class="text-right"' : ""}>${c[1]}</th>`).join("")}<th></th></tr></thead>
        <tbody>
          ${items.map((it) => `
            <tr>
              ${cols.map((c) => `<td${c[2] ? ' class="text-right mono"' : ""}>${c[2] ? Pastel.money(it[c[0]]) : Pastel.esc(it[c[0]] || "—")}</td>`).join("")}
              <td class="text-right"><button class="btn btn-ghost btn-sm" data-del="${it.id}">Eliminar</button></td>
            </tr>`).join("")}
        </tbody>
      </table>`;
  }

  function bindAdd(kind, fn) {
    const btn = document.getElementById("btn-add-" + kind);
    if (btn) btn.onclick = fn;
  }

  function bindDelete(items, kind) {
    document.querySelectorAll("[data-del]").forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm("¿Eliminar este movimiento?")) return;
        await Pastel.api(`/finanzas/${kind}/${btn.dataset.del}`, { method: "DELETE" });
        refresh();
      };
    });
  }

  function baseFormFooter() {
    return `<div class="flex" style="justify-content:flex-end;gap:8px;margin-top:8px;">
        <button class="btn btn-secondary" id="f-cancel">Cancelar</button>
        <button class="btn btn-primary" id="f-save">Guardar</button>
      </div>`;
  }

  function openIngresoForm() {
    Pastel.openModal("Nuevo ingreso", `
      <div class="field"><label>Concepto</label><input id="f-concepto"></div>
      <div class="field-row">
        <div class="field"><label>Cliente</label><select id="f-client"><option value="">—</option>${Pastel.clientOptionsHTML()}</select></div>
        <div class="field"><label>Categoría</label><input id="f-categoria" placeholder="Ej. Venta, Anticipo"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Monto</label><input id="f-monto" type="number" step="0.01"></div>
        <div class="field"><label>Fecha</label><input id="f-fecha" type="date" value="${Pastel.todayISO()}"></div>
      </div>
      ${baseFormFooter()}
    `);
    document.getElementById("f-cancel").onclick = Pastel.closeModal;
    document.getElementById("f-save").onclick = async () => {
      const data = {
        concepto: document.getElementById("f-concepto").value.trim(),
        client_id: document.getElementById("f-client").value || null,
        categoria: document.getElementById("f-categoria").value.trim(),
        monto: parseFloat(document.getElementById("f-monto").value) || 0,
        fecha: document.getElementById("f-fecha").value,
      };
      if (!data.concepto) { alert("El concepto es obligatorio"); return; }
      await Pastel.api("/finanzas/ingresos", { method: "POST", body: JSON.stringify(data) });
      Pastel.closeModal();
      refresh();
    };
  }

  function openGastoForm() {
    Pastel.openModal("Nuevo gasto", `
      <div class="field"><label>Concepto</label><input id="f-concepto"></div>
      <div class="field-row">
        <div class="field"><label>Categoría</label><input id="f-categoria"></div>
        <div class="field"><label>Proveedor</label><input id="f-proveedor"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Monto</label><input id="f-monto" type="number" step="0.01"></div>
        <div class="field"><label>Fecha</label><input id="f-fecha" type="date" value="${Pastel.todayISO()}"></div>
      </div>
      ${baseFormFooter()}
    `);
    document.getElementById("f-cancel").onclick = Pastel.closeModal;
    document.getElementById("f-save").onclick = async () => {
      const data = {
        concepto: document.getElementById("f-concepto").value.trim(),
        categoria: document.getElementById("f-categoria").value.trim(),
        proveedor: document.getElementById("f-proveedor").value.trim(),
        monto: parseFloat(document.getElementById("f-monto").value) || 0,
        fecha: document.getElementById("f-fecha").value,
      };
      if (!data.concepto) { alert("El concepto es obligatorio"); return; }
      await Pastel.api("/finanzas/gastos", { method: "POST", body: JSON.stringify(data) });
      Pastel.closeModal();
      refresh();
    };
  }

  function openPagoForm() {
    Pastel.openModal("Nuevo pago a proveedor", `
      <div class="field"><label>Proveedor</label><input id="f-proveedor"></div>
      <div class="field"><label>Concepto</label><input id="f-concepto"></div>
      <div class="field-row">
        <div class="field"><label>Método</label><input id="f-metodo" placeholder="Transferencia, efectivo..."></div>
        <div class="field"><label>Monto</label><input id="f-monto" type="number" step="0.01"></div>
      </div>
      <div class="field"><label>Fecha</label><input id="f-fecha" type="date" value="${Pastel.todayISO()}"></div>
      ${baseFormFooter()}
    `);
    document.getElementById("f-cancel").onclick = Pastel.closeModal;
    document.getElementById("f-save").onclick = async () => {
      const data = {
        proveedor: document.getElementById("f-proveedor").value.trim(),
        concepto: document.getElementById("f-concepto").value.trim(),
        metodo: document.getElementById("f-metodo").value.trim(),
        monto: parseFloat(document.getElementById("f-monto").value) || 0,
        fecha: document.getElementById("f-fecha").value,
      };
      if (!data.proveedor) { alert("El proveedor es obligatorio"); return; }
      await Pastel.api("/finanzas/pagos_proveedores", { method: "POST", body: JSON.stringify(data) });
      Pastel.closeModal();
      refresh();
    };
  }

  function openRetiroForm() {
    Pastel.openModal("Nuevo retiro", `
      <div class="field"><label>Socia</label><input id="f-socia"></div>
      <div class="field-row">
        <div class="field"><label>Monto</label><input id="f-monto" type="number" step="0.01"></div>
        <div class="field"><label>Fecha</label><input id="f-fecha" type="date" value="${Pastel.todayISO()}"></div>
      </div>
      <div class="field"><label>Notas</label><input id="f-notas"></div>
      ${baseFormFooter()}
    `);
    document.getElementById("f-cancel").onclick = Pastel.closeModal;
    document.getElementById("f-save").onclick = async () => {
      const data = {
        socia: document.getElementById("f-socia").value.trim(),
        monto: parseFloat(document.getElementById("f-monto").value) || 0,
        fecha: document.getElementById("f-fecha").value,
        notas: document.getElementById("f-notas").value.trim(),
      };
      if (!data.socia) { alert("La socia es obligatoria"); return; }
      await Pastel.api("/finanzas/retiros", { method: "POST", body: JSON.stringify(data) });
      Pastel.closeModal();
      refresh();
    };
  }

  Pastel.registerSection("finanzas", load);
})();
