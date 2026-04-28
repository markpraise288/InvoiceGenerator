const generateServiceInvoice = (doc, invoice, user) => {
  // ==============================
  // 🔧 HELPERS
  // ==============================
  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat(
      currency === "USD" ? "en-US" : "en-MW",
      {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }
    ).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // ==============================
  // 🔢 CALCULATIONS (EXACT MATCH)
  // ==============================
  const service = invoice.serviceDetails || {};
  const totalHours = service.totalHours || 0;
  const hourlyRate = service.hourlyRate || 0;

  const subtotal = totalHours * hourlyRate;

  const discountAmount =
    invoice.discount?.type === "percentage"
      ? subtotal * (invoice.discount.value / 100)
      : invoice.discount?.value || 0;

  const afterDiscount = subtotal - discountAmount;

  const taxAmount =
    invoice.tax?.type === "percentage"
      ? afterDiscount * (invoice.tax.value / 100)
      : invoice.tax?.value || 0;

  const shipping = Number(invoice.shipping || 0);

  const total = afterDiscount + taxAmount + shipping;

  const paid =
    invoice.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;

  const balance = total - paid;

  // ==============================
  // 📄 PAGE SETUP
  // ==============================
  const marginX = 50;
  let y = 60;

  // ==============================
  // 🔥 HEADER
  // ==============================
  doc
    .font("Helvetica-Bold")
    .fontSize(32)
    .fillColor("#111")
    .text("Invoice", marginX, y);

  doc
    .fontSize(12)
    .fillColor("#9ca3af")
    .text(`#${invoice.invoiceNumber || "0000"}`, marginX, y + 40);

  // RIGHT SIDE (company + status)
  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor("#111")
    .text(user.companyName || user.name, 350, y, { align: "right" });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#6b7280")
    .text(user.email, 350, y + 20, { align: "right" })
    .text(user.phone, 350, y + 35, { align: "right" });

  // STATUS BADGE (simulated)
  const statusColors = {
    paid: "#16a34a",
    overdue: "#dc2626",
    draft: "#6b7280",
    sent: "#2563eb",
    partial: "#ea580c",
    cancelled: "#374151",
    viewed: "#7c3aed",
  };

  const statusColor = statusColors[invoice.status] || "#6b7280";

  doc
    .roundedRect(450, y + 55, 100, 20, 10)
    .fillOpacity(0.1)
    .fill(statusColor);

  doc
    .fillOpacity(1)
    .fillColor(statusColor)
    .fontSize(9)
    .text(invoice.status, 450, y + 60, {
      width: 100,
      align: "center",
    });

  y += 110;

  // ==============================
  // 🔥 CLIENT + DATES
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

  // RIGHT SIDE DATES
  doc
    .fontSize(9)
    .fillColor("#9ca3af")
    .text("Issue", 400, y, { align: "right" });

  doc
    .font("Helvetica-Bold")
    .fillColor("#111")
    .text(formatDate(invoice.issueDate), 400, y + 15, {
      align: "right",
    });

  doc
    .font("Helvetica")
    .fillColor("#9ca3af")
    .text("Due", 400, y + 35, { align: "right" });

  doc
    .font("Helvetica-Bold")
    .fillColor("#111")
    .text(formatDate(invoice.dueDate), 400, y + 50, {
      align: "right",
    });

  y += 100;

  // ==============================
  // 🔥 SERVICE SUMMARY (3 BOXES)
  // ==============================
  const boxWidth = 160;
  const boxHeight = 70;

  const startX = marginX;

  // Background container
  doc.roundedRect(marginX, y, 500, boxHeight, 10).fill("#f9fafb");

  const drawBox = (x, title, value) => {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#9ca3af")
      .text(title, x, y + 15, { width: boxWidth, align: "center" });

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor("#111")
      .text(value, x, y + 35, { width: boxWidth, align: "center" });
  };

  drawBox(startX, "PROJECT", service.projectName || "Freelance Work");
  drawBox(startX + boxWidth, "TOTAL HOURS", `${totalHours} hrs`);
  drawBox(
    startX + boxWidth * 2,
    "HOURLY RATE",
    formatCurrency(hourlyRate, invoice.currency)
  );

  y += 100;

  // ==============================
  // 🔥 COST BREAKDOWN (RIGHT CARD)
  // ==============================
  const cardX = 300;
  const cardWidth = 250;

  doc.roundedRect(cardX, y, cardWidth, 180, 10).fill("#f9fafb");

  let cy = y + 15;

  const line = (label, value, color = "#111") => {
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(color)
      .text(label, cardX + 15, cy);

    doc.text(value, cardX + 15, cy, {
      width: cardWidth - 30,
      align: "right",
    });

    cy += 20;
  };

  line("Service Total", formatCurrency(subtotal, invoice.currency));

  if (discountAmount > 0) {
    line(
      "Discount",
      "-" + formatCurrency(discountAmount, invoice.currency),
      "#dc2626"
    );
  }

  if (taxAmount > 0) {
    line("Tax", formatCurrency(taxAmount, invoice.currency));
  }

  if (shipping > 0) {
    line("Expenses / Shipping", formatCurrency(shipping, invoice.currency));
  }

  // Divider
  doc.moveTo(cardX + 15, cy).lineTo(cardX + cardWidth - 15, cy).stroke("#e5e7eb");
  cy += 10;

  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor("#111")
    .text("Total", cardX + 15, cy);

  doc.text(formatCurrency(total, invoice.currency), cardX + 15, cy, {
    width: cardWidth - 30,
    align: "right",
  });

  cy += 25;

  if (paid > 0) {
    line("Paid", "-" + formatCurrency(paid, invoice.currency), "#16a34a");

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#111")
      .text("Balance Due", cardX + 15, cy);

    doc.text(formatCurrency(balance, invoice.currency), cardX + 15, cy, {
      width: cardWidth - 30,
      align: "right",
    });
  }

  y += 200;

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
  const termsY = y - 60;

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
  // 🔥 SIGNATURE
  // ==============================
  doc
    .fontSize(9)
    .fillColor("#9ca3af")
    .text("Prepared by", 400, y, { align: "right" });

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#111")
    .text(user.name, 400, y + 15, { align: "right" });
}

module.exports = generateServiceInvoice;