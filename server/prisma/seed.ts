import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.configuracionGeneral.upsert({
    where: { id: "default" },
    create: { id: "default", intervaloRecontactoDefaultMeses: 6 },
    update: {},
  });

  await prisma.arcaConfig.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });

  const adminEmail = "admin@pastelstudio.com";
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash("pastel2026", 10);
    await prisma.user.create({
      data: { email: adminEmail, passwordHash, nombre: "Admin Pastel Studio", role: "ADMIN" },
    });
    console.log(`Usuario admin creado: ${adminEmail} / pastel2026`);
  }

  const categoriasDefault = [
    "Consulta de stock",
    "Follow up de presupuesto",
    "Presupuesto enviado",
    "Confirmación de envío",
    "Follow up de cliente",
  ];
  for (let i = 0; i < categoriasDefault.length; i++) {
    const nombre = categoriasDefault[i];
    const existing = await prisma.mensajeCategoria.findUnique({ where: { nombre } });
    if (!existing) await prisma.mensajeCategoria.create({ data: { nombre, orden: i } });
  }

  console.log("Seed completo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
