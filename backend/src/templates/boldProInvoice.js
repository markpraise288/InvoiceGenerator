const PDFDocument = require("pdfkit");

const generateBoldProInvoice = (
  doc,
  invoice,
  user
) => {
  const startX = 50;
  let y = 40;

  // ================= CALCULATIONS =================
  const subtotal = (invoice.items || []).reduce(
    (acc, item) => acc + item.quantity * item.price,
    0
  );

  const discountAmount =
    invoice.discount?.type === "percentage"
      ? subtotal * (invoice.discount.value / 100)
      : invoice.discount?.value || 0;

  const taxableAmount = subtotal - discountAmount;

  const taxAmount =
    invoice.tax?.type === "percentage"
      ? taxableAmount * (invoice.tax.value / 100)
      : invoice.tax?.value || 0;

  const shippingCost = invoice.shipping?.cost || 0;

  const total = taxableAmount + taxAmount + shippingCost;

  const formatCurrency = (amount) =>
    new Intl.NumberFormat(
      invoice.currency === "USD" ? "en-US" : "en-MW",
      {
        style: "currency",
        currency: invoice.currency,
      }
    ).format(amount);

  // ================= HEADER (DARK BAR) =================
  // ================= HEADER (GRADIENT) =================

// Gradient simulation
const startColor = [15, 23, 42]; // slate-900
const endColor = [51, 65, 85];   // slate-700

for (let i = 0; i < doc.page.width; i += 2) {
  const ratio = i / doc.page.width;

  const r = Math.round(
    startColor[0] + (endColor[0] - startColor[0]) * ratio
  );

  const g = Math.round(
    startColor[1] + (endColor[1] - startColor[1]) * ratio
  );

  const b = Math.round(
    startColor[2] + (endColor[2] - startColor[2]) * ratio
  );

  doc
    .rect(i, 0, 2, 100)
    .fill(`rgb(${r},${g},${b})`);
}

// White text
doc.fillColor("white");

// LEFT SIDE
doc
  .font("Helvetica-Bold")
  .fontSize(26)
  .text("INVOICE", startX, 28);

doc
  .font("Helvetica")
  .fontSize(10)
  .fillColor("#CBD5E1")
  .text(
    `#${invoice.invoiceNumber || "00001"}`,
    startX,
    60
  );

// RIGHT SIDE
doc
  .fillColor("white")
  .font("Helvetica-Bold")
  .fontSize(12)
  .text(
    user.companyName || user.name,
    350,
    30,
    {
      width: 180,
      align: "right",
    }
  );

doc
  .font("Helvetica")
  .fontSize(10)
  .fillColor("#CBD5E1")
  .text(
    user.email,
    350,
    50,
    {
      width: 180,
      align: "right",
    }
  );

doc.text(
  user.phone || "",
  350,
  65,
  {
    width: 180,
    align: "right",
  }
);

y = 120;
doc.fillColor("black");
  // ================= CLIENT + META =================
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("gray")
    .text("Bill To", startX, y);

  y += 15;

  doc.fillColor("black");

  doc
    .font("Helvetica-Bold")
    .text(invoice.clientSnapshot.name, startX, y);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("gray")
    .text(invoice.clientSnapshot.email, startX, y + 15);

  doc.text(invoice.clientSnapshot.address, startX, y + 30);

  // RIGHT META
  doc.fillColor("black").font("Helvetica").fontSize(10);

  doc.text(`Issue Date: ${invoice.issueDate || "-"}`, 350, y, {
    align: "right",
  });

  doc.text(`Due Date: ${invoice.dueDate}`, 350, y + 15, {
    align: "right",
  });

  doc.text(`Status: ${invoice.status}`, 350, y + 30, {
    align: "right",
  });

  y += 80;

  // ================= TABLE HEADER =================
  const tableTop = y;

  doc.rect(startX, tableTop, 500, 25).fill("#f1f5f9");

  doc.fillColor("black").font("Helvetica-Bold").fontSize(9);

  doc.text("Item", startX + 5, tableTop + 8);
  doc.text("Qty", startX + 250, tableTop + 8, { width: 50, align: "center" });
  doc.text("Price", startX + 320, tableTop + 8, {
    width: 80,
    align: "center",
  });
  doc.text("Total", startX + 420, tableTop + 8, {
    width: 80,
    align: "right",
  });

  y += 30;

  // ================= TABLE BODY =================
  doc.font("Helvetica").fontSize(10);

  (invoice.items || []).forEach((item) => {
    doc.fillColor("black");

    doc.text(item.description, startX + 5, y);

    doc.text(item.quantity.toString(), startX + 250, y, {
      width: 50,
      align: "center",
    });

    doc.text(formatCurrency(item.price), startX + 320, y, {
      width: 80,
      align: "center",
    });

    doc.text(formatCurrency(item.price * item.quantity), startX + 420, y, {
      width: 80,
      align: "right",
    });

    // row line
    doc
      .moveTo(startX, y + 18)
      .lineTo(startX + 500, y + 18)
      .strokeColor("#e5e7eb")
      .stroke();

    y += 25;
  });

  y += 20;

  // ================= NOTES + TOTALS =================
  const leftX = startX;
  const rightX = 350;

  // NOTES
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("gray")
    .text("Notes", leftX, y);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("gray")
    .text(invoice.notes || "Thank you for your business!", leftX, y + 15, {
      width: 250,
    });

  // TOTALS
  let ty = y;

  const line = (label, value, color = "black") => {
    doc.fillColor(color).font("Helvetica").fontSize(10);

    doc.text(label, rightX, ty);
    doc.text(value, rightX, ty, {
      width: 150,
      align: "right",
    });

    ty += 18;
  };

  line("Subtotal", formatCurrency(subtotal));

  if (discountAmount > 0) {
    line("Discount", `-${formatCurrency(discountAmount)}`, "red");
  }

  line(`Tax (${invoice.tax?.value || 0}%)`, formatCurrency(taxAmount));

  if (shippingCost > 0) {
    line(
      `Shipping ${
        invoice.shipping?.method
          ? `(${invoice.shipping.method})`
          : ""
      }`,
      formatCurrency(shippingCost)
    );
  }

  // divider
  doc
    .moveTo(rightX, ty)
    .lineTo(rightX + 150, ty)
    .strokeColor("#d1d5db")
    .stroke();

  ty += 8;

  doc.font("Helvetica-Bold").fontSize(12);

  doc.text("Total", rightX, ty);
  doc.text(formatCurrency(total), rightX, ty, {
    width: 150,
    align: "right",
  });

  y += 100;

  // ================= PAYMENT + TERMS =================
  y += 40;

  doc.font("Helvetica-Bold").fontSize(11).text("Payment Methods", startX, y);

  y += 15;

  if (invoice.paymentMethods?.length) {
    invoice.paymentMethods.forEach((pm) => {
      doc
        .font("Helvetica")
        .fontSize(10)
        .text(pm.method, startX, y);

      if (pm.details) {
        doc
          .fontSize(9)
          .fillColor("gray")
          .text(pm.details, startX, y + 12);
      }

      y += 25;
      doc.fillColor("black");
    });
  } else {
    doc.text("No payment methods provided", startX, y);
    y += 20;
  }

  // TERMS RIGHT
  doc
    .font("Helvetica-Bold")
    .text("Terms", 350, y - 40, { align: "right" });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("gray")
    .text(invoice.terms || "Payment due within 7 days.", 350, y - 25, {
      align: "right",
      width: 200,
    });

  y += 20;

};

module.exports = generateBoldProInvoice;