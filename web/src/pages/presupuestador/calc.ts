import { PresupuestoItem, ValorAdicional } from "../../lib/types";

export function calcItem(it: PresupuestoItem) {
  const costoTela = (it.cantidadTela || 0) * (it.precioTelaMetro || 0);
  const costoUnitario =
    costoTela +
    (it.manoObraEstructura || 0) +
    (it.manoObraTapiceria || 0) +
    (it.materialesCosto || 0) +
    (it.costoDiseno || 0) +
    (it.honorariosCosto || 0) +
    (it.gastosVarios || 0);
  const subtotalVenta = (it.unidades || 0) * (it.precioUnidad || 0);
  const margenUnitario = (it.precioUnidad || 0) - costoUnitario;
  const margenTotal = subtotalVenta - costoUnitario * (it.unidades || 0);
  return { costoTela, costoUnitario, subtotalVenta, margenUnitario, margenTotal };
}

export function calcPresupuesto(items: PresupuestoItem[], envioCosto: number, valoresAdicionales: ValorAdicional[] = []) {
  const calcs = items.map(calcItem);
  const subtotalVenta = calcs.reduce((s, c) => s + c.subtotalVenta, 0);
  const margenTotal = calcs.reduce((s, c) => s + c.margenTotal, 0);
  const totalValoresAdicionales = valoresAdicionales.reduce((s, v) => s + (v.monto || 0), 0);
  const costoTotal = subtotalVenta - margenTotal;
  const total = subtotalVenta + totalValoresAdicionales + (envioCosto || 0);
  return { subtotalVenta, margenTotal, totalValoresAdicionales, costoTotal, total };
}

export function blankItem(): PresupuestoItem {
  return {
    producto: "",
    cantidadTela: 0,
    precioTelaMetro: 0,
    manoObraEstructura: 0,
    manoObraTapiceria: 0,
    manoObraEstado: "ESTIMATIVO",
    materialesCosto: 0,
    costoDiseno: 0,
    honorariosCosto: 0,
    gastosVarios: 0,
    unidades: 1,
    precioUnidad: 0,
  };
}
