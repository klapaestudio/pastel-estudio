import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, downloadPresupuestoPdf, openPresupuestoPdf } from "../../lib/api";
import { ESTADO_PROSPECTO_LABEL, etiquetaLabel, fmtDate, fmtMoney } from "../../lib/format";
import { Contacto } from "../../lib/types";
import { Badge, Button, EmptyState, Select, Input } from "../../components/ui";
import { ContactoModal } from "./ContactoModal";

function presupuestadorBase(tipo: string): string {
  return tipo === "ARQUITECTURA" ? "/presupuestador/arquitectura" : "/presupuestador/objetos";
}

function estadoTone(estado: string): "positive" | "warning" | "negative" | "neutral" {
  if (estado === "PRESU_APROBADO") return "positive";
  if (estado === "PRESU_RECHAZADO") return "negative";
  if (estado === "PRESU_ENVIADO") return "warning";
  return "neutral";
}

export default function Prospectos() {
  const [list, setList] = useState<Contacto[]>([]);
  const [tipoProducto, setTipoProducto] = useState("");
  const [estado, setEstado] = useState("");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Contacto | null | "new">(null);

  async function load() {
    const params = new URLSearchParams({ etapa: "PROSPECTO" });
    if (tipoProducto) params.set("tipoProducto", tipoProducto);
    if (estado) params.set("estado", estado);
    if (q) params.set("q", q);
    setList(await api.get<Contacto[]>(`/contactos?${params}`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoProducto, estado, q]);

  async function marcarFollowUpRealizado(id: string) {
    await api.post(`/contactos/${id}/followup-realizado`);
    load();
  }

  async function setFollowUpManual(id: string, fecha: string) {
    await api.post(`/contactos/${id}/followup-manual`, { fecha: fecha || null });
    load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este prospecto?")) return;
    await api.del(`/contactos/${id}`);
    load();
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <p className="eyebrow">CRM</p>
          <h1 className="page-title">Prospectos</h1>
          <p className="page-subtitle">Consultas en camino a convertirse en clientes</p>
        </div>
        <Button variant="primary" onClick={() => setEditing("new")}>+ Nuevo prospecto</Button>
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
          <Select value={estado} onChange={(e) => setEstado(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_PROSPECTO_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="card">
        {list.length === 0 ? (
          <EmptyState>No hay prospectos que coincidan con el filtro.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Etiquetas</th>
                  <th>Tela / color</th>
                  <th>Monto</th>
                  <th>Envío presu.</th>
                  <th>Estado</th>
                  <th>Follow up</th>
                  <th>Presupuesto</th>
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
                    <td>{c.telaColor || "—"}</td>
                    <td className="mono">{fmtMoney(c.monto)}</td>
                    <td>{fmtDate(c.fechaEnvioPresupuesto)}</td>
                    <td><Badge tone={estadoTone(c.estado)}>{ESTADO_PROSPECTO_LABEL[c.estado]}</Badge></td>
                    <td>
                      {c.followUp?.hitosVencidos && c.followUp.hitosVencidos.length > 0 && (
                        <Badge tone="warning">Día {c.followUp.hitosVencidos[c.followUp.hitosVencidos.length - 1]}</Badge>
                      )}
                      {c.followUp?.alertaSinNovedades && <Badge tone="negative">Sin novedades</Badge>}
                      {!c.followUpRealizado && c.followUp?.activo && (
                        <div style={{ marginTop: 6 }}>
                          <Button size="sm" variant="ghost" onClick={() => marcarFollowUpRealizado(c.id)}>
                            Marcar realizado
                          </Button>
                        </div>
                      )}
                      <div style={{ marginTop: 6 }}>
                        <input
                          type="date"
                          className="input"
                          style={{ fontSize: 11, padding: "4px 6px" }}
                          value={c.followUpManualFecha ? c.followUpManualFecha.slice(0, 10) : ""}
                          onChange={(e) => setFollowUpManual(c.id, e.target.value)}
                          title="Follow up manual"
                        />
                      </div>
                    </td>
                    <td>
                      {c.presupuestos && c.presupuestos.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {c.presupuestos.map((p) => (
                            <div key={p.id} style={{ display: "flex", gap: 4 }}>
                              <Button size="sm" variant="ghost" onClick={() => openPresupuestoPdf(p.id)}>Ver</Button>
                              <Link className="link-accent" style={{ fontSize: 12.5 }} to={`${presupuestadorBase(p.tipo)}?id=${p.id}`}>Abrir</Link>
                              <Button size="sm" variant="ghost" onClick={() => downloadPresupuestoPdf(p.id, `${p.titulo}.pdf`)}>↓</Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8 }}>
                          <Link className="link-accent" style={{ fontSize: 12.5 }} to={`/presupuestador/objetos?contactoId=${c.id}`}>Crear objeto</Link>
                          <Link className="link-accent" style={{ fontSize: 12.5 }} to={`/presupuestador/arquitectura?contactoId=${c.id}`}>Crear arq.</Link>
                        </div>
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
          etapa="PROSPECTO"
          contacto={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
