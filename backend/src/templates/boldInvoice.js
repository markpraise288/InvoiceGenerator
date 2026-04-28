const PDFDocument = require("pdfkit");

const generateBoldSubscriptionInvoice = (
  doc,
  invoice,
  user
) => {
  const sub = invoice.subscriptionDetails || {};

  const price = invoice.items?.[0]?.price || 0;

  const discount =
    invoice.discount?.type === "percentage"
      ? price * (invoice.discount.value / 100)
      : invoice.discount?.value || 0;

  const taxable = price - discount;

  const tax =
    invoice.tax?.type === "percentage"
      ? taxable * (invoice.tax.value / 100)
      : invoice.tax?.value || 0;

  const total = taxable + tax;

  const formatCurrency = (amount) =>
    new Intl.NumberFormat(
      invoice.currency === "USD" ? "en-US" : "en-MW",
      {
        style: "currency",
        currency: invoice.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }
    ).format(amount);

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const startX = 50;
  let y = 50;

  // ================= HEADER =================
  doc
    .fontSize(24)
    .font("Helvetica-Bold")
    .text("Subscription Invoice", startX, y);

  doc
    .fontSize(10)
    .fillColor("gray")
    .text(`#${invoice.invoiceNumber || "00001"}`, startX, y + 30);

  // RIGHT SIDE (Company)
  doc
    .fontSize(12)
    .fillColor("black")
    .text(user.companyName || user.name, 400, y, { align: "right" });

  doc
    .fontSize(10)
    .fillColor("gray")
    .text(user.email, 400, y + 18, { align: "right" });

  doc.text(user.phone, 400, y + 32, { align: "right" });

  y += 80;

  // ================= CLIENT =================
  doc
    .fontSize(9)
    .fillColor("gray")
    .text("BILL TO", startX, y);

  y += 15;

  doc
    .fontSize(11)
    .fillColor("black")
    .text(invoice.clientSnapshot.name, startX, y);

  doc
    .fontSize(10)
    .fillColor("gray")
    .text(invoice.clientSnapshot.email, startX, y + 15);

  // RIGHT META
  doc
    .fontSize(10)
    .fillColor("black")
    .text(`Issue: ${formatDate(invoice.issueDate)}`, 400, y, {
      align: "right",
    });

  doc.text(
    `Next Billing: ${formatDate(sub?.nextBillingDate)}`,
    400,
    y + 15,
    { align: "right" }
  );

  y += 60;

  // ================= PLAN CARD =================
  doc
    .roundedRect(startX, y, 500, 70, 10)
    .fill("#2563eb");

  doc.fillColor("white");

  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(sub?.planName || "Subscription Plan", startX + 20, y + 15);

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(
      sub?.billingCycle === "yearly"
        ? "Billed yearly"
        : "Billed monthly",
      startX + 20,
      y + 35
    );

  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text(formatCurrency(price), 400, y + 15, { align: "right" });

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(`per ${sub?.billingCycle || "month"}`, 400, y + 40, {
      align: "right",
    });

  doc.fillColor("black");

  y += 100;

  // ================= SUB DETAILS =================
  const boxWidth = 240;
  const boxHeight = 50;

  const drawBox = (x, yPos, label, value) => {
    doc.roundedRect(x, yPos, boxWidth, boxHeight, 6).fill("#f3f4f6");

    doc
      .fillColor("gray")
      .fontSize(8)
      .text(label, x + 10, yPos + 8);

    doc
      .fillColor("black")
      .fontSize(11)
      .text(value, x + 10, yPos + 22);
  };

  drawBox(startX, y, "Start Date", formatDate(sub?.startDate));
  drawBox(310, y, "End Date", formatDate(sub?.endDate));

  y += 60;

  drawBox(startX, y, "Billing Cycle", sub?.billingCycle || "-");
  drawBox(310, y, "Status", invoice.status);

  y += 80;

  // ================= SUMMARY =================
  const summaryX = 350;

  doc
    .roundedRect(summaryX, y, 200, 120, 8)
    .fill("#f9fafb");

  let sy = y + 15;

  const line = (label, value, isBold = false) => {
    doc
      .fillColor("black")
      .font(isBold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(10)
      .text(label, summaryX + 10, sy);

    doc.text(value, summaryX + 10, sy, {
      align: "right",
      width: 180,
    });

    sy += 18;
  };

  line("Plan Price", formatCurrency(price));

  if (discount > 0) {
    doc.fillColor("red");
    line("Discount", `-${formatCurrency(discount)}`);
    doc.fillColor("black");
  }

  line("Tax", formatCurrency(tax));

  // Divider
  doc
    .moveTo(summaryX + 10, sy)
    .lineTo(summaryX + 190, sy)
    .strokeColor("#ddd")
    .stroke();

  sy += 10;

  line("Total", formatCurrency(total), true);

  y += 150;

  // ================= PAYMENT + TERMS =================
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("Payment Methods", startX, y);

  y += 15;

  if (invoice.paymentMethods?.length) {
    invoice.paymentMethods.forEach((pm) => {
      doc
        .font("Helvetica")
        .fontSize(10)
        .text(`${pm.method}: ${pm.details || ""}`, startX, y);
      y += 15;
    });
  } else {
    doc.text("No payment methods provided", startX, y);
    y += 15;
  }

  // TERMS
  doc
    .font("Helvetica-Bold")
    .text("Terms", 350, y - 30, { align: "right" });

  doc
    .font("Helvetica")
    .fontSize(10)
    .text(invoice.terms || "Payment due within 7 days.", 350, y - 15, {
      align: "right",
      width: 200,
    });

  y += 30;

  // ================= NOTES =================
  if (invoice.notes) {
    doc
      .moveTo(startX, y)
      .lineTo(550, y)
      .strokeColor("#ddd")
      .stroke();

    y += 10;

    doc
      .fontSize(10)
      .fillColor("gray")
      .text(invoice.notes, startX, y);
  }

  y += 40;

  // ================= FOOTER =================
  doc
    .moveTo(startX, y)
    .lineTo(550, y)
    .strokeColor("#ddd")
    .stroke();

  y += 10;

  doc
    .fontSize(9)
    .fillColor("gray")
    .text(user.companyName, startX, y);

  doc.text(user.email, 400, y, { align: "right" });
};

module.exports = generateBoldSubscriptionInvoice;