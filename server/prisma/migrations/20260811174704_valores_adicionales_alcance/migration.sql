-- AlterTable
ALTER TABLE "Presupuesto" ADD COLUMN "alcance" TEXT;

-- CreateTable
CREATE TABLE "ValorAdicional" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "presupuestoId" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" REAL NOT NULL DEFAULT 0,
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ValorAdicional_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "Presupuesto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ValorAdicional_presupuestoId_idx" ON "ValorAdicional"("presupuestoId");
