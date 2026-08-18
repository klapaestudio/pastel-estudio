import { fmtMoney } from "../../lib/format";
import { ValorAdicional } from "../../lib/types";
import { Button, Input } from "../../components/ui";

export function ValoresAdicionalesEditor({
  label,
  addLabel,
  valores,
  onChange,
}: {
  label: string;
  addLabel: string;
  valores: ValorAdicional[];
  onChange: (v: ValorAdicional[]) => void;
}) {
  function update(idx: number, patch: Partial<ValorAdicional>) {
    const next = valores.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  }
  function add() {
    onChange([...valores, { concepto: "", monto: 0 }]);
  }
  function remove(idx: number) {
    onChange(valores.filter((_, i) => i !== idx));
  }
  const total = valores.reduce((s, v) => s + (v.monto || 0), 0);

  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: 8 }}>{label}</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {valores.map((v, idx) => (
          <div key={idx} style={{ display: "flex", gap: 6 }}>
            <Input placeholder="Concepto" value={v.concepto} onChange={(e) => update(idx, { concepto: e.target.value })} />
            <Input
              type="number"
              placeholder="Monto"
              style={{ maxWidth: 130 }}
              value={v.monto}
              onChange={(e) => update(idx, { monto: Number(e.target.value) })}
            />
            <Button size="sm" variant="ghost" onClick={() => remove(idx)}>✕</Button>
          </div>
        ))}
        <Button size="sm" variant="secondary" style={{ width: "fit-content" }} onClick={add}>{addLabel}</Button>
        {valores.length > 0 && (
          <div className="muted" style={{ fontSize: 12.5, textAlign: "right" }}>
            Subtotal: <strong className="mono">{fmtMoney(total)}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
