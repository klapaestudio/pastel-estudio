import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../lib/api";
import { fmtMoney } from "../../lib/format";
import { Card, StatTile } from "../../components/ui";

const ACCENT = "#A57442";
const GRID = "rgba(0,0,0,0.08)";
const AXIS = "rgba(0,0,0,0.55)";

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
  rentabilidadGeneral: { facturacion: number; costos: number; gastos: number; ganancia: number; rentabilidadPorcentaje: number };
}

function MonthlyBar({ data, dataKey, valueFmt }: { data: any[]; dataKey: string; valueFmt: (n: number) => string }) {
  if (data.length === 0) return <p className="muted" style={{ fontSize: 13 }}>Todavía no hay datos para graficar.</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: AXIS }} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => valueFmt(v)} />
        <Tooltip formatter={(v: any) => valueFmt(Number(v))} contentStyle={{ borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", fontSize: 12.5 }} />
        <Bar dataKey={dataKey} fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={36} />
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
        <Tooltip formatter={(v: any) => valueFmt(Number(v))} contentStyle={{ borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", fontSize: 12.5 }} />
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
        <YAxis type="category" dataKey={yKey} tick={{ fontSize: 12, fill: "#000" }} axisLine={false} tickLine={false} width={130} />
        <Tooltip formatter={(v: any) => valueFmt(Number(v))} contentStyle={{ borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", fontSize: 12.5 }} />
        <Bar dataKey={xKey} fill={ACCENT} radius={[0, 4, 4, 0]} maxBarSize={22} />
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
      <div className="topbar">
        <div>
          <p className="eyebrow">Finanzas</p>
          <h1 className="page-title">Dashboard financiero</h1>
          <p className="page-subtitle">Cruce de Facturación y CRM</p>
        </div>
      </div>

      <Card>
        <div className="grid grid-4">
          <StatTile label="Facturación total" value={fmtMoney(g.facturacion)} />
          <StatTile label="Costos" value={fmtMoney(g.costos)} />
          <StatTile label="Gastos" value={fmtMoney(g.gastos)} />
          <StatTile label="Ganancia" value={fmtMoney(g.ganancia)} />
        </div>
        <div style={{ marginTop: 14 }}>
          <StatTile label="Rentabilidad general" value={`${g.rentabilidadPorcentaje}%`} />
        </div>
      </Card>

      <div className="grid grid-2">
        <Card title="Facturación mensual"><MonthlyBar data={data.facturacionMensual} dataKey="total" valueFmt={fmtMoney} /></Card>
        <Card title="Ganancia mensual"><MonthlyLine data={data.gananciaMensual} dataKey="total" valueFmt={fmtMoney} /></Card>
        <Card title="Gastos mensuales"><MonthlyBar data={data.gastosMensual} dataKey="total" valueFmt={fmtMoney} /></Card>
        <Card title="Costos por mes"><MonthlyBar data={data.costosMensual} dataKey="total" valueFmt={fmtMoney} /></Card>
        <Card title="Ticket promedio — evolución"><MonthlyLine data={data.ticketPromedioMensual} dataKey="promedio" valueFmt={fmtMoney} /></Card>
        <Card title="Retiros de socias por mes"><MonthlyBar data={data.retirosMensual} dataKey="total" valueFmt={fmtMoney} /></Card>
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
  );
}
