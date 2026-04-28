const PDFDocument = require("pdfkit");

// ===== FORMATTERS =====
function formatCurrency(amount, currency) {
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-MW", {
    style: "currency",
    currency,
  }).format(amount || 0);
}

// ===== BADGE =====
function drawBadge(doc, x, y, num) {
  doc
    .circle(x, y, 10)
    .fill("#2563EB");

  doc
    .fillColor("white")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text(String(num), x - 3, y - 5);
}

// ===== MAIN FUNCTION =====
function generateCompactInvoice(doc, invoice, user) {
  const margin = 50;
  let y = 50;

  // ===== CALCULATIONS =====
  const subtotal = (invoice.items || []).reduce(
    (acc, item) => acc + item.quantity * item.price,
    0
  );

  const discountAmount =
    invoice.discount.type === "percentage"
      ? subtotal * (invoice.discount.value / 100)
      : invoice.discount.value;

  const taxableAmount = subtotal - discountAmount;

  const taxAmount =
    invoice.tax.type === "percentage"
      ? taxableAmount * (invoice.tax.value / 100)
      : invoice.tax.value;

  const total = taxableAmount + taxAmount;

  // ===== HEADER =====
  doc
    .font("Helvetica-Bold")
    .fontSize(32)
    .fillColor("#111")
    .text("Invoice", margin, y);

  y += 50;

  // LOGO BOX
  doc
    .rect(margin, y, 120, 50)
    .dash(3, { space: 2 })
    .stroke("#ccc")
    .undash();

  doc
    .fontSize(8)
    .fillColor("#aaa")
    .text("Your Logo", margin + 25, y + 18);

  // RIGHT SIDE (USER)
  drawBadge(doc, 420, 70, 1);

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#111")
    .text(user.companyName, 450, 60, { align: "right", width: 100 });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#666")
    .text(user.address, 450, 75, { align: "right", width: 100 })
    .text(user.phone, 450, 105, { align: "right", width: 100 })
    .text(user.email, 450, 120, { align: "right", width: 100 });

  y += 80;

  // ===== DIVIDER =====
  doc
    .moveTo(margin, y)
    .lineTo(550, y)
    .lineWidth(2)
    .strokeColor("#3B82F6")
    .stroke();

  y += 30;

  // ===== DETAILS =====
  drawBadge(doc, margin + 10, y + 5, 2);

  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor("#888")
    .text("INVOICE DETAILS", margin + 25, y);

  y += 20;

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#555")
    .text("Invoice #", margin + 25, y)
    .text(invoice.invoiceNumber || "0000", margin + 120, y);

  y += 15;

  doc
    .text("Issue Date", margin + 25, y)
    .text(invoice.issueDate || "-", margin + 120, y);

  y += 15;

  doc
    .text("Due Date", margin + 25, y)
    .text(invoice.dueDate || "-", margin + 120, y);

  // ===== BILL TO =====
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor("#888")
    .text("BILL TO", 400, y - 50);

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#111")
    .text(invoice.clientSnapshot.name, 400, y - 35, { width: 150 });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#666")
    .text(invoice.clientSnapshot.address, 400, y - 20, { width: 150 });

  y += 40;

  // ===== ITEMS =====
  drawBadge(doc, margin + 10, y + 5, 3);

  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor("#888")
    .text("ITEMS / SERVICES", margin + 25, y);

  y += 20;

  // TABLE HEADER
  doc
    .rect(margin, y, 500, 20)
    .fill("#F3F4F6");

  doc
    .fillColor("#666")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("Description", margin + 10, y + 5)
    .text("Qty", margin + 260, y + 5, { width: 50, align: "center" })
    .text("Rate", margin + 310, y + 5, { width: 80, align: "center" })
    .text("Amount", margin + 400, y + 5, { width: 80, align: "right" });

  y += 25;

  // ROWS
  invoice.items.forEach((item) => {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#111")
      .text(item.description, margin + 10, y)
      .text(item.quantity.toString(), margin + 260, y, {
        width: 50,
        align: "center",
      })
      .text(formatCurrency(item.price, invoice.currency), margin + 310, y, {
        width: 80,
        align: "center",
      })
      .text(
        formatCurrency(item.quantity * item.price, invoice.currency),
        margin + 400,
        y,
        { width: 80, align: "right" }
      );

    y += 20;

    doc
      .moveTo(margin, y - 5)
      .lineTo(550, y - 5)
      .strokeColor("#eee")
      .stroke();
  });

  y += 30;

  // ===== SUMMARY CARD =====
  const summaryX = 320;
  const boxWidth = 230;

  doc
    .roundedRect(summaryX, y, boxWidth, 120, 10)
    .fill("#F9FAFB");

  let sy = y + 15;

  doc
    .fontSize(10)
    .fillColor("#333")
    .text("Subtotal", summaryX + 15, sy)
    .text(formatCurrency(subtotal, invoice.currency), summaryX + 120, sy);

  sy += 20;

  doc
    .fillColor("#777")
    .text("Discount", summaryX + 15, sy)
    .text(`-${formatCurrency(discountAmount, invoice.currency)}`, summaryX + 120, sy);

  sy += 20;

  doc
    .text("Tax", summaryX + 15, sy)
    .text(formatCurrency(taxAmount, invoice.currency), summaryX + 120, sy);

  sy += 25;

  doc
    .moveTo(summaryX + 10, sy)
    .lineTo(summaryX + boxWidth - 10, sy)
    .stroke();

  sy += 10;

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#2563EB")
    .text("Total", summaryX + 15, sy)
    .text(formatCurrency(total, invoice.currency), summaryX + 120, sy);

  y += 150;

  // ===== PAYMENT + TERMS =====
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#111")
    .text("Payment Methods", margin, y);

  let py = y + 15;

  if (invoice.paymentMethods?.length) {
    invoice.paymentMethods.forEach((pm) => {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#444")
        .text(pm.method, margin, py);

      if (pm.details) {
        doc
          .fontSize(8)
          .fillColor("#777")
          .text(pm.details, margin, py + 10);
      }

      py += 25;
    });
  } else {
    doc.text("No payment methods provided", margin, py);
  }

  // TERMS
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#111")
    .text("Terms", 350, y);

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#666")
    .text(invoice.terms || "Payment due within 7 days.", 350, y + 15, {
      width: 200,
      align: "right",
    });

  y = Math.max(py, y + 60);

  // ===== NOTES =====
  if (invoice.notes) {
    y += 20;

    doc
      .moveTo(margin, y)
      .lineTo(550, y)
      .strokeColor("#ddd")
      .stroke();

    y += 10;

    doc
      .fontSize(9)
      .fillColor("#666")
      .text(invoice.notes, margin, y);
  }

  y += 40;

  // ===== FOOTER =====
  doc
    .moveTo(margin, y)
    .lineTo(550, y)
    .strokeColor("#ddd")
    .stroke();

  y += 10;

  doc
    .fontSize(9)
    .fillColor("#999")
    .text(`Generated by ${user.companyName}`, margin, y);

  doc
    .text("Thank you for your business", 350, y, {
      align: "right",
      width: 200,
    });
}

module.exports = generateCompactInvoice;