import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { fmtDate, fmtMoney } from "../../lib/format";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Tabs } from "../../components/ui";

interface Proveedor { id: string; nombre: string; tipo: string; ciudad?: string; telefono?: string; contacto?: string; notas?: string; }
interface Material { id: string; nombre: string; unidad: string; costoActualizado: number; stockEstado: string; proveedorId?: string; proveedor?: Proveedor; }
interface ManoObraTarifa { id: string; tipoTrabajo: string; costo: number; proveedorId?: string; proveedor?: Proveedor; }
interface Pago { id: string; proveedor: Proveedor; concepto: string; monto: number; fechaVencimiento: string; pagada: boolean; }

const stockTone = (e: string): "negative" | "warning" | "positive" =>
  e === "SIN_STOCK" ? "negative" : e === "QUEDANDO_SIN_STOCK" ? "warning" : "positive";
const stockLabel = (e: string) => (e === "SIN_STOCK" ? "Sin stock" : e === "QUEDANDO_SIN_STOCK" ? "Quedando sin stock" : "Hay stock");

export default function Proveedores() {
  const [tab, setTab] = useState("proveedores");
  return (
    <div>
      <PageHeader number="10" eyebrow="Producción" title="Proveedores" subtitle="Materiales, mano de obra, transporte y pagos" />
      <Tabs
        tabs={[
          { key: "proveedores", label: "Proveedores" },
          { key: "materiales", label: "Materiales" },
          { key: "manoobra", label: "Mano de obra" },
          { key: "pagos", label: "Pagos" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "proveedores" && <ProveedoresTab />}
      {tab === "materiales" && <MaterialesTab />}
      {tab === "manoobra" && <ManoObraTab />}
      {tab === "pagos" && <PagosTab />}
    </div>
  );
}

function ProveedoresTab() {
  const [list, setList] = useState<Proveedor[]>([]);
  const [editing, setEditing] = useState<Proveedor | "new" | null>(null);
  const load = () => api.get<Proveedor[]>("/proveedores").then(setList);
  useEffect(() => { load(); }, []);

  return (
    <Card actions={<Button size="sm" variant="primary" onClick={() => setEditing("new")}>+ Proveedor</Button>}>
      {list.length === 0 ? <EmptyState>No hay proveedores cargados.</EmptyState> : (
        <table className="data-table">
          <thead><tr><th>Nombre</th><th>Tipo</th><th>Ciudad</th><th>Teléfono</th><th></th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                <td>{p.tipo}</td>
                <td>{p.ciudad || "—"}</td>
                <td>{p.telefono || "—"}</td>
                <td><Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Editar</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editing && (
        <Modal title={editing === "new" ? "Nuevo proveedor" : "Editar proveedor"} onClose={() => setEditing(null)}>
          <ProveedorForm proveedor={editing === "new" ? null : editing} onSaved={() => { load(); setEditing(null); }} />
        </Modal>
      )}
    </Card>
  );
}

function ProveedorForm({ proveedor, onSaved }: { proveedor: Proveedor | null; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Proveedor>>(proveedor || { tipo: "MATERIAL" });
  async function save() {
    if (proveedor) await api.put(`/proveedores/${proveedor.id}`, form);
    else await api.post("/proveedores", form);
    onSaved();
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="form-grid">
        <Field label="Nombre"><Input value={form.nombre || ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field>
        <Field label="Tipo">
          <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="MATERIAL">Material</option>
            <option value="MANO_OBRA">Mano de obra</option>
            <option value="TRANSPORTE">Transporte</option>
          </Select>
        </Field>
        <Field label="Ciudad"><Input value={form.ciudad || ""} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} /></Field>
        <Field label="Teléfono"><Input value={form.telefono || ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></Field>
        <Field label="Contacto"><Input value={form.contacto || ""} onChange={(e) => setForm({ ...form, contacto: e.target.value })} /></Field>
      </div>
      <Button variant="primary" onClick={save} disabled={!form.nombre}>Guardar</Button>
    </div>
  );
}

function MaterialesTab() {
  const [list, setList] = useState<Material[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [editing, setEditing] = useState<Material | "new" | null>(null);
  const load = () => api.get<Material[]>("/proveedores/materiales/all").then(setList);
  useEffect(() => { load(); api.get<Proveedor[]>("/proveedores").then(setProveedores); }, []);

  return (
    <Card actions={<Button size="sm" variant="primary" onClick={() => setEditing("new")}>+ Material</Button>}>
      {list.length === 0 ? <EmptyState>No hay materiales cargados.</EmptyState> : (
        <table className="data-table">
          <thead><tr><th>Material</th><th>Proveedor</th><th>Costo</th><th>Stock</th><th></th></tr></thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id}>
                <td style={{ fontWeight: 600 }}>{m.nombre}</td>
                <td>{m.proveedor?.nombre || "—"}</td>
                <td className="mono">{fmtMoney(m.costoActualizado)} / {m.unidad}</td>
                <td><Badge tone={stockTone(m.stockEstado)}>{stockLabel(m.stockEstado)}</Badge></td>
                <td><Button size="sm" variant="ghost" onClick={() => setEditing(m)}>Editar</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editing && (
        <Modal title={editing === "new" ? "Nuevo material" : "Editar material"} onClose={() => setEditing(null)}>
          <MaterialForm material={editing === "new" ? null : editing} proveedores={proveedores} onSaved={() => { load(); setEditing(null); }} />
        </Modal>
      )}
    </Card>
  );
}

function MaterialForm({ material, proveedores, onSaved }: { material: Material | null; proveedores: Proveedor[]; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Material>>(material || { unidad: "m", stockEstado: "HAY_STOCK", costoActualizado: 0 });
  async function save() {
    if (material) await api.put(`/proveedores/materiales/${material.id}`, form);
    else await api.post("/proveedores/materiales", form);
    onSaved();
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="form-grid">
        <Field label="Nombre"><Input value={form.nombre || ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field>
        <Field label="Unidad"><Input value={form.unidad || ""} onChange={(e) => setForm({ ...form, unidad: e.target.value })} /></Field>
        <Field label="Costo actualizado"><Input type="number" value={form.costoActualizado ?? 0} onChange={(e) => setForm({ ...form, costoActualizado: Number(e.target.value) })} /></Field>
        <Field label="Proveedor">
          <Select value={form.proveedorId || ""} onChange={(e) => setForm({ ...form, proveedorId: e.target.value || undefined })}>
            <option value="">—</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Estado de stock">
          <Select value={form.stockEstado} onChange={(e) => setForm({ ...form, stockEstado: e.target.value })}>
            <option value="HAY_STOCK">Hay stock</option>
            <option value="QUEDANDO_SIN_STOCK">Quedando sin stock</option>
            <option value="SIN_STOCK">Sin stock</option>
          </Select>
        </Field>
      </div>
      <Button variant="primary" onClick={save} disabled={!form.nombre}>Guardar</Button>
    </div>
  );
}

function ManoObraTab() {
  const [list, setList] = useState<ManoObraTarifa[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [editing, setEditing] = useState<ManoObraTarifa | "new" | null>(null);
  const load = () => api.get<ManoObraTarifa[]>("/proveedores/mano-obra/all").then(setList);
  useEffect(() => { load(); api.get<Proveedor[]>("/proveedores").then(setProveedores); }, []);

  return (
    <Card actions={<Button size="sm" variant="primary" onClick={() => setEditing("new")}>+ Tarifa</Button>}>
      {list.length === 0 ? <EmptyState>No hay tarifas de mano de obra cargadas.</EmptyState> : (
        <table className="data-table">
          <thead><tr><th>Tipo de trabajo</th><th>Proveedor</th><th>Costo</th><th></th></tr></thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600 }}>{t.tipoTrabajo}</td>
                <td>{t.proveedor?.nombre || "—"}</td>
                <td className="mono">{fmtMoney(t.costo)}</td>
                <td><Button size="sm" variant="ghost" onClick={() => setEditing(t)}>Editar</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editing && (
        <Modal title={editing === "new" ? "Nueva tarifa" : "Editar tarifa"} onClose={() => setEditing(null)}>
          <ManoObraForm tarifa={editing === "new" ? null : editing} proveedores={proveedores} onSaved={() => { load(); setEditing(null); }} />
        </Modal>
      )}
    </Card>
  );
}

function ManoObraForm({ tarifa, proveedores, onSaved }: { tarifa: ManoObraTarifa | null; proveedores: Proveedor[]; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<ManoObraTarifa>>(tarifa || { costo: 0 });
  async function save() {
    if (tarifa) await api.put(`/proveedores/mano-obra/${tarifa.id}`, form);
    else await api.post("/proveedores/mano-obra", form);
    onSaved();
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="form-grid">
        <Field label="Tipo de trabajo"><Input value={form.tipoTrabajo || ""} onChange={(e) => setForm({ ...form, tipoTrabajo: e.target.value })} /></Field>
        <Field label="Costo"><Input type="number" value={form.costo ?? 0} onChange={(e) => setForm({ ...form, costo: Number(e.target.value) })} /></Field>
        <Field label="Proveedor">
          <Select value={form.proveedorId || ""} onChange={(e) => setForm({ ...form, proveedorId: e.target.value || undefined })}>
            <option value="">—</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Select>
        </Field>
      </div>
      <Button variant="primary" onClick={save} disabled={!form.tipoTrabajo}>Guardar</Button>
    </div>
  );
}

function PagosTab() {
  const [list, setList] = useState<Pago[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [editing, setEditing] = useState<"new" | null>(null);
  const load = () => api.get<Pago[]>("/proveedores/pagos/all").then(setList);
  useEffect(() => { load(); api.get<Proveedor[]>("/proveedores").then(setProveedores); }, []);

  async function marcarPagada(id: string) {
    await api.put(`/proveedores/pagos/${id}`, { pagada: true });
    load();
  }

  return (
    <Card actions={<Button size="sm" variant="primary" onClick={() => setEditing("new")}>+ Pago</Button>}>
      {list.length === 0 ? <EmptyState>No hay pagos cargados.</EmptyState> : (
        <table className="data-table">
          <thead><tr><th>Proveedor</th><th>Concepto</th><th>Monto</th><th>Vencimiento</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.proveedor?.nombre}</td>
                <td>{p.concepto}</td>
                <td className="mono">{fmtMoney(p.monto)}</td>
                <td>{fmtDate(p.fechaVencimiento)}</td>
                <td><Badge tone={p.pagada ? "positive" : "warning"}>{p.pagada ? "Pagado" : "Pendiente"}</Badge></td>
                <td>{!p.pagada && <Button size="sm" variant="ghost" onClick={() => marcarPagada(p.id)}>Marcar pagado</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editing && (
        <Modal title="Nuevo pago a proveedor" onClose={() => setEditing(null)}>
          <PagoForm proveedores={proveedores} onSaved={() => { load(); setEditing(null); }} />
        </Modal>
      )}
    </Card>
  );
}

function PagoForm({ proveedores, onSaved }: { proveedores: Proveedor[]; onSaved: () => void }) {
  const [form, setForm] = useState<{ proveedorId?: string; concepto?: string; monto?: number; fechaVencimiento?: string }>({});
  async function save() {
    await api.post("/proveedores/pagos", form);
    onSaved();
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="form-grid">
        <Field label="Proveedor">
          <Select value={form.proveedorId || ""} onChange={(e) => setForm({ ...form, proveedorId: e.target.value })}>
            <option value="">—</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Concepto"><Input value={form.concepto || ""} onChange={(e) => setForm({ ...form, concepto: e.target.value })} /></Field>
        <Field label="Monto"><Input type="number" value={form.monto ?? 0} onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })} /></Field>
        <Field label="Fecha de vencimiento"><Input type="date" value={form.fechaVencimiento || ""} onChange={(e) => setForm({ ...form, fechaVencimiento: e.target.value })} /></Field>
      </div>
      <Button variant="primary" onClick={save} disabled={!form.proveedorId || !form.concepto}>Guardar</Button>
    </div>
  );
}
