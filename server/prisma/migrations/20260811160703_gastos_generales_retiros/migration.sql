-- CreateTable
CREATE TABLE "GastoGeneral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "concepto" TEXT NOT NULL,
    "categoria" TEXT,
    "monto" REAL NOT NULL DEFAULT 0,
    "fecha" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RetiroSocia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "socia" TEXT NOT NULL,
    "monto" REAL NOT NULL DEFAULT 0,
    "notas" TEXT,
    "fecha" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
