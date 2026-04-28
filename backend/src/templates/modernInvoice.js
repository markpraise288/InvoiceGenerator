const generateModernInvoice = (doc, invoice, user) => {
  // ==============================
  // 🔧 HELPERS
  // ==============================
  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat(
      currency === "USD" ? "en-US" : "en-MW",
      {
        style: "currency",
        currency,
      }
    ).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // ==============================
  // 🔢 CALCULATIONS (EXACT MATCH)
  // ==============================
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

  const dueDate = formatDate(invoice.dueDate);

  // ==============================
  // 📄 PAGE SETUP
  // ==============================
  const marginX = 50;
  let y = 0;

  // ==============================
  // 🔥 HEADER (GRADIENT SIMULATION)
  // ==============================
  const headerHeight = 120;

  // Simulated gradient (3 layers)
  doc.rect(0, 0, 612, headerHeight).fill("#0f766e");
  doc.rect(0, 0, 612, headerHeight).fillOpacity(0.6).fill("#14b8a6");
  doc.rect(0, 0, 612, headerHeight).fillOpacity(0.4).fill("#5eead4");
  doc.fillOpacity(1);

  // Overlay (dark layer)
  doc.rect(0, 0, 612, headerHeight).fillOpacity(0.1).fill("#000");
  doc.fillOpacity(1);

  // LEFT
  doc
    .font("Helvetica-Bold")
    .fontSize(32)
    .fillColor("#ffffff")
    .text("Invoice", marginX, 40);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#e6fffa")
    .text(`Due: ${dueDate}`, marginX, 80);

  // RIGHT
  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor("#ffffff")
    .text(user.companyName || user.name, 350, 40, { align: "right" });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#ccfbf1")
    .text(`#${invoice.invoiceNumber || "0000"}`, 350, 65, {
      align: "right",
    });

  y = headerHeight + 30;

  // ==============================
  // 🔹 BODY START
  // ==============================
  // ==============================
  // 🔥 CLIENT + FROM
  // ==============================
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#9ca3af")
    .text("BILL TO", marginX, y);

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#111")
    .text(invoice.clientSnapshot.name, marginX, y + 15);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#6b7280")
    .text(invoice.clientSnapshot.email, marginX, y + 30)
    .text(invoice.clientSnapshot.address, marginX, y + 45);

  // RIGHT SIDE (FROM)
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#9ca3af")
    .text("FROM", 350, y, { align: "right" });

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#111")
    .text(user.name, 350, y + 15, { align: "right" });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#6b7280")
    .text(user.email, 350, y + 30, { align: "right" })
    .text(user.phone, 350, y + 45, { align: "right" });

  y += 100;

  // ==============================
  // 🔥 TABLE CONTAINER
  // ==============================
  const tableX = marginX;
  const tableWidth = 500;

  // Border container
  doc.roundedRect(tableX, y, tableWidth, 25).stroke("#e5e7eb");

  // Header background
  doc.rect(tableX, y, tableWidth, 25).fill("#f9fafb");

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#6b7280");

  doc.text("Description", tableX + 10, y + 8);
  doc.text("Qty", tableX + 260, y + 8, { width: 50, align: "center" });
  doc.text("Price", tableX + 320, y + 8, { width: 80, align: "right" });
  doc.text("Total", tableX + 410, y + 8, { width: 80, align: "right" });

  y += 25;

  // ==============================
  // 🔥 TABLE ROWS
  // ==============================
  doc.font("Helvetica").fontSize(10).fillColor("#111");

  (invoice.items || []).forEach((item) => {
    const rowHeight = 28;

    doc
      .moveTo(tableX, y + rowHeight)
      .lineTo(tableX + tableWidth, y + rowHeight)
      .stroke("#e5e7eb");

    doc.text(item.description, tableX + 10, y + 8);

    doc
      .fillColor("#6b7280")
      .text(item.quantity.toString(), tableX + 260, y + 8, {
        width: 50,
        align: "center",
      });

    doc
      .text(formatCurrency(item.price, invoice.currency), tableX + 320, y + 8, {
        width: 80,
        align: "right",
      });

    doc
      .fillColor("#111")
      .font("Helvetica-Bold")
      .text(
        formatCurrency(item.price * item.quantity, invoice.currency),
        tableX + 410,
        y + 8,
        { width: 80, align: "right" }
      )
      .font("Helvetica");

    y += rowHeight;
  });

  y += 30;

  // ==============================
  // 🔥 TOTALS (RIGHT BLOCK)
  // ==============================
  const totalsX = 300;

  doc.fontSize(10);

  doc
    .fillColor("#6b7280")
    .text("Subtotal", totalsX, y);

  doc
    .fillColor("#111")
    .text(formatCurrency(subtotal, invoice.currency), 450, y, {
      align: "right",
    });

  y += 20;

  if (discountAmount > 0) {
    doc
      .fillColor("#dc2626")
      .text("Discount", totalsX, y);

    doc.text(
      "-" + formatCurrency(discountAmount, invoice.currency),
      450,
      y,
      { align: "right" }
    );

    y += 20;
  }

  doc
    .fillColor("#6b7280")
    .text("Tax", totalsX, y);

  doc
    .fillColor("#111")
    .text(formatCurrency(taxAmount, invoice.currency), 450, y, {
      align: "right",
    });

  y += 25;

  doc.moveTo(totalsX, y).lineTo(550, y).stroke("#e5e7eb");
  y += 10;

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor("#0f766e")
    .text("Total", totalsX, y);

  doc.text(formatCurrency(total, invoice.currency), 450, y, {
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
  // 🔥 TERMS (RIGHT)
  // ==============================
  const termsY = y - 50;

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
      align: "left",
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
  // 🔥 FOOTER (GRADIENT SIMULATION)
  // ==============================
  const footerY = 720;

  doc.rect(0, footerY, 612, 50).fill("#5eead4");
  doc.rect(0, footerY, 612, 50).fillOpacity(0.6).fill("#14b8a6");
  doc.rect(0, footerY, 612, 50).fillOpacity(0.4).fill("#0f766e");
  doc.fillOpacity(1);

  doc
    .fillColor("#ffffff")
    .fontSize(10)
    .text(user.companyName, marginX, footerY + 18);

  doc.text(user.email, 400, footerY + 18, {
    align: "right",
  });
}

module.exports = generateModernInvoice;