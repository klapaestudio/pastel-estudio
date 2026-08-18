# Pastel Studio — Panel de gestión

Sistema de gestión interna para Pastel Studio (estudio de arquitectura y diseño de
interiores): CRM, presupuestos, producción, proveedores, facturación, agenda,
portal de cliente y dashboard financiero — con roles multiusuario y diseño propio.

> La v1 (Flask + SQLite + JS vanilla, en `api/`, `backend/`, `frontend/`) queda
> reemplazada por esta versión. Sus datos reales ya fueron migrados — ver abajo.

---

## Stack

- **Backend** (`server/`): Node + TypeScript + Express + Prisma. SQLite en desarrollo
  (`server/data/pastel.db`) — para pasar a Postgres alcanza con cambiar `provider`
  y `DATABASE_URL` en `server/prisma/schema.prisma` y `server/.env`, el resto del
  modelo no cambia.
- **Frontend** (`web/`): React + TypeScript + Vite + React Router + Recharts.
- **Auth**: JWT + roles (Admin, Ventas/CRM, Taller/producción, Finanzas, Cliente).
- **PDF**: generado en el servidor con `pdfkit`, con 3 plantillas seleccionables.

## Cómo iniciar

### 1. Backend

```bash
cd server
npm install
npx prisma migrate dev   # crea server/data/pastel.db si no existe
npm run seed              # usuario admin + categorías de mensajes por defecto
npm run dev                # http://localhost:4000
```

Usuario admin generado por el seed: **admin@pastelstudio.com / pastel2026**
(cambiar la contraseña desde Usuarios y permisos una vez adentro).

Si es la primera vez y todavía no se corrió, para traer los datos reales de la v1
(clientes, presupuestos, objetos, stock, finanzas):

```bash
npm run migrate:legacy
```

### 2. Frontend

```bash
cd web
npm install
npm run dev   # http://localhost:5173 (proxy a la API en :4000)
```

Abrí `http://localhost:5173` e iniciá sesión con el usuario admin.

---

## Diseño

Paleta fija según especificación: fondo `#DBC8AD`, acento `#A57442`, texto blanco/negro
únicamente. Tokens y componentes base en `web/src/index.css` y `web/src/components/ui.tsx`.

## Estructura

```
pastel/
├── server/
│   ├── prisma/schema.prisma   # modelo de datos completo
│   ├── prisma/seed.ts
│   ├── scripts/migrate-legacy.ts
│   └── src/
│       ├── routes/            # un archivo por módulo
│       ├── lib/                # cálculo de costos, follow-up, PDF, enums
│       └── middleware/auth.ts
├── web/
│   └── src/
│       ├── pages/              # un directorio por módulo
│       ├── components/         # sistema de diseño (Button, Card, Table, Modal…)
│       └── lib/                 # api client, auth, formatters, types
├── api/, backend/, frontend/   # v1 (legacy, reemplazada)
└── data/pastel.db               # v1 (legacy, ya migrada a server/data/pastel.db)
```

## Notas sobre decisiones tomadas

- **Facturación electrónica ARCA**: el flujo completo está armado (vinculación de
  cuenta, emisión de comprobante reutilizando monto/cliente/fecha de la cuota) pero
  la llamada real a la API fiscal de ARCA queda **stubbeada** — requiere credenciales
  fiscales del estudio que no existen en este entorno.
- **Gastos operativos generales y retiros de socias**: no están en la sección 4 del
  documento original, pero la v1 ya los registraba como parte real del uso del
  estudio. Se agregaron como módulos livianos (dentro de Facturación → dashboard)
  para no perder esa información al migrar.
- **Vista de talleres**: por ahora requiere login con rol Taller (no es un link
  público sin autenticar). Si se necesita compartir por link directo sin cuenta,
  es un agregado futuro (token de solo lectura).
