const PDFDocument = require("pdfkit");

// ===== MAIN FUNCTION =====
function generateCorporateWave(doc, invoice, user) {
  const margin = 50;
  let y = 0;

  // ===== CALCULATIONS =====
  const subtotal = invoice.items.reduce(
    (acc, item) => acc + item.quantity * item.price,
    0
  );

  const discount =
    invoice.discount.type === "percentage"
      ? (subtotal * invoice.discount.value) / 100
      : invoice.discount.value;

  const tax =
    invoice.tax.type === "percentage"
      ? ((subtotal - discount) * invoice.tax.value) / 100
      : invoice.tax.value;

  const total = subtotal - discount + tax;

  // ===== HEADER (GRADIENT SIMULATION) =====
  doc.rect(0, 0, 612, 100).fill("#1E3A8A"); // blue
  doc.rect(0, 50, 612, 50).fill("#1F2937"); // slate overlay

  // TITLE
  doc
    .fillColor("white")
    .font("Helvetica-Bold")
    .fontSize(28)
    .text("INVOICE", margin, 40);

  // USER INFO (TOP RIGHT)
  doc
    .fontSize(12)
    .text(user.companyName || user.name, 350, 35, {
      align: "right",
      width: 200,
    });

  doc
    .fontSize(9)
    .fillColor("#E5E7EB")
    .text(user.email, 350, 55, { align: "right", width: 200 });

  y = 130;

  // ===== CLIENT + META =====
  // LEFT (CLIENT)
  doc
    .fillColor("#333")
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("Invoice To:", margin, y);

  doc
    .font("Helvetica")
    .fontSize(10)
    .text(invoice.clientSnapshot.name, margin, y + 15)
    .text(invoice.clientSnapshot.email, margin, y + 30)
    .text(invoice.clientSnapshot.phone, margin, y + 45)
    .text(invoice.clientSnapshot.address, margin, y + 60, {
      width: 220,
    });

  // RIGHT (META)
  doc
    .font("Helvetica")
    .fontSize(10)
    .text(`Invoice No: ${invoice.invoiceNumber || "-"}`, 350, y)
    .text(`Issue Date: ${invoice.issueDate || "-"}`, 350, y + 15)
    .text(`Due Date: ${invoice.dueDate}`, 350, y + 30, {
      align: "right",
      width: 200,
    });

  y += 110;

  // ===== TABLE =====
  const tableTop = y;

  // HEADER
  doc.rect(margin, tableTop, 500, 20).fill("#1F2937");

  doc
    .fillColor("white")
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("SL", margin + 5, tableTop + 5)
    .text("Item Description", margin + 40, tableTop + 5)
    .text("Price", margin + 250, tableTop + 5)
    .text("Qty", margin + 330, tableTop + 5)
    .text("Total", margin + 400, tableTop + 5);

  y = tableTop + 25;

  // ROWS
  doc.font("Helvetica").fillColor("#374151");

  invoice.items.forEach((item, i) => {
    doc
      .fontSize(9)
      .text(String(i + 1).padStart(2, "0"), margin + 5, y)
      .text(item.description, margin + 40, y, { width: 200 })
      .text(`${invoice.currency} ${item.price}`, margin + 280, y)
      .text(item.quantity.toString(), margin + 330, y)
      .text(
        `${invoice.currency} ${item.quantity * item.price}`,
        margin + 400,
        y
      );

    y += 20;

    // row divider
    doc
      .moveTo(margin, y - 5)
      .lineTo(550, y - 5)
      .strokeColor("#E5E7EB")
      .stroke();
  });

  y += 30;

  // ===== FOOT SECTION =====

  // LEFT (PAYMENT INFO)
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111")
    .text("Payment Info", margin, y);

  doc
    .font("Helvetica")
    .fontSize(10)
    .text(`Account Name: ${user.companyName || user.name}`, margin, y + 15)
    .text(`Email: ${user.email}`, margin, y + 30)
    .text(`Phone: ${user.phone}`, margin, y + 45)
    .text(`Address: ${user.address}`, margin, y + 60);

  // RIGHT (TOTALS)
  let ty = y;

  doc
    .font("Helvetica")
    .fontSize(10)
    .text(`Sub Total: ${invoice.currency} ${subtotal.toFixed(2)}`, 350, ty)
    .text(
      `Discount: -${invoice.currency} ${discount.toFixed(2)}`,
      350,
      ty + 15
    )
    .text(`Tax: ${invoice.currency} ${tax.toFixed(2)}`, 350, ty + 30);

  // TOTAL BOX
  doc
    .rect(350, ty + 50, 160, 25)
    .fill("#1F2937");

  doc
    .fillColor("white")
    .font("Helvetica-Bold")
    .text(
      `Total: ${invoice.currency} ${total.toFixed(2)}`,
      360,
      ty + 58
    );

  // SIGNATURE
  doc
    .fillColor("#6B7280")
    .font("Helvetica-Oblique")
    .text(user.name, 350, ty + 95);

  doc
    .fontSize(8)
    .text("Authorized Signature", 350, ty + 110);

  y += 140;

  // ===== PAYMENT METHODS + TERMS =====
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111")
    .text("Payment Methods", margin, y);

  let py = y + 15;

  if (invoice.paymentMethods?.length) {
    invoice.paymentMethods.forEach((pm) => {
      doc
        .font("Helvetica")
        .fontSize(10)
        .text(pm.method, margin, py);

      if (pm.details) {
        doc
          .fontSize(8)
          .fillColor("#666")
          .text(pm.details, margin, py + 10);
      }

      py += 25;
    });
  } else {
    doc.text("No payment methods provided", margin, py);
  }

  // TERMS (RIGHT)
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111")
    .text("Terms", 350, y);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#666")
    .text(invoice.terms || "Payment due within 7 days.", 350, y + 15, {
      width: 200,
      align: "right",
    });

  y = Math.max(py, y + 70);

  // ===== NOTES =====
  if (invoice.notes) {
    y += 20;

    doc
      .moveTo(margin, y)
      .lineTo(550, y)
      .strokeColor("#D1D5DB")
      .stroke();

    y += 10;

    doc
      .fontSize(10)
      .fillColor("#555")
      .text(invoice.notes, margin, y);
  }

  y += 40;

  // ===== FOOTER =====
  doc.rect(0, y, 612, 60).fill("#1F2937");

  doc
    .fillColor("white")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("Get in Touch", margin, y + 10);

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(user.phone, margin, y + 25)
    .text(user.address, margin, y + 40);
}

module.exports = generateCorporateWave;