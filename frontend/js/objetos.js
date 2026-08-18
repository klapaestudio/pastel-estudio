/* Sección Objetos Pastel — catálogo de líneas + variantes */

(() => {
  async function load() {
    const lineas = await Pastel.api("/lineas");
    render(lineas);
    document.getElementById("btn-new-linea").onclick = () => openLineaForm();
  }

  function render(lineas) {
    const wrap = document.getElementById("lineas-list");
    if (!lineas.length) {
      wrap.innerHTML = `<div class="empty"><div class="icon">◆</div>Todavía no hay líneas de producto cargadas.</div>`;
      return;
    }
    wrap.innerHTML = lineas.map((l) => `
      <div class="item-card">
        <div class="item-card-top">
          <div>
            <strong>${Pastel.esc(l.modelo)}</strong>
            <div class="text-secondary text-sm">${Pastel.esc(l.medidas || "sin medidas")}</div>
          </div>
          <div class="flex gap-8">
            <button class="btn btn-ghost btn-sm" data-edit-linea="${l.id}">Editar</button>
            <button class="btn btn-ghost btn-sm" data-del-linea="${l.id}">Eliminar</button>
          </div>
        </div>
        <div class="item-summary-row">
          <div class="stat"><div class="label">Mano de obra</div><div class="value">${Pastel.money(l.mano_obra_costo)}</div></div>
          <div class="stat"><div class="label">Tela necesaria</div><div class="value">${l.cantidad_tela} m</div></div>
        </div>
        <table class="mt-16">
          <thead><tr><th>Variante</th><th>Tela $/m</th><th>Costo tela</th><th>Costo total</th><th>Precio final</th><th></th></tr></thead>
          <tbody>
            ${l.variantes.map((v) => `
              <tr>
                <td>${Pastel.esc(v.nombre)}</td>
                <td class="mono">${Pastel.money(v.tela_precio_metro)}</td>
                <td class="mono text-secondary">${Pastel.money(v.tela_costo_total)}</td>
                <td class="mono text-secondary">${Pastel.money(v.costo_total)}</td>
                <td class="mono"><strong>${Pastel.money(v.precio_final)}</strong></td>
                <td class="text-right">
                  <button class="btn btn-ghost btn-sm" data-edit-variante="${v.id}" data-linea="${l.id}">Editar</button>
                  <button class="btn btn-ghost btn-sm" data-del-variante="${v.id}" data-linea="${l.id}">✕</button>
                </td>
              </tr>`).join("")}
          </tbody>
        </table>
        <button class="link-btn mt-8" data-add-variante="${l.id}">+ Agregar variante</button>
      </div>
    `).join("");

    wrap.querySelectorAll("[data-edit-linea]").forEach((btn) => {
      btn.onclick = () => openLineaForm(lineas.find((l) => String(l.id) === btn.dataset.editLinea));
    });
    wrap.querySelectorAll("[data-del-linea]").forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm("¿Eliminar esta línea y todas sus variantes?")) return;
        await Pastel.api(`/lineas/${btn.dataset.delLinea}`, { method: "DELETE" });
        load();
      };
    });
    wrap.querySelectorAll("[data-add-variante]").forEach((btn) => {
      btn.onclick = () => openVarianteForm(lineas.find((l) => String(l.id) === btn.dataset.addVariante));
    });
    wrap.querySelectorAll("[data-edit-variante]").forEach((btn) => {
      const l = lineas.find((l) => String(l.id) === btn.dataset.linea);
      btn.onclick = () => openVarianteForm(l, l.variantes.find((v) => String(v.id) === btn.dataset.editVariante));
    });
    wrap.querySelectorAll("[data-del-variante]").forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm("¿Eliminar esta variante?")) return;
        await Pastel.api(`/variantes/${btn.dataset.delVariante}?linea_id=${btn.dataset.linea}`, { method: "DELETE" });
        load();
      };
    });
  }

  function openLineaForm(linea) {
    const isEdit = !!linea;
    Pastel.openModal(isEdit ? "Editar línea" : "Nueva línea de producto", `
      <div class="field"><label>Modelo</label><input id="f-modelo" value="${Pastel.esc(linea?.modelo)}" placeholder="Ej. Sillón Pastel"></div>
      <div class="field"><label>Medidas</label><input id="f-medidas" value="${Pastel.esc(linea?.medidas)}" placeholder="Ej. 180 x 90 x 85 cm"></div>
      <div class="field-row">
        <div class="field"><label>Mano de obra ($)</label><input id="f-mano" type="number" step="0.01" value="${linea?.mano_obra_costo ?? 0}"></div>
        <div class="field"><label>Tela necesaria (m)</label><input id="f-tela" type="number" step="0.01" value="${linea?.cantidad_tela ?? 0}"></div>
      </div>
      <div class="flex" style="justify-content:flex-end;gap:8px;margin-top:8px;">
        <button class="btn btn-secondary" id="f-cancel">Cancelar</button>
        <button class="btn btn-primary" id="f-save">Guardar</button>
      </div>
    `);
    document.getElementById("f-cancel").onclick = Pastel.closeModal;
    document.getElementById("f-save").onclick = async () => {
      const data = {
        modelo: document.getElementById("f-modelo").value.trim(),
        medidas: document.getElementById("f-medidas").value.trim(),
        mano_obra_costo: parseFloat(document.getElementById("f-mano").value) || 0,
        cantidad_tela: parseFloat(document.getElementById("f-tela").value) || 0,
      };
      if (!data.modelo) { alert("El modelo es obligatorio"); return; }
      if (isEdit) await Pastel.api(`/lineas/${linea.id}`, { method: "PUT", body: JSON.stringify(data) });
      else await Pastel.api("/lineas", { method: "POST", body: JSON.stringify(data) });
      Pastel.closeModal();
      load();
    };
  }

  function openVarianteForm(linea, variante) {
    const isEdit = !!variante;
    Pastel.openModal(isEdit ? "Editar variante" : `Nueva variante — ${linea.modelo}`, `
      <div class="field"><label>Nombre (tela / color)</label><input id="f-nombre" value="${Pastel.esc(variante?.nombre)}" placeholder="Ej. Lino Beige"></div>
      <div class="field-row">
        <div class="field"><label>Tela $/m</label><input id="f-precio-tela" type="number" step="0.01" value="${variante?.tela_precio_metro ?? 0}"></div>
        <div class="field"><label>Precio final de venta</label><input id="f-precio-final" type="number" step="0.01" value="${variante?.precio_final ?? 0}"></div>
      </div>
      <p class="text-secondary text-sm" id="f-preview"></p>
      <div class="flex" style="justify-content:flex-end;gap:8px;margin-top:8px;">
        <button class="btn btn-secondary" id="f-cancel">Cancelar</button>
        <button class="btn btn-primary" id="f-save">Guardar</button>
      </div>
    `, { onMount: () => {
      const update = () => {
        const precioTela = parseFloat(document.getElementById("f-precio-tela").value) || 0;
        const telaCostoTotal = precioTela * (linea.cantidad_tela || 0);
        const costoTotal = telaCostoTotal + (linea.mano_obra_costo || 0);
        document.getElementById("f-preview").textContent =
          `Costo tela: ${Pastel.money(telaCostoTotal)} · Costo total (tela + mano de obra): ${Pastel.money(costoTotal)}`;
        if (!isEdit) document.getElementById("f-precio-final").placeholder = costoTotal.toFixed(2);
      };
      document.getElementById("f-precio-tela").addEventListener("input", update);
      update();
    }});
    document.getElementById("f-cancel").onclick = Pastel.closeModal;
    document.getElementById("f-save").onclick = async () => {
      const data = {
        linea_id: linea.id,
        nombre: document.getElementById("f-nombre").value.trim(),
        tela_precio_metro: parseFloat(document.getElementById("f-precio-tela").value) || 0,
        precio_final: parseFloat(document.getElementById("f-precio-final").value) || 0,
      };
      if (!data.nombre) { alert("El nombre es obligatorio"); return; }
      if (isEdit) await Pastel.api(`/variantes/${variante.id}`, { method: "PUT", body: JSON.stringify(data) });
      else await Pastel.api(`/lineas/${linea.id}/variantes`, { method: "POST", body: JSON.stringify(data) });
      Pastel.closeModal();
      load();
    };
  }

  Pastel.registerSection("objetos", load);
})();
