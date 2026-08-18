import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { AppLayout, RequireAuth } from "./components/Layout";
import Login from "./pages/auth/Login";
import Panel from "./pages/panel/Panel";
import Prospectos from "./pages/crm/Prospectos";
import Clientes from "./pages/crm/Clientes";
import ObjetosPresupuestador from "./pages/presupuestador/ObjetosPresupuestador";
import ArquitecturaPresupuestador from "./pages/presupuestador/ArquitecturaPresupuestador";
import Coleccion from "./pages/productos/Coleccion";
import Proveedores from "./pages/proveedores/Proveedores";
import Mensajes from "./pages/mensajes/Mensajes";
import Facturacion from "./pages/facturacion/Facturacion";
import DashboardFinanzas from "./pages/finanzas/DashboardFinanzas";
import Agenda from "./pages/agenda/Agenda";
import Usuarios from "./pages/usuarios/Usuarios";
import Portal from "./pages/portal/Portal";

export default function App() {
  const { loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth roles={["CLIENTE"]} />}>
        <Route path="/portal" element={<Portal />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Panel />} />
          <Route path="/prospectos" element={<Prospectos />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/presupuestador/objetos" element={<ObjetosPresupuestador />} />
          <Route path="/presupuestador/arquitectura" element={<ArquitecturaPresupuestador />} />
          <Route path="/productos" element={<Coleccion />} />
          <Route path="/proveedores" element={<Proveedores />} />
          <Route path="/mensajes" element={<Mensajes />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/facturacion" element={<Facturacion />} />
          <Route path="/dashboard-finanzas" element={<DashboardFinanzas />} />
          <Route path="/usuarios" element={<Usuarios />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
