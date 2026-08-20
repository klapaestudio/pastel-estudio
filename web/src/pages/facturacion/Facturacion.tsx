import { Fragment, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { fmtDate, fmtMoney } from "../../lib/format";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Tabs } from "../../components/ui";

interface ContactoLite { id: string; nombre: string; }
interface Cuota {
  id: string; numero: number; fecha: string; monto: number; costos: number; gastos: number;
  pagada: boolean; fechaPago?: string | null; comprobanteEmitido: boolean;
}
interface Cobro { id: string; concepto: string; categoria?: string; gananciaTotal: number; contacto: ContactoLite; cuotas: Cuota[]; }
interface ArcaConfig { cuitEstudio?: string; cuentaVinculada: boolean; puntoVentaDefault?: string; }

export default function Facturacion() {
  const [tab, setTab] = useState("cobros");
  return (
    <div>
      <PageHeader number="03" eyebrow="General" title="Facturación" subtitle="Cobros, cuotas y facturación electrónica (ARCA)" />
      <Tabs tabs={[{ key: "cobros", label: "Cobros" }, { key: "arca", label: "ARCA" }]} active={tab} onChange={setTab} />
      {tab === "cobros" && <CobrosTab />}
      {tab === "arca" && <ArcaTab />}
    </div>
  );
}

function CobrosTab() {
  const [list, setList] = useState<Cobro[]>([]);
  const [contactos, setContactos] = useState<ContactoLite[]>([]);
  const [creating, setCreating] = useState(false);
  const [emitiendo, setEmitiendo] = useState<Cuota | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const load = () => api.get<Cobro[]>("/facturacion/cobros").then(setList);
  useEffect(() => { load(); api.get<ContactoLite[]>("/contactos").then(setContactos); }, []);

  async function marcarPagada(id: string) {
    await api.put(`/facturacion/cuotas/${id}`, { pagada: true });
    load();
  }

  function toggle(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtro = busqueda.trim().toLowerCase();
  const filtrados = filtro ? list.filter((c) => c.contacto.nombre.toLowerCase().includes(filtro)) : list;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Input
          placeholder="Buscar cliente…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        <Button variant="primary" onClick={() => setCreating(true)}>+ Nueva venta / cobro</Button>
      </div>

      <Card>
        {filtrados.length === 0 ? (
          <EmptyState>{filtro ? "Ningún cliente coincide con la búsqueda." : "No hay cobros cargados."}</EmptyState>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th></th><th>Cliente</th><th>Servicio</th><th>Monto abonado</th><th>Monto adeudado</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {filtrados.map((c) => {
                const abonado = c.cuotas.filter((cu) => cu.pagada).reduce((s, cu) => s + cu.monto, 0);
                const adeudado = c.cuotas.filter((cu) => !cu.pagada).reduce((s, cu) => s + cu.monto, 0);
                const hoy = new Date();
                const atrasado = c.cuotas.some((cu) => !cu.pagada && new Date(cu.fecha) < hoy);
                const abierto = expandidos.has(c.id);
                return (
                  <Fragment key={c.id}>
                    <tr onClick={() => toggle(c.id)} style={{ cursor: "pointer" }}>
                      <td className="muted" style={{ width: 18 }}>{abierto ? "▾" : "▸"}</td>
                      <td style={{ fontWeight: 600 }}>{c.contacto.nombre}</td>
                      <td>{c.concepto}</td>
                      <td className="mono">{fmtMoney(abonado)}</td>
                      <td className="mono">{fmtMoney(adeudado)}</td>
                      <td>
                        {adeudado === 0 ? (
                          <Badge tone="positive">Al día</Badge>
                        ) : atrasado ? (
                          <Badge tone="negative">Atrasado</Badge>
                        ) : (
                          <Badge tone="warning">Pendiente</Badge>
                        )}
                      </td>
                    </tr>
                    {abierto && (
                      <tr>
                        <td colSpan={6} style={{ padding: 0, background: "var(--fill)" }}>
                          <div style={{ padding: "10px 16px 16px 34px" }}>
                            <table className="data-table">
                              <thead>
                                <tr><th>Cuota</th><th>Fecha</th><th>Monto</th><th>Pagó el</th><th>Estado</th><th></th></tr>
                              </thead>
                              <tbody>
                                {c.cuotas.map((cu) => (
                                  <tr key={cu.id}>
                                    <td>{cu.numero}</td>
                                    <td>{fmtDate(cu.fecha)}</td>
                                    <td className="mono">{fmtMoney(cu.monto)}</td>
                                    <td>{cu.fechaPago ? fmtDate(cu.fechaPago) : "—"}</td>
                                    <td><Badge tone={cu.pagada ? "positive" : "warning"}>{cu.pagada ? "Pagada" : "Pendiente"}</Badge></td>
                                    <td style={{ display: "flex", gap: 4 }}>
                                      {!cu.pagada && <Button size="sm" variant="ghost" onClick={() => marcarPagada(cu.id)}>Marcar cobrada</Button>}
                                      {cu.comprobanteEmitido ? (
                                        <Badge tone="positive">Comprobante emitido</Badge>
                                      ) : (
                                        <Button size="sm" variant="ghost" onClick={() => setEmitiendo(cu)}>Emitir comprobante</Button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {creating && <NuevoCobroModal contactos={contactos} onClose={() => setCreating(false)} onSaved={load} />}
      {emitiendo && <EmitirComprobanteModal cuota={emitiendo} onClose={() => setEmitiendo(null)} onSaved={load} />}
    </div>
  );
}

function EmitirComprobanteModal({ cuota, onClose, onSaved }: { cuota: Cuota; onClose: () => void; onSaved: () => void }) {
  const [tipoComprobante, setTipoComprobante] = useState("Factura B");
  const [puntoVenta, setPuntoVenta] = useState("0001");
  const [error, setError] = useState<string | null>(null);

  async function emitir() {
    setError(null);
    try {
      await api.post(`/facturacion/cuotas/${cuota.id}/emitir-comprobante`, { tipoComprobante, puntoVenta });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <Modal title="Emitir comprobante (ARCA)" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p className="muted" style={{ fontSize: 13 }}>
          Reutiliza monto (<strong>{fmtMoney(cuota.monto)}</strong>) y fecha (<strong>{fmtDate(cuota.fecha)}</strong>) ya cargados en la cuota.
        </p>
        <div className="form-grid">
          <Field label="Tipo de comprobante">
            <Select value={tipoComprobante} onChange={(e) => setTipoComprobante(e.target.value)}>
              <option value="Factura A">Factura A</option>
              <option value="Factura B">Factura B</option>
              <option value="Factura C">Factura C</option>
            </Select>
          </Field>
          <Field label="Punto de venta"><Input value={puntoVenta} onChange={(e) => setPuntoVenta(e.target.value)} /></Field>
        </div>
        {error && <div className="badge badge-negative" style={{ width: "fit-content" }}>{error}</div>}
        <Button variant="primary" onClick={emitir}>Emitir</Button>
      </div>
    </Modal>
  );
}

function NuevoCobroModal({ contactos, onClose, onSaved }: { contactos: ContactoLite[]; onClose: () => void; onSaved: () => void }) {
  const [contactoId, setContactoId] = useState("");
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [gananciaTotal, setGananciaTotal] = useState(0);
  const [cuotas, setCuotas] = useState([{ numero: 1, fecha: new Date().toISOString().slice(0, 10), monto: 0, costos: 0, gastos: 0 }]);
  const [error, setError] = useState<string | null>(null);

  function addCuota() {
    setCuotas([...cuotas, { numero: cuotas.length + 1, fecha: new Date().toISOString().slice(0, 10), monto: 0, costos: 0, gastos: 0 }]);
  }
  function updateCuota(idx: number, patch: Partial<(typeof cuotas)[0]>) {
    const next = cuotas.slice();
    next[idx] = { ...next[idx], ...patch };
    setCuotas(next);
  }

  async function save() {
    setError(null);
    try {
      await api.post("/facturacion/cobros", { contactoId, concepto, categoria, gananciaTotal, cuotas });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <Modal title="Nueva venta / cobro" onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="form-grid">
          <Field label="Cliente">
            <Select value={contactoId} onChange={(e) => setContactoId(e.target.value)}>
              <option value="">Elegir…</option>
              {contactos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
          </Field>
          <Field label="Concepto"><Input value={concepto} onChange={(e) => setConcepto(e.target.value)} /></Field>
          <Field label="Categoría (para el dashboard)"><Input value={categoria} onChange={(e) => setCategoria(e.target.value)} /></Field>
          <Field label="Ganancia total"><Input type="number" value={gananciaTotal} onChange={(e) => setGananciaTotal(Number(e.target.value))} /></Field>
        </div>

        <Field label="Cuotas">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {cuotas.map((cu, idx) => (
              <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span className="muted" style={{ fontSize: 12, width: 24 }}>#{cu.numero}</span>
                <Input type="date" value={cu.fecha} onChange={(e) => updateCuota(idx, { fecha: e.target.value })} />
                <Input type="number" placeholder="Monto" value={cu.monto} onChange={(e) => updateCuota(idx, { monto: Number(e.target.value) })} />
                <Input type="number" placeholder="Costos" value={cu.costos} onChange={(e) => updateCuota(idx, { costos: Number(e.target.value) })} />
                <Input type="number" placeholder="Gastos" value={cu.gastos} onChange={(e) => updateCuota(idx, { gastos: Number(e.target.value) })} />
              </div>
            ))}
            <Button size="sm" variant="secondary" style={{ width: "fit-content" }} onClick={addCuota}>+ Agregar cuota</Button>
            <p className="muted" style={{ fontSize: 12 }}>Costos y gastos se cargan una sola vez por venta, no repetidos en cada cuota.</p>
          </div>
        </Field>

        {error && <div className="badge badge-negative" style={{ width: "fit-content" }}>{error}</div>}
        <Button variant="primary" onClick={save} disabled={!contactoId || !concepto}>Guardar</Button>
      </div>
    </Modal>
  );
}

function ArcaTab() {
  const [config, setConfig] = useState<ArcaConfig | null>(null);
  useEffect(() => { api.get<ArcaConfig>("/facturacion/arca/config").then(setConfig); }, []);
  if (!config) return null;

  async function save() {
    const updated = await api.put<ArcaConfig>("/facturacion/arca/config", config);
    setConfig(updated);
  }

  return (
    <Card title="Vinculación con ARCA">
      <div className="form-grid">
        <Field label="CUIT del estudio">
          <Input value={config.cuitEstudio || ""} onChange={(e) => setConfig({ ...config, cuitEstudio: e.target.value })} />
        </Field>
        <Field label="Punto de venta">
          <Input value={config.puntoVentaDefault || ""} onChange={(e) => setConfig({ ...config, puntoVentaDefault: e.target.value })} />
        </Field>
      </div>
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={config.cuentaVinculada} onChange={(e) => setConfig({ ...config, cuentaVinculada: e.target.checked })} />
        <span style={{ fontSize: 14 }}>Cuenta fiscal vinculada con ARCA</span>
      </div>
      <Button variant="primary" onClick={save} style={{ marginTop: 12 }}>Guardar</Button>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>
        Una vez vinculada la cuenta, podés emitir comprobantes desde cada cuota ya cargada en Facturación.
      </p>
    </Card>
  );
}
