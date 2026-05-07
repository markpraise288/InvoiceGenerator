const PDFDocument = require("pdfkit");

// Templates
const corporateWaveTemplate = require("../templates/corporativeWaveInvoice");
const elegantTemplate = require("../templates/elegantInvoice");
const minimalTemplate = require("../templates/minimalInvoice");
const modernTemplate = require("../templates/modernInvoice");
const classicTemplate = require("../templates/classicInvoice");
const compactTemplate = require("../templates/compactInvoice");
const boldTemplate = require("../templates/boldInvoice");
const boldProTemplate = require("../templates/boldProInvoice");

const templates = {
  corporateWave: corporateWaveTemplate,
  elegant: elegantTemplate,
  minimal: minimalTemplate,
  modern: modernTemplate,
  classic: classicTemplate,
  compact: compactTemplate,
  bold: boldTemplate,
  boldPro: boldProTemplate,
};

/**
 * Generates invoice PDF and returns BUFFER
 */
function generateInvoicePDF(invoice, user, templateName) {
  return new Promise((resolve, reject) => {
    try {
      if (!templates[templateName]) {
        return reject(
          new Error(`Template "${templateName}" not found`)
        );
      }

      // 🔥 CREATE PDF DOCUMENT
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
      });

      // 🔥 STORE PDF CHUNKS IN MEMORY
      const buffers = [];

      doc.on("data", (chunk) => {
        buffers.push(chunk);
      });

      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers);

        console.log(
          `Invoice PDF generated for invoice #${invoice.invoiceNumber}`
        );

        resolve(pdfBuffer); // ✅ RETURN BUFFER
      });

      doc.on("error", (err) => reject(err));

      // 🔥 LOAD TEMPLATE
      const templateFunction = templates[templateName];

      // 🔥 GENERATE PDF CONTENT
      templateFunction(doc, invoice, user);

      // 🔥 FINALIZE PDF
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = generateInvoicePDF;