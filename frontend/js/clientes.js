/* Sección Clientes */

(() => {
  async function load() {
    const clients = await Pastel.api("/clients");
    Pastel.state.clients = clients;
    renderTable(clients);
    document.getElementById("btn-new-client").onclick = () => openForm();
  }

  function renderTable(clients) {
    const wrap = document.getElementById("clients-table-wrap");
    if (!clients.length) {
      wrap.innerHTML = `<div class="empty"><div class="icon">◐</div>Todavía no hay clientes cargados.</div>`;
      return;
    }
    wrap.innerHTML = `
      <table>
        <thead><tr><th>Nombre</th><th>Contacto</th><th>Email</th><th>Teléfono</th><th></th></tr></thead>
        <tbody>
          ${clients.map((c) => `
            <tr>
              <td><strong>${Pastel.esc(c.nombre)}</strong></td>
              <td class="text-secondary">${Pastel.esc(c.contacto || "—")}</td>
              <td class="text-secondary">${Pastel.esc(c.email || "—")}</td>
              <td class="text-secondary">${Pastel.esc(c.telefono || "—")}</td>
              <td class="text-right">
                <button class="btn btn-ghost btn-sm" data-edit="${c.id}">Editar</button>
                <button class="btn btn-ghost btn-sm" data-del="${c.id}">Eliminar</button>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>`;
    wrap.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.onclick = () => openForm(clients.find((c) => String(c.id) === btn.dataset.edit));
    });
    wrap.querySelectorAll("[data-del]").forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm("¿Eliminar este cliente?")) return;
        await Pastel.api(`/clients/${btn.dataset.del}`, { method: "DELETE" });
        load();
      };
    });
  }

  function openForm(client) {
    const isEdit = !!client;
    Pastel.openModal(isEdit ? "Editar cliente" : "Nuevo cliente", `
      <div class="field"><label>Nombre</label><input id="f-nombre" value="${Pastel.esc(client?.nombre)}"></div>
      <div class="field-row">
        <div class="field"><label>Contacto</label><input id="f-contacto" value="${Pastel.esc(client?.contacto)}"></div>
        <div class="field"><label>Teléfono</label><input id="f-telefono" value="${Pastel.esc(client?.telefono)}"></div>
      </div>
      <div class="field"><label>Email</label><input id="f-email" value="${Pastel.esc(client?.email)}"></div>
      <div class="field"><label>Notas</label><textarea id="f-notas" rows="3">${Pastel.esc(client?.notas)}</textarea></div>
      <div class="flex" style="justify-content:flex-end;gap:8px;margin-top:8px;">
        <button class="btn btn-secondary" id="f-cancel">Cancelar</button>
        <button class="btn btn-primary" id="f-save">Guardar</button>
      </div>
    `);
    document.getElementById("f-cancel").onclick = Pastel.closeModal;
    document.getElementById("f-save").onclick = async () => {
      const data = {
        nombre: document.getElementById("f-nombre").value.trim(),
        contacto: document.getElementById("f-contacto").value.trim(),
        telefono: document.getElementById("f-telefono").value.trim(),
        email: document.getElementById("f-email").value.trim(),
        notas: document.getElementById("f-notas").value.trim(),
      };
      if (!data.nombre) { alert("El nombre es obligatorio"); return; }
      if (isEdit) await Pastel.api(`/clients/${client.id}`, { method: "PUT", body: JSON.stringify(data) });
      else await Pastel.api("/clients", { method: "POST", body: JSON.stringify(data) });
      Pastel.closeModal();
      await Pastel.loadClients();
      load();
    };
  }

  Pastel.registerSection("clientes", load);
})();
