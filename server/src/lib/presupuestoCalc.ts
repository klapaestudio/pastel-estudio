// Cálculo de costos/venta de un item de presupuesto (4.1, 4.6).
// Colección: mano de obra (estructura+tapicería) + materiales.
// Personalizado: ídem + costo de diseño.
// Ambos suman envío antes de llegar al costo final (se suma a nivel de presupuesto, no de item).
// Arquitectura: honorarios + gastos varios como "costo" interno.

export interface ItemCalc {
  costoTela: number;
  costoUnitario: number;
  subtotalVenta: number;
  margenUnitario: number;
  margenTotal: number;
}

export function calcItem(it: {
  cantidadTela: number;
  precioTelaMetro: number;
  manoObraEstructura: number;
  manoObraTapiceria: number;
  materialesCosto: number;
  costoDiseno: number;
  honorariosCosto: number;
  gastosVarios: number;
  unidades: number;
  precioUnidad: number;
}): ItemCalc {
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
  return {
    costoTela: round2(costoTela),
    costoUnitario: round2(costoUnitario),
    subtotalVenta: round2(subtotalVenta),
    margenUnitario: round2(margenUnitario),
    margenTotal: round2(margenTotal),
  };
}

export function calcPresupuesto(
  items: ReturnType<typeof calcItem>[],
  envioCosto: number,
  valoresAdicionales: { monto: number }[] = []
) {
  const subtotalVenta = round2(items.reduce((s, i) => s + i.subtotalVenta, 0));
  const margenTotal = round2(items.reduce((s, i) => s + i.margenTotal, 0));
  const totalValoresAdicionales = round2(valoresAdicionales.reduce((s, v) => s + (v.monto || 0), 0));
  const costoTotal = round2(subtotalVenta - margenTotal);
  const total = round2(subtotalVenta + totalValoresAdicionales + (envioCosto || 0));
  return { subtotalVenta, margenTotal, totalValoresAdicionales, costoTotal, total };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
