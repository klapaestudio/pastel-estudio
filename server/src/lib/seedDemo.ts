// Datos de ejemplo para probar el sistema end-to-end: prospectos y clientes de
// distintos perfiles, presupuestos de los 3 tipos, proveedores, stock, agenda,
// facturación y mensajes. Puramente aditivo — no borra ni modifica datos existentes.
// Usado por prisma/seed-demo.ts (CLI) y por routes/adminSeed.ts (endpoint temporal).

import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { addDays, addMonths } from "./followup";

const MARCADOR_NOMBRE = "Julieta Fernández";

export async function seedDemoData(): Promise<string> {
  const yaExiste = await prisma.contacto.findFirst({ where: { nombre: MARCADOR_NOMBRE } });
  if (yaExiste) {
    return "Los datos de ejemplo ya estaban cargados (se encontró el prospecto marcador). No se creó nada nuevo.";
  }

  const hoy = new Date();
  const pass = await bcrypt.hash("pastel2026", 10);

  for (const u of [
    { email: "ventas@pastelstudio.com", nombre: "Rocío Ventas", role: "VENTAS" },
    { email: "taller@pastelstudio.com", nombre: "Diego Taller", role: "TALLER" },
    { email: "finanzas@pastelstudio.com", nombre: "Marina Finanzas", role: "FINANZAS" },
  ]) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) await prisma.user.create({ data: { ...u, passwordHash: pass } });
  }

  const provTelas = await prisma.proveedor.create({
    data: {
      nombre: "Telas del Sur",
      tipo: "MATERIAL",
      ciudad: "Buenos Aires",
      telefono: "11-4455-6677",
      contacto: "Pablo Núñez",
      notas: "Entrega en 5 a 7 días hábiles. Pedido mínimo 10m por color.",
    },
  });
  const provCarpinteria = await prisma.proveedor.create({
    data: {
      nombre: "Carpintería Ruggeri",
      tipo: "MANO_OBRA",
      ciudad: "Rosario",
      telefono: "341-555-0199",
      contacto: "Diego Ruggeri",
      notas: "Estructuras de madera maciza y tapizados a medida.",
    },
  });
  const provFlete = await prisma.proveedor.create({
    data: { nombre: "Flete Expreso Rosario", tipo: "TRANSPORTE", ciudad: "Rosario", telefono: "341-555-0288", contacto: "Marcos Peralta" },
  });

  const linoNatural = await prisma.material.create({
    data: { proveedorId: provTelas.id, nombre: "Lino natural crudo", unidad: "m", costoActualizado: 4200, stockEstado: "HAY_STOCK", stockCantidad: 85 },
  });
  const panaGruesa = await prisma.material.create({
    data: { proveedorId: provTelas.id, nombre: "Pana gruesa mostaza", unidad: "m", costoActualizado: 5100, stockEstado: "QUEDANDO_SIN_STOCK", stockCantidad: 6 },
  });
  await prisma.material.create({
    data: { proveedorId: provTelas.id, nombre: "Terciopelo premium verde botella", unidad: "m", costoActualizado: 7800, stockEstado: "SIN_STOCK", stockCantidad: 0 },
  });

  await prisma.manoObraTarifa.create({ data: { proveedorId: provCarpinteria.id, tipoTrabajo: "Armado de estructura madera", costo: 18000 } });
  await prisma.manoObraTarifa.create({ data: { proveedorId: provCarpinteria.id, tipoTrabajo: "Tapicería completa", costo: 22000 } });

  await prisma.pagoProveedor.create({
    data: { proveedorId: provTelas.id, concepto: "Compra de tela — pedido #114", monto: 63000, fechaVencimiento: addDays(hoy, 5), pagada: false },
  });
  await prisma.pagoProveedor.create({
    data: { proveedorId: provCarpinteria.id, concepto: "Estructuras sillón Munich x4", monto: 72000, fechaVencimiento: addDays(hoy, 12), pagada: false },
  });
  await prisma.pagoProveedor.create({
    data: { proveedorId: provFlete.id, concepto: "Flete entrega Bianchi", monto: 9500, fechaVencimiento: addDays(hoy, -10), pagada: true, fechaPago: addDays(hoy, -9) },
  });

  const sillonMunich = await prisma.productoEstandar.create({
    data: { nombre: "Sillón Munich", descripcion: "Sillón de una plaza, estructura de madera maciza tapizada.", medidas: "90x85x75cm", manoObraEstructura: 15000, manoObraTapiceria: 12000, precioVenta: 145000 },
  });
  await prisma.productoEstandarMaterial.create({ data: { productoEstandarId: sillonMunich.id, materialId: linoNatural.id, cantidad: 3.2 } });
  await prisma.stockProducto.create({ data: { productoEstandarId: sillonMunich.id, cantidad: 4, tela: "Lino natural crudo", embalaje: "SIMPLE" } });

  const sillaCopenhague = await prisma.productoEstandar.create({
    data: { nombre: "Silla Copenhague", descripcion: "Silla tapizada de líneas nórdicas.", medidas: "45x50x82cm", manoObraEstructura: 6000, manoObraTapiceria: 4500, precioVenta: 68000 },
  });
  await prisma.productoEstandarMaterial.create({ data: { productoEstandarId: sillaCopenhague.id, materialId: panaGruesa.id, cantidad: 1.1 } });
  await prisma.stockProducto.create({
    data: { productoEstandarId: sillaCopenhague.id, cantidad: 0, tela: "Pana gruesa mostaza", embalaje: "DOBLE", mensajePredefinido: "Sin stock — próximo lote en 3 semanas." },
  });

  const catStock = await prisma.mensajeCategoria.findUnique({ where: { nombre: "Consulta de stock" } });
  const catFollowUp = await prisma.mensajeCategoria.findUnique({ where: { nombre: "Follow up de presupuesto" } });
  const catEnvio = await prisma.mensajeCategoria.findUnique({ where: { nombre: "Confirmación de envío" } });
  if (catStock) {
    await prisma.mensaje.create({
      data: { categoriaId: catStock.id, titulo: "Hay stock", texto: "¡Hola {{nombre}}! Sí, tenemos stock de {{producto}} en tela {{tela}}. ¿Querés que te pase el precio?" },
    });
  }
  if (catFollowUp) {
    await prisma.mensaje.create({
      data: { categoriaId: catFollowUp.id, titulo: "Recordatorio presupuesto enviado", texto: "Hola {{nombre}}, ¿pudiste ver el presupuesto que te enviamos el {{fecha}}? Quedo atenta ante cualquier duda." },
    });
  }
  if (catEnvio) {
    await prisma.mensaje.create({
      data: { categoriaId: catEnvio.id, titulo: "Pedido despachado", texto: "Hola {{nombre}}, tu pedido de {{producto}} ya fue despachado. ¡Te avisamos apenas llegue!" },
    });
  }

  await prisma.contacto.create({
    data: {
      etapa: "PROSPECTO",
      nombre: MARCADOR_NOMBRE,
      telefono: "351-611-2233",
      ciudad: "Córdoba",
      provincia: "Córdoba",
      perfil: "PARTICULAR",
      origen: "WHATSAPP_INSTAGRAM",
      tagProductoServicio: "Sillón Munich tapizado",
      telaColor: "Lino natural crudo",
      monto: 145000,
      fechaPrimerContacto: addDays(hoy, -4),
      estado: "A_PRESUPUESTAR",
      etiquetas: { create: [{ tipoProducto: "COLECCION" }] },
    },
  });

  await prisma.contacto.create({
    data: {
      etapa: "PROSPECTO",
      nombre: "Martín Larrain (Estudio Larrain Arquitectos)",
      telefono: "341-622-9081",
      ciudad: "Rosario",
      provincia: "Santa Fe",
      perfil: "ARQUITECTO",
      origen: "WHATSAPP_INSTAGRAM",
      tagProductoServicio: "Proyecto integral vivienda unifamiliar",
      monto: 2400000,
      fechaPrimerContacto: addDays(hoy, -20),
      fechaEnvioPresupuesto: addDays(hoy, -15),
      estado: "PRESU_ENVIADO",
      followUpRealizado: false,
      notas: "Pidió comparar con otro estudio, sensible a plazos de obra.",
      etiquetas: { create: [{ tipoProducto: "ARQUITECTURA", linea: "RESIDENCIAL", servicio: "PROYECTO_INTEGRAL" }] },
    },
  });

  await prisma.contacto.create({
    data: {
      etapa: "PROSPECTO",
      nombre: "Sofía Ibarra",
      telefono: "011-4020-5566",
      ciudad: "CABA",
      provincia: "Buenos Aires",
      perfil: "DISENADOR",
      origen: "TIENDA_NUBE",
      tagProductoServicio: "Cabecera de cama a medida",
      telaColor: "Terciopelo verde botella",
      monto: 98000,
      fechaPrimerContacto: addDays(hoy, -6),
      fechaEnvioPresupuesto: addDays(hoy, -3),
      estado: "PRESU_ENVIADO",
      followUpRealizado: true,
      followUpRealizadoFecha: hoy,
      etiquetas: { create: [{ tipoProducto: "PERSONALIZADO" }] },
    },
  });

  await prisma.contacto.create({
    data: {
      etapa: "PROSPECTO",
      nombre: "Nicolás Roldán",
      telefono: "351-777-4411",
      ciudad: "Córdoba",
      provincia: "Córdoba",
      perfil: "PARTICULAR",
      origen: "WHATSAPP_INSTAGRAM",
      tagProductoServicio: "Silla Copenhague x2",
      telaColor: "Pana gruesa mostaza",
      monto: 136000,
      fechaPrimerContacto: addDays(hoy, -30),
      fechaEnvioPresupuesto: addDays(hoy, -25),
      estado: "PRESU_RECHAZADO",
      notas: "Le pareció caro el flete a Córdoba.",
      etiquetas: { create: [{ tipoProducto: "COLECCION" }] },
    },
  });

  await prisma.contacto.create({
    data: {
      etapa: "PROSPECTO",
      nombre: "Carla Méndez",
      telefono: "11-3399-0021",
      ciudad: "La Plata",
      provincia: "Buenos Aires",
      perfil: "PARTICULAR",
      origen: "TIENDA_NUBE",
      tagProductoServicio: "Puff a medida para living",
      monto: 52000,
      fechaPrimerContacto: addDays(hoy, -18),
      fechaEnvioPresupuesto: addDays(hoy, -14),
      estado: "PRESU_POSTERGADO",
      followUpManualFecha: addDays(hoy, 10),
      notas: "Pidió retomar en unas semanas, está mudándose.",
      etiquetas: { create: [{ tipoProducto: "PERSONALIZADO" }] },
    },
  });

  const cliBianchi = await prisma.contacto.create({
    data: {
      etapa: "CLIENTE",
      nombre: "Lucía Bianchi",
      telefono: "341-455-8890",
      ciudad: "Rosario",
      provincia: "Santa Fe",
      perfil: "PARTICULAR",
      origen: "WHATSAPP_INSTAGRAM",
      tagProductoServicio: "Sillón Munich tapizado",
      telaColor: "Lino natural crudo",
      monto: 145000,
      fechaPrimerContacto: addDays(hoy, -75),
      fechaEnvioPresupuesto: addDays(hoy, -70),
      estado: "PRESU_APROBADO",
      fechaCierrePresupuesto: addDays(hoy, -68),
      fechaEntrega: addDays(hoy, 3),
      fechaUltimaCompra: addDays(hoy, -220),
      intervaloRecontactoMeses: null,
      etiquetas: { create: [{ tipoProducto: "COLECCION" }] },
    },
  });

  await prisma.presupuesto.create({
    data: {
      contactoId: cliBianchi.id,
      tipo: "OBJETO_COLECCION",
      titulo: "Sillón Munich — Lucía Bianchi",
      estado: "APROBADO",
      envioTipo: "DEFINIDO",
      envioCosto: 9500,
      envioEstado: "COORDINADO",
      plantillaPdf: "CLASICA",
      fecha: addDays(hoy, -70),
      items: {
        create: [
          {
            orden: 0,
            producto: "Sillón Munich",
            medidas: "90x85x75cm",
            tela: "Lino natural crudo",
            color: "Crudo",
            cantidadTela: 3.2,
            precioTelaMetro: 4200,
            manoObraEstructura: 15000,
            manoObraTapiceria: 12000,
            manoObraEstado: "DEFINIDO",
            materialesCosto: 2500,
            unidades: 1,
            precioUnidad: 145000,
          },
        ],
      },
      valoresAdicionales: { create: [{ concepto: "Flete a domicilio", monto: 9500, orden: 0 }] },
    },
  });

  const cobroBianchi = await prisma.cobro.create({
    data: { contactoId: cliBianchi.id, concepto: "Sillón Munich tapizado", categoria: "COLECCION", gananciaTotal: 108000 },
  });
  await prisma.cuota.create({
    data: { cobroId: cobroBianchi.id, numero: 1, fecha: addDays(hoy, -68), monto: 77250, costos: 34000, gastos: 9500, pagada: true, comprobanteEmitido: true, comprobanteTipo: "Factura B", comprobantePuntoVenta: "0001", comprobanteNumero: "00001234" },
  });
  await prisma.cuota.create({
    data: { cobroId: cobroBianchi.id, numero: 2, fecha: addDays(hoy, 3), monto: 77250, costos: 0, gastos: 0, pagada: false },
  });

  const cliOtero = await prisma.contacto.create({
    data: {
      etapa: "CLIENTE",
      nombre: "Fernando Otero",
      telefono: "341-500-1122",
      ciudad: "Rosario",
      provincia: "Santa Fe",
      perfil: "ARQUITECTO",
      origen: "WHATSAPP_INSTAGRAM",
      tagProductoServicio: "Local comercial — dirección de obra",
      monto: 3200000,
      fechaPrimerContacto: addDays(hoy, -140),
      fechaEnvioPresupuesto: addDays(hoy, -130),
      estado: "PRESU_APROBADO",
      fechaCierrePresupuesto: addDays(hoy, -125),
      fechaEntrega: addDays(hoy, 5),
      fechaUltimaCompra: addDays(hoy, -125),
      intervaloRecontactoMeses: 12,
      etiquetas: { create: [{ tipoProducto: "ARQUITECTURA", linea: "COMERCIAL", servicio: "PROYECTO_OBRA" }] },
    },
  });

  await prisma.presupuesto.create({
    data: {
      contactoId: cliOtero.id,
      tipo: "ARQUITECTURA",
      titulo: "Local comercial Av. Pellegrini — Fernando Otero",
      linea: "COMERCIAL",
      servicio: "PROYECTO_OBRA",
      estado: "APROBADO",
      envioTipo: "ESTIMATIVO",
      plantillaPdf: "ACENTO",
      alcance: "Dirección de obra completa: relevamiento, anteproyecto, proyecto ejecutivo y seguimiento en obra hasta entrega.",
      fecha: addDays(hoy, -130),
      items: {
        create: [
          {
            orden: 0,
            producto: "Honorarios dirección de obra",
            honorariosCosto: 850000,
            gastosVarios: 60000,
            unidades: 1,
            precioUnidad: 1800000,
            observaciones: "Incluye visitas semanales a obra durante 6 meses.",
          },
        ],
      },
      valoresAdicionales: { create: [{ concepto: "Gestión de permisos municipales", monto: 120000, orden: 0 }] },
    },
  });

  await prisma.etapaProyecto.createMany({
    data: [
      { contactoId: cliOtero.id, nombre: "Relevamiento", orden: 0, completada: true, fecha: addDays(hoy, -120) },
      { contactoId: cliOtero.id, nombre: "Anteproyecto", orden: 1, completada: true, fecha: addDays(hoy, -95) },
      { contactoId: cliOtero.id, nombre: "Proyecto ejecutivo", orden: 2, completada: true, fecha: addDays(hoy, -50) },
      { contactoId: cliOtero.id, nombre: "Dirección de obra", orden: 3, completada: false, fecha: null },
      { contactoId: cliOtero.id, nombre: "Entrega final", orden: 4, completada: false, fecha: null },
    ],
  });

  await prisma.archivoProyecto.create({ data: { contactoId: cliOtero.id, nombre: "Plano general PB.pdf", tipo: "plano" } });
  await prisma.archivoProyecto.create({ data: { contactoId: cliOtero.id, nombre: "Memoria descriptiva.docx", tipo: "documento" } });

  const cobroOtero = await prisma.cobro.create({
    data: { contactoId: cliOtero.id, concepto: "Dirección de obra local comercial", categoria: "ARQUITECTURA", gananciaTotal: 890000 },
  });
  for (let i = 1; i <= 3; i++) {
    await prisma.cuota.create({
      data: {
        cobroId: cobroOtero.id,
        numero: i,
        fecha: addMonths(addDays(hoy, -125), i - 1),
        monto: 300000,
        costos: 141666,
        gastos: 10000,
        pagada: i < 3,
        comprobanteEmitido: i < 3,
        comprobanteTipo: i < 3 ? "Factura A" : null,
        comprobantePuntoVenta: i < 3 ? "0001" : null,
        comprobanteNumero: i < 3 ? `0000${1000 + i}` : null,
      },
    });
  }

  await prisma.user.upsert({
    where: { email: "fernando.otero@example.com" },
    create: { email: "fernando.otero@example.com", passwordHash: pass, nombre: "Fernando Otero", role: "CLIENTE", contactoId: cliOtero.id },
    update: { contactoId: cliOtero.id },
  });

  const cliSuarez = await prisma.contacto.create({
    data: {
      etapa: "CLIENTE",
      nombre: "Valentina Suárez",
      telefono: "011-2244-7788",
      ciudad: "CABA",
      provincia: "Buenos Aires",
      perfil: "DISENADOR",
      origen: "TIENDA_NUBE",
      tagProductoServicio: "Mesa ratona a medida",
      monto: 87000,
      fechaPrimerContacto: addDays(hoy, -55),
      fechaEnvioPresupuesto: addDays(hoy, -50),
      estado: "PRESU_APROBADO",
      fechaCierrePresupuesto: addDays(hoy, -48),
      fechaEntrega: addDays(hoy, -20),
      fechaUltimaCompra: addDays(hoy, -20),
      intervaloRecontactoMeses: 3,
      etiquetas: { create: [{ tipoProducto: "PERSONALIZADO" }] },
    },
  });

  await prisma.presupuesto.create({
    data: {
      contactoId: cliSuarez.id,
      tipo: "OBJETO_PERSONALIZADO",
      titulo: "Mesa ratona a medida — Valentina Suárez",
      estado: "APROBADO",
      envioTipo: "DEFINIDO",
      envioCosto: 0,
      plantillaPdf: "MINIMAL",
      fecha: addDays(hoy, -50),
      items: {
        create: [
          {
            orden: 0,
            producto: "Mesa ratona roble",
            medidas: "110x60x40cm",
            manoObraEstructura: 20000,
            manoObraTapiceria: 0,
            materialesCosto: 15000,
            costoDiseno: 8000,
            unidades: 1,
            precioUnidad: 87000,
          },
        ],
      },
    },
  });

  const cobroSuarez = await prisma.cobro.create({
    data: { contactoId: cliSuarez.id, concepto: "Mesa ratona a medida", categoria: "PERSONALIZADO", gananciaTotal: 44000 },
  });
  await prisma.cuota.create({
    data: { cobroId: cobroSuarez.id, numero: 1, fecha: addDays(hoy, -20), monto: 87000, costos: 43000, gastos: 0, pagada: true, comprobanteEmitido: true, comprobanteTipo: "Factura B", comprobantePuntoVenta: "0001", comprobanteNumero: "00005541" },
  });

  await prisma.tareaAgenda.create({
    data: { titulo: "Reunión de equipo semanal", tipo: "INTERNA", fechaInicio: addDays(hoy, 2), fechaFin: addDays(hoy, 2), ubicacion: "Taller Pastel Studio", notas: "Revisar pedidos de la semana y stock crítico." },
  });
  await prisma.tareaAgenda.create({
    data: { titulo: "Medición en obra — local Otero", tipo: "CLIENTE_RESERVABLE", contactoId: cliOtero.id, fechaInicio: addDays(hoy, 5), fechaFin: addDays(hoy, 5), ubicacion: "Av. Pellegrini 1450, Rosario" },
  });
  await prisma.tareaAgenda.create({
    data: {
      titulo: "Prueba de tapizado — Sillón Munich",
      tipo: "INTERNA",
      contactoId: cliBianchi.id,
      fechaInicio: hoy,
      fechaFin: addDays(hoy, 0),
      cronometroEstado: "CORRIENDO",
      cronometroSegundos: 1380,
      cronometroInicioTs: addDays(hoy, 0),
    },
  });
  await prisma.franjaBloqueada.create({ data: { fecha: addDays(hoy, 1), horaInicio: "13:00", horaFin: "14:00", motivo: "Almuerzo equipo" } });

  await prisma.gastoGeneral.create({ data: { concepto: "Alquiler taller", categoria: "Fijo", monto: 350000, fecha: addDays(hoy, -5) } });
  await prisma.gastoGeneral.create({ data: { concepto: "Insumos de librería y embalaje", categoria: "Variable", monto: 18500, fecha: addDays(hoy, -2) } });
  await prisma.retiroSocia.create({ data: { socia: "Ana", monto: 200000, fecha: addDays(hoy, -3) } });
  await prisma.retiroSocia.create({ data: { socia: "Julia", monto: 200000, fecha: addDays(hoy, -3) } });

  return "Seed de demo completo: 5 prospectos, 3 clientes, 3 proveedores, 2 productos estándar, agenda, facturación y mensajes de ejemplo.";
}
