import { useEffect, useState } from "react";
import { api, downloadPresupuestoPdf, openPresupuestoPdf } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { fmtDate, fmtMoney } from "../../lib/format";
import { Badge, Button, Card, EmptyState, Tabs } from "../../components/ui";

interface Proyecto {
  id: string; nombre: string;
  archivos: { id: string; nombre: string; tipo?: string; fileData?: string; createdAt: string }[];
  etapasProyecto: { id: string; nombre: string; orden: number; completada: boolean; fecha?: string | null }[];
  presupuestos: { id: string; titulo: string; plantillaPdf: string }[];
  cobros: { id: string; concepto: string; cuotas: { id: string; numero: number; fecha: string; monto: number; pagada: boolean }[] }[];
}

export default function Portal() {
  const { user, logout } = useAuth();
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [tab, setTab] = useState("biblioteca");

  useEffect(() => {
    api.get<Proyecto>("/portal/cliente/mi-proyecto").then(setProyecto);
  }, []);

  if (!proyecto) return null;

  return (
    <div className="main-area" style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="topbar">
        <div>
          <div className="brand-logo-lg" aria-label="Pastel Studio">
            <span className="brand-mark brand-mark-lg">P</span>
          </div>
          <p className="page-subtitle" style={{ marginTop: 14 }}>Portal de {user?.nombre}</p>
        </div>
        <Button variant="ghost" onClick={logout}>Cerrar sesión</Button>
      </div>

      <Tabs
        tabs={[
          { key: "biblioteca", label: "Biblioteca de archivos" },
          { key: "presupuesto", label: "Presupuesto aprobado" },
          { key: "avance", label: "Estado de avance" },
          { key: "pagos", label: "Plan de pagos" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "biblioteca" && (
        <Card title="Biblioteca de archivos">
          {proyecto.archivos.length === 0 ? <EmptyState>Todavía no hay archivos compartidos.</EmptyState> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {proyecto.archivos.map((a) => (
                <a key={a.id} href={a.fileData} download={a.nombre} className="alert-row">
                  <span>{a.nombre}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{fmtDate(a.createdAt)}</span>
                </a>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "presupuesto" && (
        <Card title="Presupuesto aprobado">
          {proyecto.presupuestos.length === 0 ? <EmptyState>Todavía no hay un presupuesto aprobado.</EmptyState> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {proyecto.presupuestos.map((p) => (
                <div key={p.id} className="alert-row">
                  <span>{p.titulo}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button size="sm" variant="secondary" onClick={() => openPresupuestoPdf(p.id, p.plantillaPdf)}>Ver</Button>
                    <Button size="sm" variant="secondary" onClick={() => downloadPresupuestoPdf(p.id, `${p.titulo}.pdf`, p.plantillaPdf)}>Descargar</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "avance" && (
        <Card title="Estado de avance del proyecto">
          {proyecto.etapasProyecto.length === 0 ? <EmptyState>Todavía no se cargaron etapas.</EmptyState> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {proyecto.etapasProyecto.map((e) => (
                <div key={e.id} className="alert-row" style={{ cursor: "default" }}>
                  <span>{e.nombre}</span>
                  <Badge tone={e.completada ? "positive" : "neutral"}>{e.completada ? `Completada — ${fmtDate(e.fecha)}` : "Pendiente"}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "pagos" && (
        <Card title="Plan de pagos">
          {proyecto.cobros.length === 0 ? <EmptyState>No hay cuotas cargadas.</EmptyState> : (
            proyecto.cobros.map((c) => (
              <div key={c.id} style={{ marginBottom: 14 }}>
                <strong>{c.concepto}</strong>
                <table className="data-table" style={{ marginTop: 8 }}>
                  <thead><tr><th>Cuota</th><th>Fecha</th><th>Monto</th><th>Estado</th></tr></thead>
                  <tbody>
                    {c.cuotas.map((cu) => (
                      <tr key={cu.id}>
                        <td>{cu.numero}</td>
                        <td>{fmtDate(cu.fecha)}</td>
                        <td className="mono">{fmtMoney(cu.monto)}</td>
                        <td><Badge tone={cu.pagada ? "positive" : "warning"}>{cu.pagada ? "Pagada" : "Pendiente"}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </Card>
      )}
    </div>
  );
}
