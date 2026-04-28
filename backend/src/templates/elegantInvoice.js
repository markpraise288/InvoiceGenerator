const generateElegantInvoice = (doc, invoice, user) => {
  // ==============================
  // 🔧 HELPERS
  // ==============================
  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat(
      currency === "USD" ? "en-US" : "en-MW",
      {
        style: "currency",
        currency: currency,
      }
    ).format(amount);
  };

  // ==============================
  // 🔢 CALCULATIONS (MATCH REACT)
  // ==============================
  const subtotal = (invoice.items || []).reduce(
    (acc, item) => acc + item.quantity * item.price,
    0
  );

  const taxAmount =
    invoice.tax.type === "percentage"
      ? subtotal * (invoice.tax.value / 100)
      : invoice.tax.value;

  const total = subtotal + taxAmount;

  // ==============================
  // 📄 PAGE SETUP
  // ==============================
  const marginX = 50;
  let y = 50;

  // ==============================
  // 🔥 HEADER
  // ==============================
  doc
    .font("Helvetica-Bold")
    .fontSize(22)
    .fillColor("#111111")
    .text(user.companyName || user.name, marginX, y);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#6b7280")
    .text(user.email, marginX, y + 25)
    .text(user.phone, marginX, y + 40);

  // Right side (INVOICE)
  doc
    .font("Helvetica-Bold")
    .fontSize(30)
    .fillColor("#1491a1")
    .text("INVOICE", 400, y, { align: "right" });

  doc
    .fontSize(10)
    .fillColor("#6b7280")
    .text(`#${invoice.invoiceNumber || "0001"}`, 400, y + 35, {
      align: "right",
    });

  y += 80;

  // Divider
  doc.moveTo(marginX, y).lineTo(550, y).stroke("#e5e7eb");
  y += 20;

  // ==============================
  // 🔥 META INFO (3 columns)
  // ==============================
  const colWidth = 150;

  doc
    .fontSize(9)
    .fillColor("#6b7280")
    .text("Issue Date", marginX, y);

  doc
    .font("Helvetica-Bold")
    .fillColor("#111")
    .text(invoice.issueDate || "-", marginX, y + 15);

  doc
    .font("Helvetica")
    .fillColor("#6b7280")
    .text("Due Date", marginX + colWidth, y);

  doc
    .font("Helvetica-Bold")
    .fillColor("#111")
    .text(invoice.dueDate, marginX + colWidth, y + 15);

  doc
    .font("Helvetica")
    .fillColor("#6b7280")
    .text("Status", marginX + colWidth * 2, y, { align: "right" });

  doc
    .font("Helvetica-Bold")
    .fillColor("#111")
    .text(invoice.status, marginX + colWidth * 2, y + 15, {
      align: "right",
    });

  y += 50;

  doc.moveTo(marginX, y).lineTo(550, y).stroke("#e5e7eb");
  y += 20;

  // ==============================
  // 🔥 BILL TO
  // ==============================
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#6b7280")
    .text("Bill To", marginX, y);

  y += 15;

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#111")
    .text(invoice.clientSnapshot.name, marginX, y);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#6b7280")
    .text(invoice.clientSnapshot.email, marginX, y + 15)
    .text(invoice.clientSnapshot.address, marginX, y + 30);

  y += 60;

  doc.moveTo(marginX, y).lineTo(550, y).stroke("#e5e7eb");
  y += 20;

  // ==============================
  // 🔥 TABLE HEADER
  // ==============================
  const tableTop = y;

  // Background (simulate gray header)
  doc.rect(marginX, y, 500, 25).fill("#f3f4f6");

  doc
    .fillColor("#4b5563")
    .font("Helvetica-Bold")
    .fontSize(9);

  doc.text("Description", marginX + 10, y + 7);
  doc.text("Qty", marginX + 260, y + 7, { width: 50, align: "center" });
  doc.text("Rate", marginX + 320, y + 7, { width: 80, align: "center" });
  doc.text("Amount", marginX + 410, y + 7, { width: 80, align: "right" });

  y += 30;

  // ==============================
  // 🔥 TABLE ROWS
  // ==============================
  doc.font("Helvetica").fontSize(10).fillColor("#111");

  (invoice.items || []).forEach((item, i) => {
    const rowHeight = 25;

    // Row divider
    doc
      .moveTo(marginX, y + rowHeight)
      .lineTo(550, y + rowHeight)
      .stroke("#e5e7eb");

    doc.text(item.description, marginX + 10, y + 7);

    doc.text(item.quantity.toString(), marginX + 260, y + 7, {
      width: 50,
      align: "center",
    });

    doc.text(formatCurrency(item.price, invoice.currency), marginX + 320, y + 7, {
      width: 80,
      align: "center",
    });

    doc
      .font("Helvetica-Bold")
      .text(
        formatCurrency(item.price * item.quantity, invoice.currency),
        marginX + 410,
        y + 7,
        { width: 80, align: "right" }
      )
      .font("Helvetica");

    y += rowHeight;
  });

  y += 20;

  // ==============================
  // 🔥 TOTALS
  // ==============================
  const totalsX = marginX;

  doc.fontSize(10);

  doc
    .fillColor("#6b7280")
    .text("Subtotal", totalsX, y);

  doc
    .fillColor("#111")
    .text(formatCurrency(subtotal, invoice.currency), 400, y, {
      align: "right",
    });

  y += 20;

  doc
    .fillColor("#6b7280")
    .text(`Tax (${invoice.tax.value}%)`, totalsX, y);

  doc
    .fillColor("#111")
    .text(formatCurrency(taxAmount, invoice.currency), 400, y, {
      align: "right",
    });

  y += 25;

  // Divider
  doc.moveTo(totalsX, y).lineTo(550, y).stroke("#e5e7eb");
  y += 10;

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor("#1491a1")
    .text("Total", totalsX, y);

  doc
    .text(formatCurrency(total, invoice.currency), 400, y, {
      align: "right",
    });

  y += 40;

  // ==============================
  // 🔥 PAYMENT METHODS
  // ==============================
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111")
    .text("Payment Methods", marginX, y);

  y += 15;

  if (invoice.paymentMethods && invoice.paymentMethods.length > 0) {
    invoice.paymentMethods.forEach((pm) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#111")
        .text(pm.method || "Method", marginX, y);

      if (pm.details) {
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#6b7280")
          .text(pm.details, marginX, y + 12);
        y += 25;
      } else {
        y += 18;
      }
    });
  } else {
    doc
      .font("Helvetica")
      .fillColor("#9ca3af")
      .text("No payment methods provided", marginX, y);
    y += 20;
  }

  // ==============================
  // 🔥 TERMS (RIGHT SIDE)
  // ==============================
  const termsY = y - 80;

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111")
    .text("Terms", 350, termsY);

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#6b7280")
    .text(invoice.terms || "Payment due within 7 days.", 350, termsY + 15, {
      width: 200,
      align: "right",
    });

  y += 30;

  // ==============================
  // 🔥 NOTES
  // ==============================
  if (invoice.notes) {
    doc
      .moveTo(marginX, y)
      .lineTo(550, y)
      .stroke("#e5e7eb");

    y += 10;

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#6b7280")
      .text(invoice.notes, marginX, y);

    y += 30;
  }

  // ==============================
  // 🔥 FOOTER (GRAY BG SIMULATION)
  // ==============================
  const footerY = 700;

  doc.rect(0, footerY, 612, 50).fill("#f9fafb");

  doc
    .fillColor("#6b7280")
    .fontSize(9)
    .text(user.address, marginX, footerY + 15);

  doc.text(user.email, 400, footerY + 15, {
    align: "right",
  });
}

module.exports = generateElegantInvoice;

