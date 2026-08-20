import { useEffect, useState } from "react";
import { format, isSameDay, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { api } from "../../lib/api";
import { fmtDate, fmtHora, PRIORIDAD_BADGE_TONE, PRIORIDAD_LABEL, toInputDate } from "../../lib/format";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Tabs, Textarea } from "../../components/ui";
import {
  asignarLanes,
  avanzar,
  bloquePosicion,
  diasDeMes,
  diasDeSemana,
  HORAS_GRILLA,
  HORA_FIN_GRILLA,
  HORA_INICIO_GRILLA,
  rangoVista,
  tituloPeriodo,
  Vista,
} from "./calendarUtils";

interface Tarea {
  id: string; titulo: string; tipo: string; fechaInicio: string; fechaFin: string;
  todoElDia: boolean; prioridad: string;
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
      <PageHeader number="02" eyebrow="General" title="Agenda" subtitle="Uso interno y franjas reservables por clientes" />
      <Tabs tabs={[{ key: "interna", label: "Agenda interna" }, { key: "cliente", label: "Franjas para clientes" }]} active={tab} onChange={setTab} />
      {tab === "interna" && <TareasTab />}
      {tab === "cliente" && <FranjasTab />}
    </div>
  );
}

// ── Agenda interna: calendario día / semana / mes ──────────────────────────

type ModalState = { mode: "create"; fecha: Date } | { mode: "edit"; id: string };

function TareasTab() {
  const [vista, setVista] = useState<Vista>("semana");
  const [cursor, setCursor] = useState(new Date());
  const [list, setList] = useState<Tarea[]>([]);
  const [contactos, setContactos] = useState<ContactoLite[]>([]);
  const [modal, setModal] = useState<ModalState | null>(null);

  function load() {
    const { desde, hasta } = rangoVista(vista, cursor);
    return api
      .get<Tarea[]>(`/agenda/tareas?desde=${desde.toISOString()}&hasta=${hasta.toISOString()}`)
      .then(setList);
  }

  useEffect(() => { load(); }, [vista, cursor.getTime()]);
  useEffect(() => { api.get<ContactoLite[]>("/contactos").then(setContactos); }, []);

  const onEdit = (t: Tarea) => setModal({ mode: "edit", id: t.id });
  const onSelectDay = (d: Date) => { setCursor(d); setVista("dia"); };

  const editingTarea = modal?.mode === "edit" ? list.find((t) => t.id === modal.id) ?? null : null;

  return (
    <div>
      <div className="cal-toolbar">
        <div className="cal-nav">
          <Button size="sm" variant="ghost" onClick={() => setCursor(new Date())}>Hoy</Button>
          <Button size="sm" variant="ghost" onClick={() => setCursor(avanzar(vista, cursor, -1))}>‹</Button>
          <Button size="sm" variant="ghost" onClick={() => setCursor(avanzar(vista, cursor, 1))}>›</Button>
          <span className="cal-title">{tituloPeriodo(vista, cursor)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Tabs
            tabs={[{ key: "dia", label: "Día" }, { key: "semana", label: "Semana" }, { key: "mes", label: "Mes" }]}
            active={vista}
            onChange={(v) => setVista(v as Vista)}
          />
          <Button variant="primary" onClick={() => setModal({ mode: "create", fecha: cursor })}>+ Nueva tarea</Button>
        </div>
      </div>

      {vista === "dia" && <DayView cursor={cursor} tareas={list} onEdit={onEdit} />}
      {vista === "semana" && <WeekView cursor={cursor} tareas={list} onEdit={onEdit} onSelectDay={onSelectDay} />}
      {vista === "mes" && <MonthView cursor={cursor} tareas={list} onEdit={onEdit} onSelectDay={onSelectDay} />}

      {modal && (
        <TareaModal
          key={modal.mode === "edit" ? modal.id : "new"}
          tarea={editingTarea}
          defaultFecha={modal.mode === "create" ? modal.fecha : undefined}
          contactos={contactos}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

function TareaChip({ t, onClick, showTime }: { t: Tarea; onClick: () => void; showTime?: boolean }) {
  return (
    <span
      className={`cal-allday-chip cal-prioridad-${t.prioridad.toLowerCase()}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={t.titulo}
    >
      {showTime && !t.todoElDia ? `${fmtHora(t.fechaInicio)} ` : ""}{t.titulo}
    </span>
  );
}

function HourLabelsColumn({ rowH }: { rowH: number }) {
  return (
    <div className="cal-hour-labels" style={{ height: HORAS_GRILLA.length * rowH }}>
      {HORAS_GRILLA.map((h) => (
        <div key={h} className="cal-hour-label" style={{ top: (h - HORA_INICIO_GRILLA) * rowH }}>
          {String(h).padStart(2, "0")}:00
        </div>
      ))}
    </div>
  );
}

function HourGridColumn({ tareasDia, rowH, onEdit }: { tareasDia: Tarea[]; rowH: number; onEdit: (t: Tarea) => void }) {
  const conHorario = tareasDia.filter((t) => !t.todoElDia);
  const lanes = asignarLanes(conHorario);
  return (
    <div className="cal-day-col" style={{ height: HORAS_GRILLA.length * rowH }}>
      {HORAS_GRILLA.map((h) => (
        <div key={h} className="cal-hour-line" style={{ top: (h - HORA_INICIO_GRILLA) * rowH }} />
      ))}
      {conHorario.map((t) => {
        const { top, height } = bloquePosicion(t, rowH);
        const { lane, lanes: n } = lanes[t.id] || { lane: 0, lanes: 1 };
        return (
          <div
            key={t.id}
            className={`cal-block cal-prioridad-${t.prioridad.toLowerCase()}`}
            style={{ top, height, left: `${(lane / n) * 100}%`, width: `calc(${100 / n}% - 3px)` }}
            onClick={() => onEdit(t)}
            title={t.titulo}
          >
            <strong>{t.titulo}</strong>
            {height >= 34 && <span className="cal-block-time">{fmtHora(t.fechaInicio)}–{fmtHora(t.fechaFin)}</span>}
          </div>
        );
      })}
    </div>
  );
}

function DayView({ cursor, tareas, onEdit }: { cursor: Date; tareas: Tarea[]; onEdit: (t: Tarea) => void }) {
  const delDia = tareas.filter((t) => isSameDay(new Date(t.fechaInicio), cursor));
  const todoElDia = delDia.filter((t) => t.todoElDia);
  const ROW_H = 52;
  return (
    <div>
      <Card title={`Tareas del día (${todoElDia.length})`}>
        {todoElDia.length === 0 ? (
          <EmptyState>Sin tareas de todo el día.</EmptyState>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todoElDia.map((t) => (
              <div key={t.id} className="alert-row" onClick={() => onEdit(t)}>
                <div>
                  <strong>{t.titulo}</strong>
                  {t.contacto && <div className="muted" style={{ fontSize: 12.5 }}>{t.contacto.nombre}</div>}
                </div>
                <Badge tone={PRIORIDAD_BADGE_TONE[t.prioridad]}>{PRIORIDAD_LABEL[t.prioridad]}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card title={`Horario (${HORA_INICIO_GRILLA}:00 a ${HORA_FIN_GRILLA}:00)`}>
        <div style={{ display: "flex" }}>
          <HourLabelsColumn rowH={ROW_H} />
          <HourGridColumn tareasDia={delDia} rowH={ROW_H} onEdit={onEdit} />
        </div>
      </Card>
    </div>
  );
}

function WeekView({ cursor, tareas, onEdit, onSelectDay }: { cursor: Date; tareas: Tarea[]; onEdit: (t: Tarea) => void; onSelectDay: (d: Date) => void }) {
  const dias = diasDeSemana(cursor);
  const hoy = new Date();
  const ROW_H = 40;
  return (
    <Card>
      <div style={{ display: "flex" }}>
        <div className="cal-allday-spacer" />
        <div className="cal-week-cols">
          {dias.map((d) => (
            <div key={d.toISOString()} className={`cal-week-header-cell ${isSameDay(d, hoy) ? "today" : ""}`} onClick={() => onSelectDay(d)}>
              <div className="cal-week-header-day">{format(d, "EEE", { locale: es })}</div>
              <div className="cal-week-header-date">{format(d, "d")}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="cal-allday-row">
        <div className="cal-allday-spacer" />
        <div className="cal-week-cols">
          {dias.map((d) => {
            const chips = tareas.filter((t) => t.todoElDia && isSameDay(new Date(t.fechaInicio), d));
            return (
              <div key={d.toISOString()} className="cal-allday-cell">
                {chips.map((t) => <TareaChip key={t.id} t={t} onClick={() => onEdit(t)} />)}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex" }}>
        <HourLabelsColumn rowH={ROW_H} />
        <div className="cal-week-cols">
          {dias.map((d) => (
            <HourGridColumn
              key={d.toISOString()}
              tareasDia={tareas.filter((t) => isSameDay(new Date(t.fechaInicio), d))}
              rowH={ROW_H}
              onEdit={onEdit}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

function MonthView({ cursor, tareas, onEdit, onSelectDay }: { cursor: Date; tareas: Tarea[]; onEdit: (t: Tarea) => void; onSelectDay: (d: Date) => void }) {
  const dias = diasDeMes(cursor);
  const hoy = new Date();
  return (
    <Card>
      <div className="cal-month-grid">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => <div key={d} className="cal-month-daylabel">{d}</div>)}
        {dias.map((d) => {
          const delDia = tareas
            .filter((t) => isSameDay(new Date(t.fechaInicio), d))
            .sort((a, b) => {
              if (a.todoElDia !== b.todoElDia) return a.todoElDia ? -1 : 1;
              return new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime();
            });
          const visibles = delDia.slice(0, 3);
          const resto = delDia.length - visibles.length;
          return (
            <div
              key={d.toISOString()}
              className={`cal-month-cell ${isSameMonth(d, cursor) ? "" : "outside"} ${isSameDay(d, hoy) ? "today" : ""}`}
              onClick={() => onSelectDay(d)}
            >
              <span className="cal-month-cell-num">{format(d, "d")}</span>
              {visibles.map((t) => <TareaChip key={t.id} t={t} onClick={() => onEdit(t)} showTime />)}
              {resto > 0 && <span className="cal-month-more">+{resto} más</span>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Modal de creación / edición de tarea ────────────────────────────────────

function toInputTime(d: Date): string {
  return d.toTimeString().slice(0, 5);
}

interface TareaForm {
  titulo: string; tipo: string; contactoId: string; ubicacion: string; notas: string;
  prioridad: string; todoElDia: boolean; fecha: string; horaInicio: string; horaFin: string;
}

function TareaModal({ tarea, contactos, defaultFecha, onClose, onSaved }: {
  tarea: Tarea | null; contactos: ContactoLite[]; defaultFecha?: Date; onClose: () => void; onSaved: () => void;
}) {
  const editing = !!tarea;
  const [form, setForm] = useState<TareaForm>(() => {
    if (tarea) {
      const inicio = new Date(tarea.fechaInicio);
      const fin = new Date(tarea.fechaFin);
      return {
        titulo: tarea.titulo,
        tipo: tarea.tipo,
        contactoId: tarea.contacto?.id || "",
        ubicacion: tarea.ubicacion || "",
        notas: tarea.notas || "",
        prioridad: tarea.prioridad,
        todoElDia: tarea.todoElDia,
        fecha: toInputDate(inicio),
        horaInicio: toInputTime(inicio),
        horaFin: toInputTime(fin),
      };
    }
    const base = defaultFecha || new Date();
    return {
      titulo: "", tipo: "INTERNA", contactoId: "", ubicacion: "", notas: "",
      prioridad: "MEDIA", todoElDia: false,
      fecha: toInputDate(base), horaInicio: "09:00", horaFin: "10:00",
    };
  });

  async function save() {
    const fechaInicio = form.todoElDia ? `${form.fecha}T00:00:00` : `${form.fecha}T${form.horaInicio}:00`;
    const fechaFin = form.todoElDia ? `${form.fecha}T23:59:00` : `${form.fecha}T${form.horaFin}:00`;
    const payload = {
      titulo: form.titulo,
      tipo: form.tipo,
      contactoId: form.contactoId || null,
      ubicacion: form.ubicacion,
      notas: form.notas,
      prioridad: form.prioridad,
      todoElDia: form.todoElDia,
      fechaInicio,
      fechaFin,
    };
    if (editing) await api.put(`/agenda/tareas/${tarea!.id}`, payload);
    else await api.post("/agenda/tareas", payload);
    onSaved();
    onClose();
  }

  async function remove() {
    if (!tarea) return;
    if (!confirm("¿Eliminar esta tarea?")) return;
    await api.del(`/agenda/tareas/${tarea.id}`);
    onSaved();
    onClose();
  }

  return (
    <Modal title={editing ? "Editar tarea" : "Nueva tarea"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="form-grid">
          <Field label="Título"><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></Field>
          <Field label="Tipo">
            <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="INTERNA">Interna</option>
              <option value="CLIENTE_RESERVABLE">Reservable por cliente</option>
            </Select>
          </Field>
          <Field label="Prioridad">
            <Select value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })}>
              <option value="BAJA">Baja</option>
              <option value="MEDIA">Media</option>
              <option value="ALTA">Alta</option>
            </Select>
          </Field>
          <Field label="Cliente / cliente potencial (opcional)">
            <Select value={form.contactoId} onChange={(e) => setForm({ ...form, contactoId: e.target.value })}>
              <option value="">—</option>
              {contactos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
          </Field>
          <Field label="Ubicación"><Input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} /></Field>
          <Field label="Fecha"><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></Field>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600 }}>
          <input type="checkbox" checked={form.todoElDia} onChange={(e) => setForm({ ...form, todoElDia: e.target.checked })} />
          Todo el día (sin bloquear un horario puntual)
        </label>

        {!form.todoElDia && (
          <div className="form-grid">
            <Field label="Desde"><Input type="time" value={form.horaInicio} onChange={(e) => setForm({ ...form, horaInicio: e.target.value })} /></Field>
            <Field label="Hasta"><Input type="time" value={form.horaFin} onChange={(e) => setForm({ ...form, horaFin: e.target.value })} /></Field>
          </div>
        )}

        <Field label="Notas internas"><Textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></Field>

        {editing && tarea && <CronometroControls tarea={tarea} onChanged={onSaved} />}

        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          {editing ? <Button variant="danger" onClick={remove}>Eliminar</Button> : <span />}
          <Button
            variant="primary"
            onClick={save}
            disabled={!form.titulo || !form.fecha || (!form.todoElDia && (!form.horaInicio || !form.horaFin))}
          >
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function CronometroControls({ tarea, onChanged }: { tarea: Tarea; onChanged: () => void }) {
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  async function accion(accion: "play" | "pausa" | "stop") {
    await api.post(`/agenda/tareas/${tarea.id}/cronometro/${accion}`);
    onChanged();
  }

  const segundos = tarea.cronometroEstado === "CORRIENDO" && tarea.cronometroInicioTs
    ? tarea.cronometroSegundos + Math.floor((Date.now() - new Date(tarea.cronometroInicioTs).getTime()) / 1000)
    : tarea.cronometroSegundos;

  return (
    <div className="field">
      <label>Cronómetro</label>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{fmtSegundos(segundos)}</span>
        <Badge tone={tarea.cronometroEstado === "CORRIENDO" ? "positive" : tarea.cronometroEstado === "PAUSADO" ? "warning" : "neutral"}>
          {tarea.cronometroEstado}
        </Badge>
        <Button size="sm" variant="ghost" onClick={() => accion("play")}>▶</Button>
        <Button size="sm" variant="ghost" onClick={() => accion("pausa")}>❚❚</Button>
        <Button size="sm" variant="ghost" onClick={() => accion("stop")}>■</Button>
      </div>
    </div>
  );
}

// ── Franjas reservables por clientes (sin cambios) ──────────────────────────

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
