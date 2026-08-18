import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { fmtDate, fmtMoney } from "../../lib/format";
import { Card, EmptyState, StatTile } from "../../components/ui";

interface AlertasResponse {
  debeAProveedores: any[];
  leDebenACobrar: any[];
  entregasPendientes: any[];
  enviosPendientes: any[];
  followUpProspectos: any[];
  followUpClientes: any[];
  materialesAlerta: any[];
}

export default function Panel() {
  const [data, setData] = useState<AlertasResponse | null>(null);

  useEffect(() => {
    api.get<AlertasResponse>("/panel/alertas").then(setData);
  }, []);

  if (!data) return null;

  return (
    <div>
      <div className="hero-block">
        <div>
          <p className="eyebrow">Pastel Studio</p>
          <h1>Panel de control</h1>
          <p>Todo lo que cruza CRM, facturación, proveedores y agenda hoy.</p>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatTile tone="accent" label="Pagos a proveedores" value={data.debeAProveedores.length} />
        <StatTile tone="sand" label="Cuotas por cobrar" value={data.leDebenACobrar.length} />
        <StatTile tone="ink" label="Entregas próximas" value={data.entregasPendientes.length} />
        <StatTile tone="outline" label="Follow up activos" value={data.followUpProspectos.length + data.followUpClientes.length} />
      </div>

      <div className="grid grid-2">
        <Card
          title={`Pagos pendientes a proveedores (${data.debeAProveedores.length})`}
          description="Facturas y compromisos que el estudio todavía tiene que saldar."
        >
          {data.debeAProveedores.length === 0 && <EmptyState>Sin pagos pendientes a proveedores.</EmptyState>}
          {data.debeAProveedores.map((p) => (
            <Link to="/proveedores" key={p.id} className="alert-row" style={{ textDecoration: "none", color: "inherit" }}>
              <div>
                <strong>{p.proveedor?.nombre}</strong> — {p.concepto}
                <div className="muted" style={{ fontSize: 12.5 }}>Vence {fmtDate(p.fechaVencimiento)}</div>
              </div>
              <div className="mono">{fmtMoney(p.monto)}</div>
            </Link>
          ))}
        </Card>

        <Card
          title={`Cuotas pendientes de cobro (${data.leDebenACobrar.length})`}
          description="Dinero que los clientes todavía te tienen que pagar a vos."
        >
          {data.leDebenACobrar.length === 0 && <EmptyState>Sin cuotas pendientes de cobro.</EmptyState>}
          {data.leDebenACobrar.map((c) => (
            <Link to="/facturacion" key={c.id} className="alert-row" style={{ textDecoration: "none", color: "inherit" }}>
              <div>
                <strong>{c.cobro?.contacto?.nombre}</strong> — cuota {c.numero}
                <div className="muted" style={{ fontSize: 12.5 }}>Vence {fmtDate(c.fecha)}</div>
              </div>
              <div className="mono">{fmtMoney(c.monto)}</div>
            </Link>
          ))}
        </Card>

        <Card title={`Entregas pendientes (${data.entregasPendientes.length})`} description="Objetos y proyectos con fecha de entrega cerca del límite.">

          {data.entregasPendientes.length === 0 && <EmptyState>Sin entregas próximas a vencer.</EmptyState>}
          {data.entregasPendientes.map((e) => (
            <Link to={`/clientes`} key={e.contacto.id} className="alert-row" style={{ textDecoration: "none", color: "inherit" }}>
              <div>
                <strong>{e.contacto.nombre}</strong>
                <div className="muted" style={{ fontSize: 12.5 }}>Entrega {fmtDate(e.contacto.fechaEntrega)}</div>
              </div>
              <div className="mono">{e.aviso.vencida ? "Vencida" : `${e.aviso.diasRestantes} días`}</div>
            </Link>
          ))}
        </Card>

        <Card title={`Envíos pendientes (${data.enviosPendientes.length})`} description="Presupuestos aprobados a los que falta coordinar o despachar el envío.">

          {data.enviosPendientes.length === 0 && <EmptyState>Sin envíos por coordinar o despachar.</EmptyState>}
          {data.enviosPendientes.map((p) => (
            <Link to="/presupuestador/objetos" key={p.id} className="alert-row" style={{ textDecoration: "none", color: "inherit" }}>
              <div>
                <strong>{p.contacto?.nombre}</strong> — {p.titulo}
                <div className="muted" style={{ fontSize: 12.5 }}>Estado envío: {p.envioEstado}</div>
              </div>
            </Link>
          ))}
        </Card>

        <Card title={`Follow up de prospectos (${data.followUpProspectos.length})`} description="Prospectos a los que hay que retomar tras el presupuesto enviado.">

          {data.followUpProspectos.length === 0 && <EmptyState>Sin prospectos en seguimiento activo.</EmptyState>}
          {data.followUpProspectos.map((f) => (
            <Link to="/prospectos" key={f.contacto.id} className="alert-row" style={{ textDecoration: "none", color: "inherit" }}>
              <div>
                <strong>{f.contacto.nombre}</strong>
                <div className="muted" style={{ fontSize: 12.5 }}>
                  {f.followUp.alertaSinNovedades
                    ? "Marcado como contactado, sigue sin respuesta"
                    : `Día ${f.followUp.diasTranscurridos} desde el envío del presupuesto`}
                </div>
              </div>
              <div className="mono">{f.followUp.hitosVencidos.join(" / ")}</div>
            </Link>
          ))}
        </Card>

        <Card title={`Follow up de clientes (${data.followUpClientes.length})`} description="Clientes que superaron su intervalo habitual de recompra.">

          {data.followUpClientes.length === 0 && <EmptyState>Sin clientes fuera de su intervalo de recontacto.</EmptyState>}
          {data.followUpClientes.map((f) => (
            <Link to="/clientes" key={f.contacto.id} className="alert-row" style={{ textDecoration: "none", color: "inherit" }}>
              <div>
                <strong>{f.contacto.nombre}</strong>
                <div className="muted" style={{ fontSize: 12.5 }}>Hace tiempo que no compra — contactalo</div>
              </div>
              <div className="mono">{f.recontacto.diasDesdeVencimiento}d</div>
            </Link>
          ))}
        </Card>
      </div>

      {data.materialesAlerta.length > 0 && (
        <Card title={`Alarma de stock de materiales (${data.materialesAlerta.length})`}>
          {data.materialesAlerta.map((m) => (
            <div key={m.id} className="alert-row">
              <strong>{m.nombre}</strong>
              <span className={`badge ${m.stockEstado === "SIN_STOCK" ? "badge-negative" : "badge-warning"}`}>
                {m.stockEstado === "SIN_STOCK" ? "Sin stock" : "Quedando sin stock"}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
