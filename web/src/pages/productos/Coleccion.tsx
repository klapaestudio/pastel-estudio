import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { fmtMoney } from "../../lib/format";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Tabs } from "../../components/ui";

interface Material { id: string; nombre: string; unidad: string; costoActualizado: number; stockEstado: string; }
interface ProductoMaterial { id?: string; materialId: string; cantidad: number; material?: Material; }
interface StockProducto { id: string; cantidad: number; tela?: string; embalaje: string; mensajePredefinido?: string; }
interface Producto {
  id: string; nombre: string; descripcion?: string; medidas?: string;
  manoObraEstructura: number; manoObraTapiceria: number; precioVenta: number;
  moldeFileNombre?: string; moldeFileData?: string; moldeUrl?: string;
  materiales: ProductoMaterial[]; stock: StockProducto[];
  costoCalculado: number; gananciaCalculada: number; stockMaterialesEstado: string;
}

const stockTone = (e: string): "negative" | "warning" | "positive" =>
  e === "SIN_STOCK" ? "negative" : e === "QUEDANDO_SIN_STOCK" ? "warning" : "positive";
const stockLabel = (e: string) => (e === "SIN_STOCK" ? "Sin stock" : e === "QUEDANDO_SIN_STOCK" ? "Quedando sin stock" : "Hay stock");

export default function Coleccion() {
  const [tab, setTab] = useState("productos");
  return (
    <div>
      <PageHeader number="09" eyebrow="Producción" title="Colección" subtitle="Fuente única de verdad de costos, precio de venta y ganancia" />
      <Tabs
        tabs={[
          { key: "productos", label: "Productos" },
          { key: "materiales", label: "Lista de materiales" },
          { key: "molderia", label: "Moldería" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "productos" && <ProductosTab />}
      {tab === "materiales" && <MaterialesTab />}
      {tab === "molderia" && <MolderiaTab />}
    </div>
  );
}

function ProductosTab() {
  const [list, setList] = useState<Producto[]>([]);
  const [editing, setEditing] = useState<Producto | "new" | null>(null);
  const [stockOf, setStockOf] = useState<Producto | null>(null);
  const load = () => api.get<Producto[]>("/productos").then(setList);
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("¿Eliminar este producto?")) return;
    await api.del(`/productos/${id}`);
    load();
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button variant="primary" onClick={() => setEditing("new")}>+ Nuevo producto</Button>
      </div>
      <Card>
        {list.length === 0 ? <EmptyState>No hay productos cargados todavía.</EmptyState> : (
          <table className="data-table">
            <thead><tr><th>Producto</th><th>Costo</th><th>Precio venta</th><th>Ganancia</th><th>Stock materiales</th><th>Stock terminado</th><th>Moldería</th><th></th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                  <td className="mono">{fmtMoney(p.costoCalculado)}</td>
                  <td className="mono">{fmtMoney(p.precioVenta)}</td>
                  <td className="mono">{fmtMoney(p.gananciaCalculada)}</td>
                  <td><Badge tone={stockTone(p.stockMaterialesEstado)}>{stockLabel(p.stockMaterialesEstado)}</Badge></td>
                  <td>{p.stock.reduce((s, x) => s + x.cantidad, 0)} u.</td>
                  <td>
                    {p.moldeUrl || p.moldeFileData ? (
                      <Badge tone="positive">Linkeada</Badge>
                    ) : (
                      <Badge tone="neutral">Sin linkear</Badge>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>Editar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setStockOf(p)}>Stock</Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>✕</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {editing && <ProductoModal producto={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={load} />}
      {stockOf && <StockModal producto={stockOf} onClose={() => setStockOf(null)} onSaved={load} />}
    </div>
  );
}

function ProductoModal({ producto, onClose, onSaved }: { producto: Producto | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Producto>>(producto || { manoObraEstructura: 0, manoObraTapiceria: 0, precioVenta: 0, materiales: [] });
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.get<Material[]>("/proveedores/materiales/all").then(setMateriales); }, []);

  const items = (form.materiales as ProductoMaterial[]) || [];
  function setItems(next: ProductoMaterial[]) { setForm((f) => ({ ...f, materiales: next })); }

  async function save() {
    setSaving(true);
    try {
      const payload = { ...form, materiales: items.map((i) => ({ materialId: i.materialId, cantidad: i.cantidad })) };
      if (producto) await api.put(`/productos/${producto.id}`, payload);
      else await api.post("/productos", payload);
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={producto ? "Editar producto" : "Nuevo producto"} onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="form-grid">
          <Field label="Nombre"><Input value={form.nombre || ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field>
          <Field label="Medidas"><Input value={form.medidas || ""} onChange={(e) => setForm({ ...form, medidas: e.target.value })} /></Field>
          <Field label="Mano de obra — estructura"><Input type="number" value={form.manoObraEstructura ?? 0} onChange={(e) => setForm({ ...form, manoObraEstructura: Number(e.target.value) })} /></Field>
          <Field label="Mano de obra — tapicería"><Input type="number" value={form.manoObraTapiceria ?? 0} onChange={(e) => setForm({ ...form, manoObraTapiceria: Number(e.target.value) })} /></Field>
          <Field label="Precio de venta"><Input type="number" value={form.precioVenta ?? 0} onChange={(e) => setForm({ ...form, precioVenta: Number(e.target.value) })} /></Field>
          <Field label="Link de moldería (Drive, Dropbox, etc.)">
            <Input
              type="url"
              placeholder="https://…"
              value={form.moldeUrl || ""}
              onChange={(e) => setForm({ ...form, moldeUrl: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Materiales">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map((it, idx) => (
              <div key={idx} style={{ display: "flex", gap: 6 }}>
                <Select
                  value={it.materialId}
                  onChange={(e) => { const next = items.slice(); next[idx] = { ...next[idx], materialId: e.target.value }; setItems(next); }}
                >
                  <option value="">Elegir material…</option>
                  {materiales.map((m) => <option key={m.id} value={m.id}>{m.nombre} (${m.costoActualizado}/{m.unidad})</option>)}
                </Select>
                <Input
                  type="number"
                  style={{ maxWidth: 110 }}
                  placeholder="Cantidad"
                  value={it.cantidad}
                  onChange={(e) => { const next = items.slice(); next[idx] = { ...next[idx], cantidad: Number(e.target.value) }; setItems(next); }}
                />
                <Button size="sm" variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}>✕</Button>
              </div>
            ))}
            <Button size="sm" variant="secondary" style={{ width: "fit-content" }} onClick={() => setItems([...items, { materialId: "", cantidad: 0 }])}>
              + Agregar material
            </Button>
          </div>
        </Field>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={saving || !form.nombre}>{saving ? "Guardando…" : "Guardar"}</Button>
        </div>
      </div>
    </Modal>
  );
}

function StockModal({ producto, onClose, onSaved }: { producto: Producto; onClose: () => void; onSaved: () => void }) {
  const [stock, setStock] = useState<StockProducto[]>(producto.stock);
  const [form, setForm] = useState<Partial<StockProducto>>({ cantidad: 0, embalaje: "SIMPLE" });

  async function reload() {
    const p = await api.get<Producto>(`/productos/${producto.id}`);
    setStock(p.stock);
  }

  async function add() {
    const mensajeDefault = `Hola! Sí, tenemos ${producto.nombre} disponible en stock, en tela ${form.tela || "a confirmar"}...`;
    await api.post(`/productos/${producto.id}/stock`, { ...form, mensajePredefinido: form.mensajePredefinido || mensajeDefault });
    setForm({ cantidad: 0, embalaje: "SIMPLE" });
    await reload();
    onSaved();
  }

  async function remove(id: string) {
    await api.del(`/productos/stock/${id}`);
    await reload();
    onSaved();
  }

  return (
    <Modal title={`Stock — ${producto.nombre}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {stock.map((s) => (
          <div key={s.id} className="card" style={{ background: "rgba(23,19,15,0.025)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <strong>{s.cantidad} unidades</strong> — {s.tela || "sin tela especificada"} — embalaje {s.embalaje}
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>✕</Button>
            </div>
            {s.mensajePredefinido && <p className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>{s.mensajePredefinido}</p>}
          </div>
        ))}
        <div className="form-grid">
          <Field label="Cantidad"><Input type="number" value={form.cantidad ?? 0} onChange={(e) => setForm({ ...form, cantidad: Number(e.target.value) })} /></Field>
          <Field label="Tela"><Input value={form.tela || ""} onChange={(e) => setForm({ ...form, tela: e.target.value })} /></Field>
          <Field label="Embalaje">
            <Select value={form.embalaje} onChange={(e) => setForm({ ...form, embalaje: e.target.value })}>
              <option value="SIMPLE">Simple</option>
              <option value="DOBLE">Doble</option>
            </Select>
          </Field>
        </div>
        <Button variant="primary" onClick={add}>+ Agregar ficha de stock</Button>
      </div>
    </Modal>
  );
}

function MaterialesTab() {
  const [list, setList] = useState<Material[]>([]);
  const [editing, setEditing] = useState<Material | "new" | null>(null);
  const load = () => api.get<Material[]>("/proveedores/materiales/all").then(setList);
  useEffect(() => { load(); }, []);

  return (
    <Card
      title="Lista de materiales"
      description="Material y costo actualizado — se usa para calcular el costo de cada producto."
      actions={<Button size="sm" variant="primary" onClick={() => setEditing("new")}>+ Material</Button>}
    >
      {list.length === 0 ? <EmptyState>No hay materiales cargados.</EmptyState> : (
        <table className="data-table">
          <thead><tr><th>Material</th><th>Costo actualizado</th><th></th></tr></thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id}>
                <td style={{ fontWeight: 600 }}>{m.nombre}</td>
                <td className="mono">{fmtMoney(m.costoActualizado)} / {m.unidad}</td>
                <td><Button size="sm" variant="ghost" onClick={() => setEditing(m)}>Editar</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editing && (
        <Modal title={editing === "new" ? "Nuevo material" : "Editar material"} onClose={() => setEditing(null)}>
          <MaterialForm material={editing === "new" ? null : editing} onSaved={() => { load(); setEditing(null); }} />
        </Modal>
      )}
    </Card>
  );
}

function MaterialForm({ material, onSaved }: { material: Material | null; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Material>>(material || { unidad: "m", costoActualizado: 0 });
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
      </div>
      <Button variant="primary" onClick={save} disabled={!form.nombre}>Guardar</Button>
    </div>
  );
}

function MolderiaTab() {
  const [list, setList] = useState<Producto[]>([]);
  const load = () => api.get<Producto[]>("/productos").then(setList);
  useEffect(() => { load(); }, []);

  function onFile(id: string, file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await api.put(`/productos/${id}`, { moldeFileNombre: file.name, moldeFileData: reader.result });
      load();
    };
    reader.readAsDataURL(file);
  }

  async function onLink(id: string, url: string, prev: string) {
    if (url === prev) return;
    await api.put(`/productos/${id}`, { moldeUrl: url });
    load();
  }

  return (
    <Card title="Moldería" description="Cada producto puede tener un link externo (Drive, Dropbox, etc.) y/o un archivo subido directamente.">
      {list.length === 0 ? <EmptyState>No hay productos cargados todavía.</EmptyState> : (
        <table className="data-table">
          <thead><tr><th>Producto</th><th>Link de moldería</th><th>Archivo</th><th></th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Input
                      key={p.id}
                      type="url"
                      placeholder="Pegar link…"
                      defaultValue={p.moldeUrl || ""}
                      onBlur={(e) => onLink(p.id, e.target.value, p.moldeUrl || "")}
                      style={{ maxWidth: 220 }}
                    />
                    {p.moldeUrl && <a className="link-accent" href={p.moldeUrl} target="_blank" rel="noreferrer">Abrir</a>}
                  </div>
                </td>
                <td>
                  {p.moldeFileData ? (
                    <a className="link-accent" href={p.moldeFileData} download={p.moldeFileNombre}>{p.moldeFileNombre}</a>
                  ) : (
                    <span className="muted">Sin archivo</span>
                  )}
                </td>
                <td><input type="file" onChange={(e) => onFile(p.id, e.target.files?.[0] || null)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
