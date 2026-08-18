import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Button, Card, EmptyState, Field, Input, Modal, Select, Textarea } from "../../components/ui";

interface Mensaje { id: string; titulo: string; texto: string; categoriaId: string; }
interface Categoria { id: string; nombre: string; orden: number; mensajes: Mensaje[]; }
interface ContactoLite { id: string; nombre: string; }

export default function Mensajes() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [contactos, setContactos] = useState<ContactoLite[]>([]);
  const [contactoSel, setContactoSel] = useState("");
  const [newCat, setNewCat] = useState("");
  const [editingMsg, setEditingMsg] = useState<{ categoriaId: string; mensaje: Mensaje | "new" } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = () => api.get<Categoria[]>("/mensajes/categorias").then(setCategorias);
  useEffect(() => { load(); api.get<ContactoLite[]>("/contactos").then(setContactos); }, []);

  async function addCategoria() {
    if (!newCat.trim()) return;
    await api.post("/mensajes/categorias", { nombre: newCat, orden: categorias.length });
    setNewCat("");
    load();
  }

  async function removeCategoria(id: string) {
    if (!confirm("¿Eliminar esta categoría y sus mensajes?")) return;
    await api.del(`/mensajes/categorias/${id}`);
    load();
  }

  async function removeMensaje(id: string) {
    await api.del(`/mensajes/${id}`);
    load();
  }

  async function copiar(m: Mensaje) {
    let texto = m.texto;
    if (contactoSel) {
      const r = await api.post<{ texto: string }>(`/mensajes/${m.id}/resolver`, { contactoId: contactoSel });
      texto = r.texto;
    }
    await navigator.clipboard.writeText(texto);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <p className="eyebrow">Ventas</p>
          <h1 className="page-title">Mensajes prearmados</h1>
          <p className="page-subtitle">Biblioteca de textos por situación, con variables autocompletables</p>
        </div>
      </div>

      <Card title="Resolver variables contra un contacto (opcional)">
        <Select value={contactoSel} onChange={(e) => setContactoSel(e.target.value)} style={{ maxWidth: 320 }}>
          <option value="">Sin contacto — copiar tal cual</option>
          {contactos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </Select>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>Variables disponibles: {"{{nombre}}"}, {"{{producto}}"}, {"{{fecha}}"}, {"{{tela}}"}</p>
      </Card>

      <Card title="Nueva categoría">
        <div style={{ display: "flex", gap: 8 }}>
          <Input placeholder="Nombre de la categoría…" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <Button variant="primary" onClick={addCategoria}>Agregar</Button>
        </div>
      </Card>

      {categorias.map((cat) => (
        <Card
          key={cat.id}
          title={cat.nombre}
          actions={
            <div style={{ display: "flex", gap: 6 }}>
              <Button size="sm" variant="secondary" onClick={() => setEditingMsg({ categoriaId: cat.id, mensaje: "new" })}>+ Mensaje</Button>
              <Button size="sm" variant="ghost" onClick={() => removeCategoria(cat.id)}>Eliminar categoría</Button>
            </div>
          }
        >
          {cat.mensajes.length === 0 ? <EmptyState>Sin mensajes en esta categoría.</EmptyState> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cat.mensajes.map((m) => (
                <div key={m.id} className="card" style={{ background: "rgba(0,0,0,0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div>
                      <strong>{m.titulo}</strong>
                      <p style={{ fontSize: 13.5, marginTop: 6, whiteSpace: "pre-wrap" }}>{m.texto}</p>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <Button size="sm" variant="secondary" onClick={() => copiar(m)}>{copiedId === m.id ? "Copiado ✓" : "Copiar"}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingMsg({ categoriaId: cat.id, mensaje: m })}>Editar</Button>
                      <Button size="sm" variant="ghost" onClick={() => removeMensaje(m.id)}>✕</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}

      {editingMsg && (
        <MensajeModal
          categoriaId={editingMsg.categoriaId}
          mensaje={editingMsg.mensaje === "new" ? null : editingMsg.mensaje}
          onClose={() => setEditingMsg(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

function MensajeModal({ categoriaId, mensaje, onClose, onSaved }: { categoriaId: string; mensaje: Mensaje | null; onClose: () => void; onSaved: () => void }) {
  const [titulo, setTitulo] = useState(mensaje?.titulo || "");
  const [texto, setTexto] = useState(mensaje?.texto || "");

  async function save() {
    if (mensaje) await api.put(`/mensajes/${mensaje.id}`, { titulo, texto });
    else await api.post("/mensajes", { categoriaId, titulo, texto });
    onSaved();
    onClose();
  }

  return (
    <Modal title={mensaje ? "Editar mensaje" : "Nuevo mensaje"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Título"><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} /></Field>
        <Field label="Texto (podés usar {{nombre}}, {{producto}}, {{fecha}}, {{tela}})">
          <Textarea rows={5} value={texto} onChange={(e) => setTexto(e.target.value)} />
        </Field>
        <Button variant="primary" onClick={save} disabled={!titulo || !texto}>Guardar</Button>
      </div>
    </Modal>
  );
}
