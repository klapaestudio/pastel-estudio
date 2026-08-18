import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { fmtMoney } from "../../lib/format";
import { Badge, Card, Input } from "../../components/ui";

interface Material {
  id: string;
  nombre: string;
  unidad: string;
  costoActualizado: number;
  stockEstado: string;
}

const stockTone = (e: string): "negative" | "warning" | "positive" =>
  e === "SIN_STOCK" ? "negative" : e === "QUEDANDO_SIN_STOCK" ? "warning" : "positive";
const stockLabel = (e: string) => (e === "SIN_STOCK" ? "Sin stock" : e === "QUEDANDO_SIN_STOCK" ? "Quedando sin stock" : "Hay stock");

// Consulta en tiempo real de stock y precio de materiales cargados en Proveedores (4.6, 4.8).
export function StockChecker() {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    api.get<Material[]>("/proveedores/materiales/all").then(setMateriales);
  }, []);

  const filtrados = materiales.filter((m) => m.nombre.toLowerCase().includes(q.toLowerCase()));

  return (
    <Card title="Stock y precios de materiales" description="Consulta en vivo contra Proveedores.">
      <Input placeholder="Buscar material…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto" }}>
        {filtrados.length === 0 && <p className="muted" style={{ fontSize: 12.5 }}>Sin materiales cargados todavía.</p>}
        {filtrados.map((m) => (
          <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.nombre}</div>
              <div className="muted mono" style={{ fontSize: 12 }}>{fmtMoney(m.costoActualizado)} / {m.unidad}</div>
            </div>
            <Badge tone={stockTone(m.stockEstado)}>{stockLabel(m.stockEstado)}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
