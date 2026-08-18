import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { etiquetaLabel, fmtDate, fmtMoney, PERFIL_LABEL } from "../../lib/format";
import { Contacto } from "../../lib/types";
import { Badge, Button, EmptyState, Input, Select } from "../../components/ui";
import { ContactoModal } from "./ContactoModal";

export default function Clientes() {
  const [list, setList] = useState<Contacto[]>([]);
  const [tipoProducto, setTipoProducto] = useState("");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Contacto | null | "new">(null);

  async function load() {
    const params = new URLSearchParams({ etapa: "CLIENTE" });
    if (tipoProducto) params.set("tipoProducto", tipoProducto);
    if (q) params.set("q", q);
    setList(await api.get<Contacto[]>(`/contactos?${params}`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoProducto, q]);

  async function marcarContactado(id: string) {
    await api.post(`/contactos/${id}/recontacto-hecho`);
    load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este cliente?")) return;
    await api.del(`/contactos/${id}`);
    load();
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <p className="eyebrow">CRM</p>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Base de clientes, filtrable por línea de negocio</p>
        </div>
        <Button variant="primary" onClick={() => setEditing("new")}>+ Nuevo cliente</Button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Input placeholder="Buscar por nombre…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 220 }} />
          <Select value={tipoProducto} onChange={(e) => setTipoProducto(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="">Tipo de producto: todos</option>
            <option value="COLECCION">Colección</option>
            <option value="PERSONALIZADO">Personalizado</option>
            <option value="ARQUITECTURA">Arquitectura</option>
          </Select>
        </div>
      </div>

      <div className="card">
        {list.length === 0 ? (
          <EmptyState>No hay clientes que coincidan con el filtro.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Etiquetas</th>
                  <th>Perfil</th>
                  <th>Monto</th>
                  <th>Última compra</th>
                  <th>Entrega</th>
                  <th>Recontacto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.nombre}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{c.telefono}</div>
                    </td>
                    <td>
                      <div className="chip-row">
                        {c.etiquetas.map((e) => (
                          <Badge key={e.id} tone="neutral">{etiquetaLabel(e)}</Badge>
                        ))}
                      </div>
                    </td>
                    <td>{c.perfil ? PERFIL_LABEL[c.perfil] : "—"}</td>
                    <td className="mono">{fmtMoney(c.monto)}</td>
                    <td>{fmtDate(c.fechaUltimaCompra)}</td>
                    <td>{fmtDate(c.fechaEntrega)}</td>
                    <td>
                      {c.recontacto?.vencido ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                          <Badge tone="warning">Hace {c.recontacto.diasDesdeVencimiento}d</Badge>
                          <Button size="sm" variant="ghost" onClick={() => marcarContactado(c.id)}>Marcar contactado</Button>
                        </div>
                      ) : (
                        <span className="muted">Al día</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>Editar</Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(c.id)}>✕</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <ContactoModal
          etapa="CLIENTE"
          contacto={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
