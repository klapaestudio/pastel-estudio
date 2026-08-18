import { Button, Select } from "../../components/ui";
import { etiquetaLabel } from "../../lib/format";
import { Etiqueta, LineaArquitectura, ServicioArquitectura, TipoProducto } from "../../lib/types";

export function EtiquetasEditor({ etiquetas, onChange }: { etiquetas: Etiqueta[]; onChange: (e: Etiqueta[]) => void }) {
  function addEtiqueta() {
    onChange([...etiquetas, { id: `tmp-${Date.now()}`, tipoProducto: "COLECCION" }]);
  }
  function update(idx: number, patch: Partial<Etiqueta>) {
    const next = etiquetas.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  }
  function remove(idx: number) {
    onChange(etiquetas.filter((_, i) => i !== idx));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {etiquetas.map((et, idx) => (
        <div key={et.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Select
            value={et.tipoProducto}
            onChange={(e) => update(idx, { tipoProducto: e.target.value as TipoProducto, linea: undefined, servicio: undefined })}
            style={{ maxWidth: 170 }}
          >
            <option value="COLECCION">Colección</option>
            <option value="PERSONALIZADO">Personalizado</option>
            <option value="ARQUITECTURA">Arquitectura</option>
          </Select>
          {et.tipoProducto === "ARQUITECTURA" && (
            <>
              <Select
                value={et.linea || ""}
                onChange={(e) => update(idx, { linea: (e.target.value || undefined) as LineaArquitectura | undefined })}
                style={{ maxWidth: 150 }}
              >
                <option value="">Línea…</option>
                <option value="RESIDENCIAL">Residencial</option>
                <option value="COMERCIAL">Comercial</option>
              </Select>
              <Select
                value={et.servicio || ""}
                onChange={(e) => update(idx, { servicio: (e.target.value || undefined) as ServicioArquitectura | undefined })}
                style={{ maxWidth: 190 }}
              >
                <option value="">Servicio…</option>
                <option value="ASESORAMIENTO">Asesoramiento</option>
                <option value="PROYECTO_INTEGRAL">Proyecto integral</option>
                <option value="PROYECTO_OBRA">Proyecto + obra</option>
              </Select>
            </>
          )}
          <Button variant="ghost" size="sm" type="button" onClick={() => remove(idx)}>
            ✕
          </Button>
        </div>
      ))}
      <Button variant="secondary" size="sm" type="button" onClick={addEtiqueta} style={{ width: "fit-content" }}>
        + Agregar etiqueta
      </Button>
      {etiquetas.length > 0 && (
        <div className="chip-row">
          {etiquetas.map((e) => (
            <span key={e.id} className="badge badge-neutral">
              {etiquetaLabel(e)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
