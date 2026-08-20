import { useState } from "react";
import { api } from "../../lib/api";
import { toInputDate } from "../../lib/format";
import { Contacto, Etiqueta } from "../../lib/types";
import { Button, Field, Input, Modal, Select, Textarea } from "../../components/ui";
import { EtiquetasEditor } from "./EtiquetasEditor";

export function ContactoModal({
  etapa,
  contacto,
  onClose,
  onSaved,
}: {
  etapa: "PROSPECTO" | "CLIENTE";
  contacto: Contacto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Contacto>>(
    contacto || { etapa, origen: "WHATSAPP_INSTAGRAM", estado: "A_PRESUPUESTAR", etiquetas: [] }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Contacto>(key: K, value: Contacto[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (contacto) {
        await api.put(`/contactos/${contacto.id}`, form);
      } else {
        await api.post("/contactos", form);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={contacto ? "Editar contacto" : etapa === "PROSPECTO" ? "Nuevo cliente potencial" : "Nuevo cliente"} onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="form-grid">
          <Field label="Nombre o razón social">
            <Input value={form.nombre || ""} onChange={(e) => set("nombre", e.target.value)} />
          </Field>
          <Field label="Teléfono">
            <Input value={form.telefono || ""} onChange={(e) => set("telefono", e.target.value)} />
          </Field>
          <Field label="Ciudad">
            <Input value={form.ciudad || ""} onChange={(e) => set("ciudad", e.target.value)} />
          </Field>
          <Field label="Provincia">
            <Input value={form.provincia || ""} onChange={(e) => set("provincia", e.target.value)} />
          </Field>
          <Field label="Perfil">
            <Select value={form.perfil || ""} onChange={(e) => set("perfil", e.target.value as any)}>
              <option value="">—</option>
              <option value="PARTICULAR">Particular</option>
              <option value="ARQUITECTO">Arquitecto</option>
              <option value="DISENADOR">Diseñador</option>
            </Select>
          </Field>
          <Field label="Origen">
            <Select value={form.origen} onChange={(e) => set("origen", e.target.value as any)}>
              <option value="WHATSAPP_INSTAGRAM">WhatsApp / Instagram</option>
              <option value="TIENDA_NUBE">Tienda Nube</option>
            </Select>
          </Field>
        </div>

        <Field label="Etiquetas (Colección / Personalizado / Arquitectura)">
          <EtiquetasEditor etiquetas={(form.etiquetas as Etiqueta[]) || []} onChange={(e) => set("etiquetas", e)} />
        </Field>

        {etapa === "PROSPECTO" && (
          <>
            <div className="form-grid">
              <Field label="Qué está pidiendo (texto libre)">
                <Input value={form.tagProductoServicio || ""} onChange={(e) => set("tagProductoServicio", e.target.value)} />
              </Field>
              <Field label="Tela y color">
                <Input value={form.telaColor || ""} onChange={(e) => set("telaColor", e.target.value)} />
              </Field>
              <Field label="Fecha de primer contacto">
                <Input type="date" value={toInputDate(form.fechaPrimerContacto)} onChange={(e) => set("fechaPrimerContacto", e.target.value as any)} />
              </Field>
              <Field label="Estado">
                <Select value={form.estado} onChange={(e) => set("estado", e.target.value as any)}>
                  <option value="A_PRESUPUESTAR">A presupuestar</option>
                  <option value="PRESU_ENVIADO">Presu enviado</option>
                  <option value="PRESU_APROBADO">Presu aprobado</option>
                  <option value="PRESU_RECHAZADO">Presu rechazado</option>
                  <option value="PRESU_POSTERGADO">Presu postergado</option>
                </Select>
              </Field>
              <Field label="Monto del presupuesto">
                <Input type="number" value={form.monto ?? 0} onChange={(e) => set("monto", Number(e.target.value) as any)} />
              </Field>
            </div>
          </>
        )}

        {etapa === "CLIENTE" && (
          <div className="form-grid">
            <Field label="Fecha de cierre de presupuesto">
              <Input type="date" value={toInputDate(form.fechaCierrePresupuesto)} onChange={(e) => set("fechaCierrePresupuesto", e.target.value as any)} />
            </Field>
            <Field label="Fecha de entrega">
              <Input type="date" value={toInputDate(form.fechaEntrega)} onChange={(e) => set("fechaEntrega", e.target.value as any)} />
            </Field>
            <Field label="Fecha de última compra">
              <Input type="date" value={toInputDate(form.fechaUltimaCompra)} onChange={(e) => set("fechaUltimaCompra", e.target.value as any)} />
            </Field>
            <Field label="Intervalo de recontacto (meses, opcional)">
              <Input
                type="number"
                value={form.intervaloRecontactoMeses ?? ""}
                onChange={(e) => set("intervaloRecontactoMeses", (e.target.value ? Number(e.target.value) : null) as any)}
              />
            </Field>
            <Field label="Monto">
              <Input type="number" value={form.monto ?? 0} onChange={(e) => set("monto", Number(e.target.value) as any)} />
            </Field>
          </div>
        )}

        <Field label="Notas / observaciones">
          <Textarea value={form.notas || ""} onChange={(e) => set("notas", e.target.value)} />
        </Field>

        {error && <div className="badge badge-negative" style={{ width: "fit-content" }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={saving || !form.nombre}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
