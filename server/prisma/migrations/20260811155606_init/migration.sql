-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "contactoId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "Contacto" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConfiguracionGeneral" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "intervaloRecontactoDefaultMeses" INTEGER NOT NULL DEFAULT 6
);

-- CreateTable
CREATE TABLE "Contacto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "etapa" TEXT NOT NULL DEFAULT 'PROSPECTO',
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "ciudad" TEXT,
    "provincia" TEXT,
    "perfil" TEXT,
    "origen" TEXT NOT NULL DEFAULT 'WHATSAPP_INSTAGRAM',
    "notas" TEXT,
    "tagProductoServicio" TEXT,
    "telaColor" TEXT,
    "monto" REAL DEFAULT 0,
    "fechaPrimerContacto" DATETIME,
    "fechaEnvioPresupuesto" DATETIME,
    "estado" TEXT NOT NULL DEFAULT 'A_PRESUPUESTAR',
    "followUpRealizado" BOOLEAN NOT NULL DEFAULT false,
    "followUpRealizadoFecha" DATETIME,
    "followUpManualFecha" DATETIME,
    "fechaCierrePresupuesto" DATETIME,
    "fechaEntrega" DATETIME,
    "fechaUltimaCompra" DATETIME,
    "intervaloRecontactoMeses" INTEGER,
    "ultimoContactoRecontacto" DATETIME,
    "recontactoMarcadoFecha" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Etiqueta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactoId" TEXT NOT NULL,
    "tipoProducto" TEXT NOT NULL,
    "linea" TEXT,
    "servicio" TEXT,
    CONSTRAINT "Etiqueta_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "Contacto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Presupuesto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactoId" TEXT,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "linea" TEXT,
    "servicio" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "envioTipo" TEXT NOT NULL DEFAULT 'ESTIMATIVO',
    "envioCosto" REAL NOT NULL DEFAULT 0,
    "plantillaPdf" TEXT NOT NULL DEFAULT 'CLASICA',
    "notas" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Presupuesto_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "Contacto" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PresupuestoItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "presupuestoId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "producto" TEXT NOT NULL,
    "medidas" TEXT,
    "tela" TEXT,
    "color" TEXT,
    "cantidadTela" REAL NOT NULL DEFAULT 0,
    "precioTelaMetro" REAL NOT NULL DEFAULT 0,
    "manoObraEstructura" REAL NOT NULL DEFAULT 0,
    "manoObraTapiceria" REAL NOT NULL DEFAULT 0,
    "manoObraEstado" TEXT NOT NULL DEFAULT 'ESTIMATIVO',
    "materialesCosto" REAL NOT NULL DEFAULT 0,
    "costoDiseno" REAL NOT NULL DEFAULT 0,
    "honorariosCosto" REAL NOT NULL DEFAULT 0,
    "gastosVarios" REAL NOT NULL DEFAULT 0,
    "unidades" REAL NOT NULL DEFAULT 1,
    "precioUnidad" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "PresupuestoItem_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "ciudad" TEXT,
    "telefono" TEXT,
    "contacto" TEXT,
    "notas" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proveedorId" TEXT,
    "nombre" TEXT NOT NULL,
    "unidad" TEXT NOT NULL DEFAULT 'unidad',
    "costoActualizado" REAL NOT NULL DEFAULT 0,
    "stockEstado" TEXT NOT NULL DEFAULT 'HAY_STOCK',
    "stockCantidad" REAL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Material_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ManoObraTarifa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proveedorId" TEXT,
    "tipoTrabajo" TEXT NOT NULL,
    "costo" REAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ManoObraTarifa_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductoEstandar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "medidas" TEXT,
    "manoObraEstructura" REAL NOT NULL DEFAULT 0,
    "manoObraTapiceria" REAL NOT NULL DEFAULT 0,
    "moldeFileNombre" TEXT,
    "moldeFileData" TEXT,
    "precioVenta" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProductoEstandarMaterial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productoEstandarId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "cantidad" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "ProductoEstandarMaterial_productoEstandarId_fkey" FOREIGN KEY ("productoEstandarId") REFERENCES "ProductoEstandar" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductoEstandarMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockProducto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productoEstandarId" TEXT NOT NULL,
    "cantidad" REAL NOT NULL DEFAULT 0,
    "tela" TEXT,
    "embalaje" TEXT NOT NULL DEFAULT 'SIMPLE',
    "mensajePredefinido" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockProducto_productoEstandarId_fkey" FOREIGN KEY ("productoEstandarId") REFERENCES "ProductoEstandar" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MensajeCategoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Mensaje" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoriaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mensaje_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "MensajeCategoria" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cobro" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactoId" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "categoria" TEXT,
    "gananciaTotal" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cobro_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "Contacto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cuota" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cobroId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "fecha" DATETIME NOT NULL,
    "monto" REAL NOT NULL DEFAULT 0,
    "costos" REAL NOT NULL DEFAULT 0,
    "gastos" REAL NOT NULL DEFAULT 0,
    "pagada" BOOLEAN NOT NULL DEFAULT false,
    "comprobanteEmitido" BOOLEAN NOT NULL DEFAULT false,
    "comprobanteTipo" TEXT,
    "comprobantePuntoVenta" TEXT,
    "comprobanteNumero" TEXT,
    CONSTRAINT "Cuota_cobroId_fkey" FOREIGN KEY ("cobroId") REFERENCES "Cobro" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArcaConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "cuitEstudio" TEXT,
    "cuentaVinculada" BOOLEAN NOT NULL DEFAULT false,
    "puntoVentaDefault" TEXT
);

-- CreateTable
CREATE TABLE "TareaAgenda" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'INTERNA',
    "contactoId" TEXT,
    "fechaInicio" DATETIME NOT NULL,
    "fechaFin" DATETIME NOT NULL,
    "ubicacion" TEXT,
    "notas" TEXT,
    "cronometroEstado" TEXT NOT NULL DEFAULT 'PARADO',
    "cronometroSegundos" INTEGER NOT NULL DEFAULT 0,
    "cronometroInicioTs" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TareaAgenda_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "Contacto" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FranjaBloqueada" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fecha" DATETIME NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "motivo" TEXT
);

-- CreateTable
CREATE TABLE "ArchivoProyecto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT,
    "fileData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArchivoProyecto_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "Contacto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EtapaProyecto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "completada" BOOLEAN NOT NULL DEFAULT false,
    "fecha" DATETIME,
    CONSTRAINT "EtapaProyecto_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "Contacto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Contacto_etapa_idx" ON "Contacto"("etapa");

-- CreateIndex
CREATE INDEX "Contacto_estado_idx" ON "Contacto"("estado");

-- CreateIndex
CREATE INDEX "Etiqueta_contactoId_idx" ON "Etiqueta"("contactoId");

-- CreateIndex
CREATE INDEX "Etiqueta_tipoProducto_idx" ON "Etiqueta"("tipoProducto");

-- CreateIndex
CREATE INDEX "Presupuesto_contactoId_idx" ON "Presupuesto"("contactoId");

-- CreateIndex
CREATE INDEX "Presupuesto_tipo_idx" ON "Presupuesto"("tipo");

-- CreateIndex
CREATE INDEX "PresupuestoItem_presupuestoId_idx" ON "PresupuestoItem"("presupuestoId");

-- CreateIndex
CREATE INDEX "Material_proveedorId_idx" ON "Material"("proveedorId");

-- CreateIndex
CREATE INDEX "Material_stockEstado_idx" ON "Material"("stockEstado");

-- CreateIndex
CREATE INDEX "ProductoEstandarMaterial_productoEstandarId_idx" ON "ProductoEstandarMaterial"("productoEstandarId");

-- CreateIndex
CREATE INDEX "StockProducto_productoEstandarId_idx" ON "StockProducto"("productoEstandarId");

-- CreateIndex
CREATE UNIQUE INDEX "MensajeCategoria_nombre_key" ON "MensajeCategoria"("nombre");

-- CreateIndex
CREATE INDEX "Mensaje_categoriaId_idx" ON "Mensaje"("categoriaId");

-- CreateIndex
CREATE INDEX "Cuota_cobroId_idx" ON "Cuota"("cobroId");

-- CreateIndex
CREATE INDEX "TareaAgenda_contactoId_idx" ON "TareaAgenda"("contactoId");

-- CreateIndex
CREATE INDEX "ArchivoProyecto_contactoId_idx" ON "ArchivoProyecto"("contactoId");

-- CreateIndex
CREATE INDEX "EtapaProyecto_contactoId_idx" ON "EtapaProyecto"("contactoId");
