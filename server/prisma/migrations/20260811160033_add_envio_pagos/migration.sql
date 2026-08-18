-- CreateTable
CREATE TABLE "PagoProveedor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proveedorId" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" REAL NOT NULL DEFAULT 0,
    "fechaVencimiento" DATETIME NOT NULL,
    "pagada" BOOLEAN NOT NULL DEFAULT false,
    "fechaPago" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PagoProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Presupuesto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactoId" TEXT,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "linea" TEXT,
    "servicio" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "envioTipo" TEXT NOT NULL DEFAULT 'ESTIMATIVO',
    "envioCosto" REAL NOT NULL DEFAULT 0,
    "envioEstado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "plantillaPdf" TEXT NOT NULL DEFAULT 'CLASICA',
    "notas" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Presupuesto_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "Contacto" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Presupuesto" ("contactoId", "createdAt", "envioCosto", "envioTipo", "estado", "fecha", "id", "linea", "notas", "plantillaPdf", "servicio", "tipo", "titulo", "updatedAt") SELECT "contactoId", "createdAt", "envioCosto", "envioTipo", "estado", "fecha", "id", "linea", "notas", "plantillaPdf", "servicio", "tipo", "titulo", "updatedAt" FROM "Presupuesto";
DROP TABLE "Presupuesto";
ALTER TABLE "new_Presupuesto" RENAME TO "Presupuesto";
CREATE INDEX "Presupuesto_contactoId_idx" ON "Presupuesto"("contactoId");
CREATE INDEX "Presupuesto_tipo_idx" ON "Presupuesto"("tipo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PagoProveedor_proveedorId_idx" ON "PagoProveedor"("proveedorId");

-- CreateIndex
CREATE INDEX "PagoProveedor_pagada_idx" ON "PagoProveedor"("pagada");
