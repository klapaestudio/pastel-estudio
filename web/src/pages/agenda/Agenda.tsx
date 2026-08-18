import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { fmtDate } from "../../lib/format";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Tabs, Textarea } from "../../components/ui";

interface Tarea {
  id: string; titulo: string; tipo: string; fechaInicio: string; fechaFin: string;
  ubicacion?: string; notas?: string; contacto?: { id: string; nombre: string };
  cronometroEstado: string; cronometroSegundos: number; cronometroInicioTs?: string | null;
}
interface Franja { id: string; fecha: string; horaInicio: string; horaFin: string; motivo?: string; }
interface ContactoLite { id: string; nombre: string; }

function fmtSegundos(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export default function Agenda() {
  const [tab, setTab] = useState("interna");
  return (
    <div>
      <div className="topbar">
        <div>
          <p className="eyebrow">Ventas</p>
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle">Uso interno y franjas reservables por clientes</p>
        </div>
      </div>
      <Tabs tabs={[{ key: "interna", label: "Agenda interna" }, { key: "cliente", label: "Franjas para clientes" }]} active={tab} onChange={setTab} />
      {tab === "interna" && <TareasTab />}
      {tab === "cliente" && <FranjasTab />}
    </div>
  );
}

function TareasTab() {
  const [list, setList] = useState<Tarea[]>([]);
  const [contactos, setContactos] = useState<ContactoLite[]>([]);
  const [creating, setCreating] = useState(false);
  const [, forceTick] = useState(0);

  const load = () => api.get<Tarea[]>("/agenda/tareas").then(setList);
  useEffect(() => { load(); api.get<ContactoLite[]>("/contactos").then(setContactos); }, []);

  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  async function accion(id: string, accion: "play" | "pausa" | "stop") {
    await api.post(`/agenda/tareas/${id}/cronometro/${accion}`);
    load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta tarea?")) return;
    await api.del(`/agenda/tareas/${id}`);
    load();
  }

  function segundosActuales(t: Tarea): number {
    if (t.cronometroEstado === "CORRIENDO" && t.cronometroInicioTs) {
      return t.cronometroSegundos + Math.floor((Date.now() - new Date(t.cronometroInicioTs).getTime()) / 1000);
    }
    return t.cronometroSegundos;
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button variant="primary" onClick={() => setCreating(true)}>+ Nueva tarea</Button>
      </div>
      <Card>
        {list.length === 0 ? <EmptyState>No hay tareas cargadas.</EmptyState> : (
          <table className="data-table">
            <thead><tr><th>Tarea</th><th>Cliente</th><th>Desde</th><th>Hasta</th><th>Cronómetro</th><th></th></tr></thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.titulo}<div className="muted" style={{ fontSize: 12 }}>{t.ubicacion}</div></td>
                  <td>{t.contacto?.nombre || "—"}</td>
                  <td>{fmtDate(t.fechaInicio)}</td>
                  <td>{fmtDate(t.fechaFin)}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="mono">{fmtSegundos(segundosActuales(t))}</span>
                      <Badge tone={t.cronometroEstado === "CORRIENDO" ? "positive" : t.cronometroEstado === "PAUSADO" ? "warning" : "neutral"}>{t.cronometroEstado}</Badge>
                    </div>
                    <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                      <Button size="sm" variant="ghost" onClick={() => accion(t.id, "play")}>▶</Button>
                      <Button size="sm" variant="ghost" onClick={() => accion(t.id, "pausa")}>❚❚</Button>
                      <Button size="sm" variant="ghost" onClick={() => accion(t.id, "stop")}>■</Button>
                    </div>
                  </td>
                  <td><Button size="sm" variant="ghost" onClick={() => remove(t.id)}>✕</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {creating && <TareaModal contactos={contactos} onClose={() => setCreating(false)} onSaved={load} />}
    </div>
  );
}

function TareaModal({ contactos, onClose, onSaved }: { contactos: ContactoLite[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ titulo: "", tipo: "INTERNA", contactoId: "", fechaInicio: "", fechaFin: "", ubicacion: "", notas: "" });
  async function save() {
    await api.post("/agenda/tareas", { ...form, contactoId: form.contactoId || null });
    onSaved();
    onClose();
  }
  return (
    <Modal title="Nueva tarea" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="form-grid">
          <Field label="Título"><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></Field>
          <Field label="Tipo">
            <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="INTERNA">Interna</option>
              <option value="CLIENTE_RESERVABLE">Reservable por cliente</option>
            </Select>
          </Field>
          <Field label="Cliente/prospecto (opcional)">
            <Select value={form.contactoId} onChange={(e) => setForm({ ...form, contactoId: e.target.value })}>
              <option value="">—</option>
              {contactos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
          </Field>
          <Field label="Ubicación"><Input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} /></Field>
          <Field label="Desde"><Input type="datetime-local" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} /></Field>
          <Field label="Hasta"><Input type="datetime-local" value={form.fechaFin} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} /></Field>
        </div>
        <Field label="Notas"><Textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></Field>
        <Button variant="primary" onClick={save} disabled={!form.titulo || !form.fechaInicio || !form.fechaFin}>Guardar</Button>
      </div>
    </Modal>
  );
}

function FranjasTab() {
  const [list, setList] = useState<Franja[]>([]);
  const [form, setForm] = useState({ fecha: "", horaInicio: "", horaFin: "", motivo: "" });
  const load = () => api.get<Franja[]>("/agenda/franjas-bloqueadas").then(setList);
  useEffect(() => { load(); }, []);

  async function add() {
    await api.post("/agenda/franjas-bloqueadas", form);
    setForm({ fecha: "", horaInicio: "", horaFin: "", motivo: "" });
    load();
  }
  async function remove(id: string) {
    await api.del(`/agenda/franjas-bloqueadas/${id}`);
    load();
  }

  return (
    <div>
      <Card title="Bloquear una franja horaria">
        <p className="muted" style={{ fontSize: 12.5, marginTop: -8, marginBottom: 12 }}>
          Los clientes no podrán reservar en estos horarios en su vista de agenda compartible.
        </p>
        <div className="form-grid">
          <Field label="Fecha"><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></Field>
          <Field label="Desde"><Input type="time" value={form.horaInicio} onChange={(e) => setForm({ ...form, horaInicio: e.target.value })} /></Field>
          <Field label="Hasta"><Input type="time" value={form.horaFin} onChange={(e) => setForm({ ...form, horaFin: e.target.value })} /></Field>
          <Field label="Motivo (opcional)"><Input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} /></Field>
        </div>
        <Button variant="primary" onClick={add} disabled={!form.fecha || !form.horaInicio || !form.horaFin} style={{ marginTop: 12 }}>Bloquear</Button>
      </Card>

      <Card title="Franjas bloqueadas">
        {list.length === 0 ? <EmptyState>No hay franjas bloqueadas.</EmptyState> : (
          <table className="data-table">
            <thead><tr><th>Fecha</th><th>Desde</th><th>Hasta</th><th>Motivo</th><th></th></tr></thead>
            <tbody>
              {list.map((f) => (
                <tr key={f.id}>
                  <td>{fmtDate(f.fecha)}</td><td>{f.horaInicio}</td><td>{f.horaFin}</td><td>{f.motivo || "—"}</td>
                  <td><Button size="sm" variant="ghost" onClick={() => remove(f.id)}>✕</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
