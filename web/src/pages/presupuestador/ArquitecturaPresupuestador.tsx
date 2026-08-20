import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, downloadPresupuestoPdf, openPresupuestoPdf } from "../../lib/api";
import { fmtDate, fmtMoney, LINEA_LABEL, SERVICIO_LABEL } from "../../lib/format";
import { Presupuesto } from "../../lib/types";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Textarea } from "../../components/ui";
import { ContactoAutocomplete } from "./ContactoAutocomplete";
import { ValoresAdicionalesEditor } from "./ValoresAdicionalesEditor";
import { calcPresupuesto } from "./calc";

function estadoTone(estado: string): "positive" | "warning" | "negative" | "neutral" {
  if (estado === "APROBADO") return "positive";
  if (estado === "RECHAZADO") return "negative";
  if (estado === "ENVIADO") return "warning";
  return "neutral";
}

export default function ArquitecturaPresupuestador() {
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState<Presupuesto[]>([]);
  const editingId = params.get("id");
  const creatingContactoId = params.get("contactoId");
  const creatingNew = params.get("nuevo");

  const load = () => api.get<Presupuesto[]>("/presupuestos?tipo=ARQUITECTURA").then(setList);
  useEffect(() => { load(); }, []);

  if (editingId || creatingContactoId || creatingNew) {
    return (
      <ArquitecturaEditor
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
        number="08"
        eyebrow="Presupuestos"
        title="Proyectos de arquitectura"
        subtitle="Alcance, línea, servicio y costes del proyecto"
        actions={<Button variant="primary" onClick={() => setParams({ nuevo: "1" })}>+ Nuevo presupuesto</Button>}
      />

      <Card>
        {list.length === 0 ? <EmptyState>Todavía no armaste ningún presupuesto de arquitectura.</EmptyState> : (
          <table className="data-table">
            <thead><tr><th>Título</th><th>Cliente / Cliente potencial</th><th>Línea</th><th>Servicio</th><th>Fecha</th><th>Total</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.titulo}</td>
                  <td>{p.contacto?.nombre || "—"}</td>
                  <td>{p.linea ? LINEA_LABEL[p.linea] : "—"}</td>
                  <td>{p.servicio ? SERVICIO_LABEL[p.servicio] : "—"}</td>
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
  tipo: "ARQUITECTURA",
  titulo: "",
  estado: "BORRADOR",
  envioCosto: 0,
  plantillaPdf: "CLASICA",
  items: [],
  valoresAdicionales: [{ concepto: "Empleado de diseño", monto: 0 }],
});

function ArquitecturaEditor({ id, contactoId, onClose }: { id: string | null; contactoId: string | null; onClose: () => void }) {
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

  const totales = calcPresupuesto([], 0, form.valoresAdicionales || []);

  async function save() {
    setSaving(true);
    try {
      const payload = { ...form, contactoId: contacto?.id || null, items: [] };
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
        eyebrow="Arquitectura"
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
              <Field label="Línea">
                <Select value={form.linea || ""} onChange={(e) => set("linea", e.target.value as any)}>
                  <option value="">—</option>
                  <option value="RESIDENCIAL">Residencial</option>
                  <option value="COMERCIAL">Comercial</option>
                </Select>
              </Field>
              <Field label="Servicio">
                <Select value={form.servicio || ""} onChange={(e) => set("servicio", e.target.value as any)}>
                  <option value="">—</option>
                  <option value="ASESORAMIENTO">Asesoramiento</option>
                  <option value="PROYECTO_INTEGRAL">Proyecto integral</option>
                  <option value="PROYECTO_OBRA">Proyecto + obra</option>
                </Select>
              </Field>
              <Field label="Estado">
                <Select value={form.estado} onChange={(e) => set("estado", e.target.value as any)}>
                  <option value="BORRADOR">Borrador</option>
                  <option value="ENVIADO">Enviado</option>
                  <option value="APROBADO">Aprobado</option>
                  <option value="RECHAZADO">Rechazado</option>
                </Select>
              </Field>
            </div>
          </Card>

          <Card title="Alcance del proyecto">
            <Textarea rows={4} value={form.alcance || ""} onChange={(e) => set("alcance", e.target.value)} placeholder="Descripción del alcance: qué incluye el proyecto…" />
          </Card>

          <Card title="Costes del proyecto">
            <ValoresAdicionalesEditor
              label="Ítems de costo (podés seguir agregando valores a considerar)"
              addLabel="+ Agregar coste"
              valores={form.valoresAdicionales || []}
              onChange={(v) => set("valoresAdicionales", v as any)}
            />
          </Card>

          <Card title="Notas">
            <Textarea value={form.notas || ""} onChange={(e) => set("notas", e.target.value)} />
          </Card>
        </div>

        <div>
          <Card title="Calculadora interna" description="Solo para el equipo — nunca se envía al cliente.">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Row label="Costes del proyecto" value={fmtMoney(totales.totalValoresAdicionales)} />
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
