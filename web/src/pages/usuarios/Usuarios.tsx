import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select } from "../../components/ui";

interface Usuario { id: string; email: string; nombre: string; role: string; activo: boolean; contactoId?: string | null; }
interface ContactoLite { id: string; nombre: string; }

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin — todos los módulos",
  VENTAS: "Ventas / CRM",
  TALLER: "Taller / producción",
  FINANZAS: "Finanzas",
  CLIENTE: "Cliente (portal de arquitectura)",
};

export default function Usuarios() {
  const [list, setList] = useState<Usuario[]>([]);
  const [contactos, setContactos] = useState<ContactoLite[]>([]);
  const [editing, setEditing] = useState<Usuario | "new" | null>(null);
  const load = () => api.get<Usuario[]>("/usuarios").then(setList);
  useEffect(() => { load(); api.get<ContactoLite[]>("/contactos?etapa=CLIENTE").then(setContactos); }, []);

  async function toggleActivo(u: Usuario) {
    await api.put(`/usuarios/${u.id}`, { activo: !u.activo });
    load();
  }
  async function remove(id: string) {
    if (!confirm("¿Eliminar este usuario?")) return;
    await api.del(`/usuarios/${id}`);
    load();
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <p className="eyebrow">Administración</p>
          <h1 className="page-title">Usuarios y permisos</h1>
          <p className="page-subtitle">Roles con acceso diferenciado por módulo</p>
        </div>
        <Button variant="primary" onClick={() => setEditing("new")}>+ Nuevo usuario</Button>
      </div>
      <Card>
        {list.length === 0 ? <EmptyState>No hay usuarios cargados.</EmptyState> : (
          <table className="data-table">
            <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.nombre}</td>
                  <td>{u.email}</td>
                  <td>{ROLE_LABEL[u.role]}</td>
                  <td><Badge tone={u.activo ? "positive" : "neutral"}>{u.activo ? "Activo" : "Inactivo"}</Badge></td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>Editar</Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleActivo(u)}>{u.activo ? "Desactivar" : "Activar"}</Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(u.id)}>✕</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {editing && <UsuarioModal usuario={editing === "new" ? null : editing} contactos={contactos} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}

function UsuarioModal({ usuario, contactos, onClose, onSaved }: { usuario: Usuario | null; contactos: ContactoLite[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    email: usuario?.email || "", password: "", nombre: usuario?.nombre || "",
    role: usuario?.role || "VENTAS", contactoId: usuario?.contactoId || "",
  });
  async function save() {
    if (usuario) {
      const patch: any = { nombre: form.nombre, role: form.role, contactoId: form.contactoId || null };
      if (form.password) patch.password = form.password;
      await api.put(`/usuarios/${usuario.id}`, patch);
    } else {
      await api.post("/usuarios", form);
    }
    onSaved();
    onClose();
  }
  return (
    <Modal title={usuario ? "Editar usuario" : "Nuevo usuario"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="form-grid">
          <Field label="Nombre"><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email} disabled={!!usuario} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label={usuario ? "Nueva contraseña (opcional)" : "Contraseña"}>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Rol">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          {form.role === "CLIENTE" && (
            <Field label="Cliente vinculado (portal)">
              <Select value={form.contactoId} onChange={(e) => setForm({ ...form, contactoId: e.target.value })}>
                <option value="">—</option>
                {contactos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </Select>
            </Field>
          )}
        </div>
        <Button variant="primary" onClick={save} disabled={!form.nombre || !form.email || (!usuario && !form.password)}>Guardar</Button>
      </div>
    </Modal>
  );
}
