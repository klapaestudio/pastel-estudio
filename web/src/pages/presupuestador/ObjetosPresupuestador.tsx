import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, downloadPresupuestoPdf, openPresupuestoPdf } from "../../lib/api";
import { fmtDate, fmtMoney } from "../../lib/format";
import { Presupuesto, PresupuestoItem } from "../../lib/types";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Textarea } from "../../components/ui";
import { ContactoAutocomplete } from "./ContactoAutocomplete";
import { StockChecker } from "./StockChecker";
import { ValoresAdicionalesEditor } from "./ValoresAdicionalesEditor";
import { blankItem, calcItem, calcPresupuesto } from "./calc";

function estadoTone(estado: string): "positive" | "warning" | "negative" | "neutral" {
  if (estado === "APROBADO") return "positive";
  if (estado === "RECHAZADO") return "negative";
  if (estado === "ENVIADO") return "warning";
  return "neutral";
}

export default function ObjetosPresupuestador() {
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState<Presupuesto[]>([]);
  const editingId = params.get("id");
  const creatingContactoId = params.get("contactoId");
  const creatingNew = params.get("nuevo");

  const load = () => api.get<Presupuesto[]>("/presupuestos?tipo=OBJETO_PERSONALIZADO").then(setList);
  useEffect(() => { load(); }, []);

  if (editingId || creatingContactoId || creatingNew) {
    return (
      <ObjetoEditor
        id={editingId}
        contactoId={creatingContactoId}
        onClose={() => {
          params.delete("id"); params.delete("contactoId"); params.delete("nuevo");
          setParams(params);
          load();
        }}
      />
    );
  }

  return (
    <div>
      <PageHeader
        number="07"
        eyebrow="Presupuestos"
        title="Objetos personalizados"
        subtitle="Diseño, medidas, telas, mano de obra y materiales"
        actions={<Button variant="primary" onClick={() => setParams({ nuevo: "1" })}>+ Nuevo presupuesto</Button>}
      />

      <Card>
        {list.length === 0 ? <EmptyState>Todavía no armaste ningún presupuesto de objetos.</EmptyState> : (
          <table className="data-table">
            <thead><tr><th>Título</th><th>Cliente / Cliente potencial</th><th>Fecha</th><th>Total</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.titulo}</td>
                  <td>{p.contacto?.nombre || "—"}</td>
                  <td>{fmtDate(p.fecha)}</td>
                  <td className="mono">{fmtMoney(p.totales?.total)}</td>
                  <td><Badge tone={estadoTone(p.estado)}>{p.estado}</Badge></td>
                  <td><Button size="sm" variant="ghost" onClick={() => setParams({ id: p.id })}>Abrir</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

const emptyForm = (contactoId: string | null): Partial<Presupuesto> => ({
  contactoId: contactoId || null,
  tipo: "OBJETO_PERSONALIZADO",
  titulo: "",
  estado: "BORRADOR",
  envioTipo: "ESTIMATIVO",
  envioCosto: 0,
  envioEstado: "PENDIENTE",
  plantillaPdf: "CLASICA",
  items: [blankItem()],
  valoresAdicionales: [],
});

function ObjetoEditor({ id, contactoId, onClose }: { id: string | null; contactoId: string | null; onClose: () => void }) {
  const [form, setForm] = useState<Partial<Presupuesto>>(emptyForm(contactoId));
  const [contacto, setContacto] = useState<{ id: string; nombre: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      api.get<Presupuesto>(`/presupuestos/${id}`).then((p) => {
        setForm(p);
        if (p.contacto) setContacto(p.contacto);
      });
    } else if (contactoId) {
      api.get<{ id: string; nombre: string }>(`/contactos/${contactoId}`).then(setContacto);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function set<K extends keyof Presupuesto>(key: K, value: Presupuesto[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const items = (form.items as PresupuestoItem[]) || [];
  function setItems(next: PresupuestoItem[]) { setForm((f) => ({ ...f, items: next })); }
  function updateItem(idx: number, patch: Partial<PresupuestoItem>) {
    const next = items.slice();
    next[idx] = { ...next[idx], ...patch };
    setItems(next);
  }

  const totales = calcPresupuesto(items, form.envioCosto || 0, form.valoresAdicionales || []);

  async function save() {
    setSaving(true);
    try {
      const payload = { ...form, contactoId: contacto?.id || null };
      const saved = id ? await api.put<Presupuesto>(`/presupuestos/${id}`, payload) : await api.post<Presupuesto>(`/presupuestos`, payload);
      setForm(saved);
      alert("Presupuesto guardado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Objetos personalizados"
        title={id ? "Editar presupuesto" : "Nuevo presupuesto"}
        actions={<Button variant="ghost" onClick={onClose}>← Volver</Button>}
      />

      <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", alignItems: "start" }}>
        <div>
          <Card title="Datos generales">
            <div className="form-grid">
              <Field label="Cliente potencial / Cliente">
                <ContactoAutocomplete value={contacto} onSelect={setContacto} />
              </Field>
              <Field label="Título"><Input value={form.titulo || ""} onChange={(e) => set("titulo", e.target.value)} /></Field>
              <Field label="Estado">
                <Select value={form.estado} onChange={(e) => set("estado", e.target.value as any)}>
                  <option value="BORRADOR">Borrador</option>
                  <option value="ENVIADO">Enviado</option>
                  <option value="APROBADO">Aprobado</option>
                  <option value="RECHAZADO">Rechazado</option>
                </Select>
              </Field>
              {form.estado === "APROBADO" && (
                <Field label="Estado del envío">
                  <Select value={form.envioEstado} onChange={(e) => set("envioEstado", e.target.value as any)}>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="COORDINADO">Coordinado</option>
                    <option value="DESPACHADO">Despachado</option>
                  </Select>
                </Field>
              )}
            </div>
          </Card>

          <Card title={`Objetos (${items.length})`} actions={<Button size="sm" variant="secondary" onClick={() => setItems([...items, blankItem()])}>+ Objeto</Button>}>
            {items.map((it, idx) => {
              const c = calcItem(it);
              return (
                <div key={idx} className="card" style={{ marginBottom: 12, background: "rgba(23,19,15,0.025)" }}>
                  <Field label="Producto"><Input value={it.producto} onChange={(e) => updateItem(idx, { producto: e.target.value })} /></Field>
                  <div className="form-grid" style={{ marginTop: 12 }}>
                    <Field label="Diseño (costo)"><Input type="number" value={it.costoDiseno} onChange={(e) => updateItem(idx, { costoDiseno: Number(e.target.value) })} /></Field>
                    <Field label="Medidas"><Input value={it.medidas || ""} onChange={(e) => updateItem(idx, { medidas: e.target.value })} /></Field>
                    <Field label="Tela"><Input value={it.tela || ""} onChange={(e) => updateItem(idx, { tela: e.target.value })} /></Field>
                    <Field label="Color"><Input value={it.color || ""} onChange={(e) => updateItem(idx, { color: e.target.value })} /></Field>
                    <Field label="Cantidad de tela (m)"><Input type="number" value={it.cantidadTela} onChange={(e) => updateItem(idx, { cantidadTela: Number(e.target.value) })} /></Field>
                    <Field label="Precio tela / m"><Input type="number" value={it.precioTelaMetro} onChange={(e) => updateItem(idx, { precioTelaMetro: Number(e.target.value) })} /></Field>
                    <Field label="Mano de obra — estructura"><Input type="number" value={it.manoObraEstructura} onChange={(e) => updateItem(idx, { manoObraEstructura: Number(e.target.value) })} /></Field>
                    <Field label="Mano de obra — tapicería"><Input type="number" value={it.manoObraTapiceria} onChange={(e) => updateItem(idx, { manoObraTapiceria: Number(e.target.value) })} /></Field>
                    <Field label="Estado mano de obra">
                      <Select value={it.manoObraEstado} onChange={(e) => updateItem(idx, { manoObraEstado: e.target.value as any })}>
                        <option value="ESTIMATIVO">Estimativo</option>
                        <option value="DEFINIDO">Definido</option>
                      </Select>
                    </Field>
                    <Field label="Materiales (costo)"><Input type="number" value={it.materialesCosto} onChange={(e) => updateItem(idx, { materialesCosto: Number(e.target.value) })} /></Field>
                    <Field label="Unidades"><Input type="number" value={it.unidades} onChange={(e) => updateItem(idx, { unidades: Number(e.target.value) })} /></Field>
                    <Field label="Precio de venta / unidad"><Input type="number" value={it.precioUnidad} onChange={(e) => updateItem(idx, { precioUnidad: Number(e.target.value) })} /></Field>
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 13 }}>
                    <span className="muted">Costo unitario: <strong className="mono">{fmtMoney(c.costoUnitario)}</strong></span>
                    <span className="muted">Subtotal venta: <strong className="mono">{fmtMoney(c.subtotalVenta)}</strong></span>
                    <span className="muted">Margen: <strong className="mono">{fmtMoney(c.margenTotal)}</strong></span>
                    <Button size="sm" variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))} style={{ marginLeft: "auto" }}>Quitar</Button>
                  </div>
                </div>
              );
            })}
          </Card>

          <Card title="Envío, valores a considerar y notas">
            <div className="form-grid">
              <Field label="Tipo de envío">
                <Select value={form.envioTipo} onChange={(e) => set("envioTipo", e.target.value as any)}>
                  <option value="ESTIMATIVO">Estimativo</option>
                  <option value="DEFINIDO">Definido</option>
                </Select>
              </Field>
              <Field label="Costo de envío"><Input type="number" value={form.envioCosto || 0} onChange={(e) => set("envioCosto", Number(e.target.value) as any)} /></Field>
            </div>
            <div style={{ marginTop: 14 }}>
              <ValoresAdicionalesEditor
                label="Valores a considerar (extra)"
                addLabel="+ Agregar valor a considerar"
                valores={form.valoresAdicionales || []}
                onChange={(v) => set("valoresAdicionales", v as any)}
              />
            </div>
            <div style={{ marginTop: 14 }}>
              <Field label="Notas"><Textarea value={form.notas || ""} onChange={(e) => set("notas", e.target.value)} /></Field>
            </div>
          </Card>
        </div>

        <div>
          <Card title="Calculadora interna" description="Solo para el equipo — nunca se envía al cliente.">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Row label="Subtotal venta" value={fmtMoney(totales.subtotalVenta)} />
              <Row label="Costo total" value={fmtMoney(totales.costoTotal)} />
              <Row label="Valores a considerar" value={fmtMoney(totales.totalValoresAdicionales)} />
              <Row label="Envío" value={fmtMoney(form.envioCosto || 0)} />
              <Row label="Margen" value={fmtMoney(totales.margenTotal)} />
              <Row label="Total al cliente" value={fmtMoney(totales.total)} big />
            </div>
          </Card>

          <Card title="Plantilla de PDF">
            <Select value={form.plantillaPdf} onChange={(e) => set("plantillaPdf", e.target.value as any)}>
              <option value="CLASICA">Clásica</option>
              <option value="MINIMAL">Minimal</option>
              <option value="ACENTO">Acento</option>
            </Select>
            {id ? (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Button size="sm" variant="secondary" onClick={() => openPresupuestoPdf(id, form.plantillaPdf)}>Vista previa</Button>
                <Button size="sm" variant="secondary" onClick={() => downloadPresupuestoPdf(id, `${form.titulo || "presupuesto"}.pdf`, form.plantillaPdf)}>Descargar</Button>
              </div>
            ) : (
              <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>Guardá el presupuesto para exportarlo en PDF.</p>
            )}
          </Card>

          <StockChecker />

          <Button variant="primary" onClick={save} disabled={saving} style={{ width: "100%", marginTop: 4 }}>
            {saving ? "Guardando…" : "Guardar presupuesto"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span className="muted" style={{ fontSize: 13 }}>{label}</span>
      {big ? <Badge tone="accent">{value}</Badge> : <span className="mono" style={{ fontWeight: 700 }}>{value}</span>}
    </div>
  );
}
