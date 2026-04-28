const PDFDocument = require("pdfkit");

function formatMoney(number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(number);
}

function formatDate(date) {
  return date ? date.split("T")[0] : "-";
}

function generateClassicInvoice(doc, invoice, user) {
  // ===== CALCULATIONS =====
  const subtotal = invoice.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const taxAmount = subtotal * (invoice.tax.value / 100);
  const discountAmount = subtotal * (invoice.discount.value / 100);
  const total = subtotal + taxAmount - discountAmount;

  // ===== START =====
  doc.font("Helvetica");

  let marginX = 50;
  let y = 50;

  // ===== HEADER LEFT =====
  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text(user.companyName || "[ Company Name ]", marginX, y);

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("gray")
    .text(user.address || "[ Address ]", marginX, y + 25)
    .text(user.phone || "[ Phone # ]", marginX, y + 40)
    .text(user.email || "[ Email ]", marginX, y + 55);

  // ===== HEADER RIGHT =====
  doc
    .fontSize(22)
    .font("Helvetica-Bold")
    .fillColor("#1D4ED8")
    .text("INVOICE", 400, y);

  doc
    .fontSize(10)
    .fillColor("#60A5FA")
    .text(`Due Date: ${formatDate(invoice.dueDate)}`, 400, y + 30);

  y += 110;

  // ===== BILL TO =====
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .fillColor("#1D4ED8")
    .text("Bill To:", marginX, y);

  y += 20;

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("black")
    .text(invoice.clientSnapshot.name, marginX, y)
    .text(invoice.clientSnapshot.address, marginX, y + 15)
    .text(invoice.clientSnapshot.phone, marginX, y + 30)
    .text(invoice.clientSnapshot.email, marginX, y + 45);

  y += 90;

  // ===== TABLE HEADER =====
  const tableTop = y;

  doc
    .rect(marginX, tableTop, 500, 20)
    .fill("#1D4ED8");

  doc
    .fillColor("white")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("Description", marginX + 5, tableTop + 5)
    .text("Qty", marginX + 250, tableTop + 5, { width: 50, align: "center" })
    .text("Price", marginX + 310, tableTop + 5, { width: 80, align: "center" })
    .text("Total", marginX + 400, tableTop + 5, { width: 80, align: "center" });

  y = tableTop + 25;

  // ===== TABLE ROWS =====
  doc.font("Helvetica").fillColor("black");

  invoice.items.forEach((item) => {
    doc
      .fontSize(10)
      .text(item.description, marginX + 5, y)
      .text(item.quantity.toString(), marginX + 250, y, {
        width: 50,
        align: "center",
      })
      .text(formatMoney(item.price), marginX + 310, y, {
        width: 80,
        align: "center",
      })
      .text(formatMoney(item.quantity * item.price), marginX + 400, y, {
        width: 80,
        align: "center",
      });

    y += 20;
  });

  // ===== DIVIDER =====
  y += 10;
  doc
    .moveTo(marginX, y)
    .lineTo(marginX + 500, y)
    .strokeColor("#999")
    .stroke();

  y += 20;

  // ===== TOTALS =====
  const totalsX = 350;

  doc
    .fontSize(10)
    .text(`Subtotal: ${formatMoney(subtotal)}`, totalsX, y)
    .text(`Tax: ${invoice.tax.value}%`, totalsX, y + 15)
    .text(`Discount: ${invoice.discount.value}%`, totalsX, y + 30);

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .text(`Total: ${formatMoney(total)}`, totalsX, y + 60);
}

module.exports = generateClassicInvoice;