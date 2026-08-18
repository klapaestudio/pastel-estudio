import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Role } from "../lib/types";
import { Button } from "./ui";

interface NavItem {
  to: string;
  label: string;
  roles: Role[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    title: "General",
    items: [{ to: "/", label: "Panel de control", roles: ["ADMIN", "VENTAS", "FINANZAS", "TALLER"] }],
  },
  {
    title: "CRM",
    items: [
      { to: "/prospectos", label: "Prospectos", roles: ["ADMIN", "VENTAS", "FINANZAS"] },
      { to: "/clientes", label: "Clientes", roles: ["ADMIN", "VENTAS", "FINANZAS"] },
    ],
  },
  {
    title: "Ventas",
    items: [
      { to: "/presupuestador/objetos", label: "Presupuestador — Objetos", roles: ["ADMIN", "VENTAS", "FINANZAS"] },
      { to: "/presupuestador/arquitectura", label: "Presupuestador — Arquitectura", roles: ["ADMIN", "VENTAS", "FINANZAS"] },
      { to: "/mensajes", label: "Mensajes prearmados", roles: ["ADMIN", "VENTAS", "TALLER", "FINANZAS"] },
      { to: "/agenda", label: "Agenda", roles: ["ADMIN", "VENTAS", "TALLER", "FINANZAS"] },
    ],
  },
  {
    title: "Producción",
    items: [
      { to: "/productos", label: "Colección", roles: ["ADMIN", "TALLER", "FINANZAS", "VENTAS"] },
      { to: "/proveedores", label: "Proveedores", roles: ["ADMIN", "TALLER", "FINANZAS", "VENTAS"] },
    ],
  },
  {
    title: "Finanzas",
    items: [
      { to: "/facturacion", label: "Facturación", roles: ["ADMIN", "FINANZAS"] },
      { to: "/dashboard-finanzas", label: "Dashboard financiero", roles: ["ADMIN", "FINANZAS"] },
    ],
  },
  {
    title: "Administración",
    items: [{ to: "/usuarios", label: "Usuarios y permisos", roles: ["ADMIN"] }],
  },
];

export function RequireAuth({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "CLIENTE") return <Navigate to="/portal" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function AppLayout() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const initial = user.nombre.trim().charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Pastel<span className="brand-dot">.</span>Studio</div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
          {NAV.map((group) => {
            const items = group.items.filter((i) => i.roles.includes(user.role));
            if (!items.length) return null;
            return (
              <div className="nav-group" key={group.title}>
                <div className="nav-group-title">{group.title}</div>
                {items.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                    <span className="nav-dot" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </div>
        <div className="sidebar-user">
          <div className="avatar-chip">{initial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.nombre}</div>
            <div className="muted" style={{ fontSize: 11.5 }}>{user.role}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} title="Cerrar sesión">↦</Button>
        </div>
      </aside>
      <main className="main-area">
        <Outlet />
      </main>
    </div>
  );
}
