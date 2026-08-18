import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Input } from "../../components/ui";

interface ContactoLite {
  id: string;
  nombre: string;
  etapa: string;
}

// Al escribir el nombre del prospecto, vincula automáticamente con su ficha en Prospectos (4.6).
export function ContactoAutocomplete({
  value,
  onSelect,
}: {
  value: { id: string; nombre: string } | null;
  onSelect: (c: ContactoLite | null) => void;
}) {
  const [q, setQ] = useState(value?.nombre || "");
  const [results, setResults] = useState<ContactoLite[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => setQ(value?.nombre || ""), [value?.id]);

  useEffect(() => {
    if (!open || q.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.get<ContactoLite[]>(`/contactos?q=${encodeURIComponent(q)}`).then(setResults);
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  return (
    <div style={{ position: "relative" }}>
      <Input
        placeholder="Buscar prospecto/cliente por nombre…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          if (!e.target.value) onSelect(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && results.length > 0 && (
        <div className="card" style={{ position: "absolute", zIndex: 10, top: "100%", left: 0, right: 0, padding: 6, marginTop: 4 }}>
          {results.map((r) => (
            <div
              key={r.id}
              style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer" }}
              onMouseDown={() => {
                onSelect(r);
                setQ(r.nombre);
                setOpen(false);
              }}
            >
              {r.nombre} <span className="muted" style={{ fontSize: 12 }}>({r.etapa === "PROSPECTO" ? "prospecto" : "cliente"})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
