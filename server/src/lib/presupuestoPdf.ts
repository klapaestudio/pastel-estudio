import PDFDocument from "pdfkit";
import { Response } from "express";
import { calcItem, calcPresupuesto } from "./presupuestoCalc";

const ACCENT = "#A57442";
const BG = "#DBC8AD";

interface PresupuestoPdfData {
  titulo: string;
  contactoNombre: string;
  fecha: Date;
  items: any[];
  envioTipo: string;
  envioCosto: number;
  notas: string | null;
  alcance?: string | null;
  valoresAdicionales?: { concepto: string; monto: number }[];
}

// Genera el PDF de cara al cliente: sin costos ni margen, solo lo que se vende.
export function streamPresupuestoPdf(res: Response, data: PresupuestoPdfData, plantilla: string) {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="presupuesto.pdf"`);
  doc.pipe(res);

  const calcs = data.items.map((it) => calcItem(it));
  const valoresAdicionales = data.valoresAdicionales || [];
  const totales = calcPresupuesto(calcs, data.envioCosto, valoresAdicionales);

  if (plantilla === "ACENTO") {
    doc.rect(0, 0, doc.page.width, 130).fill(ACCENT);
    doc.fillColor("#FFFFFF").fontSize(26).text("Pastel Studio", 50, 45);
    doc.fontSize(12).text(data.titulo, 50, 80);
    doc.fillColor("#000000");
    doc.y = 160;
  } else if (plantilla === "MINIMAL") {
    doc.fillColor("#000000").fontSize(20).text("Pastel Studio", { align: "left" });
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor("#666666").text(data.titulo);
    doc.moveDown(1.5);
  } else {
    // CLASICA
    doc.rect(0, 0, doc.page.width, 90).fill(BG);
    doc.fillColor("#000000").fontSize(22).text("Pastel Studio", 50, 30);
    doc.fontSize(11).text(data.titulo, 50, 60);
    doc.fillColor("#000000");
    doc.y = 120;
  }

  doc.moveDown(1);
  doc.fontSize(11).fillColor("#000000");
  doc.text(`Cliente: ${data.contactoNombre}`);
  doc.text(`Fecha: ${data.fecha.toLocaleDateString("es-AR")}`);
  doc.moveDown(1);

  if (data.alcance) {
    doc.fontSize(10).fillColor(ACCENT).text("Alcance del proyecto", { underline: false });
    doc.fillColor("#000000").fontSize(10.5).text(data.alcance);
    doc.moveDown(1);
  }

  const startX = 50;
  let y = doc.y;

  // Tabla de items (solo venta, sin costos) — objetos personalizados
  if (data.items.length > 0) {
    doc.fontSize(10).fillColor(ACCENT);
    doc.text("Producto", startX, y, { width: 180, continued: false });
    doc.text("Detalle", startX + 180, y, { width: 140 });
    doc.text("Unid.", startX + 320, y, { width: 50 });
    doc.text("P. Unit.", startX + 370, y, { width: 80 });
    doc.text("Subtotal", startX + 450, y, { width: 90 });
    y += 18;
    doc.moveTo(startX, y).lineTo(545, y).strokeColor(ACCENT).stroke();
    y += 8;

    doc.fillColor("#000000");
    data.items.forEach((it, idx) => {
      const c = calcs[idx];
      const detalle = [it.medidas, it.tela, it.color].filter(Boolean).join(" · ");
      doc.fontSize(10);
      doc.text(it.producto, startX, y, { width: 180 });
      doc.text(detalle, startX + 180, y, { width: 140 });
      doc.text(String(it.unidades), startX + 320, y, { width: 50 });
      doc.text(fmtMoney(it.precioUnidad), startX + 370, y, { width: 80 });
      doc.text(fmtMoney(c.subtotalVenta), startX + 450, y, { width: 90 });
      y += 22;
    });
    y += 6;
    doc.moveTo(startX, y).lineTo(545, y).strokeColor("#CCCCCC").stroke();
    y += 12;
  }

  // Costes del proyecto / valores a considerar
  if (valoresAdicionales.length > 0) {
    doc.fillColor("#000000");
    valoresAdicionales.forEach((v) => {
      doc.fontSize(10.5).text(v.concepto, startX, y, { width: 370 });
      doc.text(fmtMoney(v.monto), startX + 450, y, { width: 90 });
      y += 20;
    });
    y += 6;
    doc.moveTo(startX, y).lineTo(545, y).strokeColor("#CCCCCC").stroke();
    y += 12;
  }

  if (data.envioCosto > 0) {
    doc.fontSize(10).text(`Envío (${data.envioTipo === "DEFINIDO" ? "definido" : "estimativo"})`, startX, y, { width: 370 });
    doc.text(fmtMoney(data.envioCosto), startX + 450, y, { width: 90 });
    y += 22;
  }

  doc.fontSize(13).fillColor(ACCENT).text("TOTAL", startX, y, { width: 370 });
  doc.text(fmtMoney(totales.total), startX + 450, y, { width: 90 });

  if (data.notas) {
    doc.moveDown(3);
    doc.fontSize(10).fillColor("#000000").text("Notas:", { underline: true });
    doc.text(data.notas);
  }

  doc.end();
}

function fmtMoney(n: number): string {
  return `$ ${Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
}
