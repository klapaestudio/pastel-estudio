-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TareaAgenda" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'INTERNA',
    "contactoId" TEXT,
    "fechaInicio" DATETIME NOT NULL,
    "fechaFin" DATETIME NOT NULL,
    "todoElDia" BOOLEAN NOT NULL DEFAULT false,
    "prioridad" TEXT NOT NULL DEFAULT 'MEDIA',
    "ubicacion" TEXT,
    "notas" TEXT,
    "cronometroEstado" TEXT NOT NULL DEFAULT 'PARADO',
    "cronometroSegundos" INTEGER NOT NULL DEFAULT 0,
    "cronometroInicioTs" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TareaAgenda_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "Contacto" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TareaAgenda" ("contactoId", "createdAt", "cronometroEstado", "cronometroInicioTs", "cronometroSegundos", "fechaFin", "fechaInicio", "id", "notas", "tipo", "titulo", "ubicacion", "updatedAt") SELECT "contactoId", "createdAt", "cronometroEstado", "cronometroInicioTs", "cronometroSegundos", "fechaFin", "fechaInicio", "id", "notas", "tipo", "titulo", "ubicacion", "updatedAt" FROM "TareaAgenda";
DROP TABLE "TareaAgenda";
ALTER TABLE "new_TareaAgenda" RENAME TO "TareaAgenda";
CREATE INDEX "TareaAgenda_contactoId_idx" ON "TareaAgenda"("contactoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
