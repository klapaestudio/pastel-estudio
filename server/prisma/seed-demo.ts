// Correr con: npm run seed:demo (requiere haber corrido "npm run seed" antes).
// Lógica compartida con el endpoint temporal en src/routes/adminSeed.ts — ver src/lib/seedDemo.ts.

import { prisma } from "../src/lib/prisma";
import { seedDemoData } from "../src/lib/seedDemo";

seedDemoData()
  .then((msg) => console.log(msg))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
