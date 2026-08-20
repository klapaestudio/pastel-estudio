import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../lib/api";
import { fmtMoney } from "../../lib/format";
import { Card, EmptyState, PageHeader, StatTile } from "../../components/ui";

const ACCENT = "#1A1A1A";
const GRID = "rgba(26,26,26,0.08)";
const AXIS = "#A8A39A";

interface MesTotal { mes: string; total: number; }
interface Resumen {
  facturacionMensual: MesTotal[];
  gastosMensual: MesTotal[];
  costosMensual: MesTotal[];
  gananciaMensual: MesTotal[];
  retirosMensual: MesTotal[];
  ticketPromedioMensual: { mes: string; promedio: number }[];
  ventasPorCategoria: { categoria: string; monto: number; ganancia: number; rentabilidad: number }[];
  ventasPorPerfilCliente: { perfil: string; monto: number }[];
  masVendido: { tipoProducto: string; monto: number }[];
  cobradoEsteMes: number;
  faltaCobrar: number;
  clientesAtrasados: { contactoId: string; nombre: string; monto: number; cuotasAtrasadas: number; diasAtrasoMax: number }[];
  rentabilidadGeneral: {
    facturacion: number;
    costos: number;
    gastos: number;
    ganancia: number;
    rentabilidadPorcentaje: number;
    cobrado: number;
    meDeben: number;
  };
}

function MonthlyBar({ data, dataKey, valueFmt }: { data: any[]; dataKey: string; valueFmt: (n: number) => string }) {
  if (data.length === 0) return <p className="muted" style={{ fontSize: 13 }}>Todavía no hay datos para graficar.</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: AXIS }} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => valueFmt(v)} />
        <Tooltip formatter={(v: any) => valueFmt(Number(v))} contentStyle={{ borderRadius: 0, border: "1px solid #1A1A1A", boxShadow: "none", fontSize: 12.5 }} />
        <Bar dataKey={dataKey} fill={ACCENT} radius={[0, 0, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function MonthlyLine({ data, dataKey, valueFmt }: { data: any[]; dataKey: string; valueFmt: (n: number) => string }) {
  if (data.length === 0) return <p className="muted" style={{ fontSize: 13 }}>Todavía no hay datos para graficar.</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: AXIS }} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => valueFmt(v)} />
        <Tooltip formatter={(v: any) => valueFmt(Number(v))} contentStyle={{ borderRadius: 0, border: "1px solid #1A1A1A", boxShadow: "none", fontSize: 12.5 }} />
        <Line type="monotone" dataKey={dataKey} stroke={ACCENT} strokeWidth={2} dot={{ r: 3, fill: ACCENT }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function HorizontalBar({ data, xKey, yKey, valueFmt }: { data: any[]; xKey: string; yKey: string; valueFmt: (n: number) => string }) {
  if (data.length === 0) return <p className="muted" style={{ fontSize: 13 }}>Sin datos todavía.</p>;
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 42)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} tickFormatter={(v) => valueFmt(v)} />
        <YAxis type="category" dataKey={yKey} tick={{ fontSize: 12, fill: "#1A1A1A" }} axisLine={false} tickLine={false} width={130} />
        <Tooltip formatter={(v: any) => valueFmt(Number(v))} contentStyle={{ borderRadius: 0, border: "1px solid #1A1A1A", boxShadow: "none", fontSize: 12.5 }} />
        <Bar dataKey={xKey} fill={ACCENT} radius={[0, 0, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function DashboardFinanzas() {
  const [data, setData] = useState<Resumen | null>(null);
  useEffect(() => { api.get<Resumen>("/finanzas/resumen").then(setData); }, []);
  if (!data) return null;

  const g = data.rentabilidadGeneral;

  return (
    <div>
      <PageHeader number="04" eyebrow="General" title="Dashboard financiero" subtitle="Cruce de Facturación y CRM" />

      <div className="stack-16" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="grid grid-4">
          <StatTile tone="accent" label="Cobrado este mes" value={fmtMoney(data.cobradoEsteMes)} />
          <StatTile tone="sand" label="Falta cobrar" value={fmtMoney(data.faltaCobrar)} />
          <StatTile tone={data.clientesAtrasados.length > 0 ? "ink" : "outline"} label="Clientes atrasados" value={data.clientesAtrasados.length} />
          <StatTile tone="outline" label="Rentabilidad general" value={`${g.rentabilidadPorcentaje}%`} />
        </div>

        <Card title="Estado financiero" description="Facturado, costos, gastos y cuánto ya se cobró vs. lo que todavía deben los clientes.">
          <div className="grid grid-3">
            <StatTile label="Facturado" value={fmtMoney(g.facturacion)} />
            <StatTile label="Costos" value={fmtMoney(g.costos)} />
            <StatTile label="Gastos" value={fmtMoney(g.gastos)} />
            <StatTile label="Rentabilidad" value={`${g.rentabilidadPorcentaje}%`} />
            <StatTile label="Cobrado" value={fmtMoney(g.cobrado)} />
            <StatTile label="Cuánto me deben" value={fmtMoney(g.meDeben)} />
          </div>
        </Card>

        <Card
          title={`Clientes atrasados (${data.clientesAtrasados.length})`}
          description="Clientes con cuotas pendientes de cobro cuya fecha ya pasó."
        >
          {data.clientesAtrasados.length === 0 && <EmptyState>Sin clientes atrasados por ahora.</EmptyState>}
          {data.clientesAtrasados.map((c) => (
            <Link to="/clientes" key={c.contactoId} className="alert-row">
              <div>
                <strong>{c.nombre}</strong>
                <div className="muted" style={{ fontSize: 12.5 }}>
                  {c.cuotasAtrasadas} cuota{c.cuotasAtrasadas === 1 ? "" : "s"} vencida{c.cuotasAtrasadas === 1 ? "" : "s"} — {c.diasAtrasoMax} días de atraso máx.
                </div>
              </div>
              <div className="mono">{fmtMoney(c.monto)}</div>
            </Link>
          ))}
        </Card>

        <div className="grid grid-2">
          <Card title="Facturación mensual"><MonthlyBar data={data.facturacionMensual} dataKey="total" valueFmt={fmtMoney} /></Card>
          <Card title="Ganancia mensual"><MonthlyLine data={data.gananciaMensual} dataKey="total" valueFmt={fmtMoney} /></Card>
          <Card title="Gastos mensuales"><MonthlyBar data={data.gastosMensual} dataKey="total" valueFmt={fmtMoney} /></Card>
          <Card title="Costos por mes"><MonthlyBar data={data.costosMensual} dataKey="total" valueFmt={fmtMoney} /></Card>
          <Card title="Ticket promedio — evolución"><MonthlyLine data={data.ticketPromedioMensual} dataKey="promedio" valueFmt={fmtMoney} /></Card>
          <Card title="Retiros por mes"><MonthlyBar data={data.retirosMensual} dataKey="total" valueFmt={fmtMoney} /></Card>
        </div>

        <div className="grid grid-2">
          <Card title="Qué es lo que más se vende">
            <HorizontalBar data={data.masVendido} xKey="monto" yKey="tipoProducto" valueFmt={fmtMoney} />
          </Card>
          <Card title="A qué tipo de cliente le vende más">
            <HorizontalBar data={data.ventasPorPerfilCliente} xKey="monto" yKey="perfil" valueFmt={fmtMoney} />
          </Card>
        </div>

        <Card title="Ventas y rentabilidad por categoría">
          {data.ventasPorCategoria.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>Sin datos todavía.</p>
          ) : (
            <table className="data-table">
              <thead><tr><th>Categoría</th><th>Monto</th><th>Ganancia</th><th>Rentabilidad</th></tr></thead>
              <tbody>
                {data.ventasPorCategoria.map((c) => (
                  <tr key={c.categoria}>
                    <td style={{ fontWeight: 600 }}>{c.categoria}</td>
                    <td className="mono">{fmtMoney(c.monto)}</td>
                    <td className="mono">{fmtMoney(c.ganancia)}</td>
                    <td className="mono">{c.rentabilidad}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
