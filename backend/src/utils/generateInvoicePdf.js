const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// Templates
const corporateWaveTemplate = require("../templates/corporativeWaveInvoice");
const elegantTemplate = require("../templates/elegantInvoice");
const minimalTemplate = require("../templates/minimalInvoice");
const modernTemplate = require("../templates/modernInvoice");
const classicTemplate = require("../templates/classicInvoice");
const compactTemplate = require("../templates/compactInvoice");
const boldTemplate = require("../templates/BoldInvoice");
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
 * Generates a PDF invoice and returns file path
 * @param {Object} invoice
 * @param {Object} user
 * @param {string} templateName
 * @param {string} [outputDir] - optional directory
 * @returns {Promise<string>} filePath
 */
function generateInvoicePDF(invoice, user, templateName, outputDir = "invoices") {
  return new Promise((resolve, reject) => {
    try {
      if (!templates[templateName]) {
        return reject(new Error(`Template "${templateName}" not found`));
      }

      // ==============================
      // 📁 CREATE FILE PATH
      // ==============================
      const fileName = `${invoice.invoiceNumber || Date.now()}.pdf`;
      const dirPath = path.join(__dirname, "..", outputDir);
      const filePath = path.join(dirPath, fileName);

      // Ensure folder exists
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // ==============================
      // 📄 CREATE PDF
      // ==============================
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Call template
      const templateFunction = templates[templateName];
      templateFunction(doc, invoice, user);

      // Finalize
      doc.end();

      // ==============================
      // ✅ RETURN FILE PATH AFTER WRITE
      // ==============================
      stream.on("finish", () => {
        console.log(`Invoice PDF generated at: ${filePath}`);
        resolve(filePath); // 🔥 THIS IS WHAT YOU NEED
      });

      stream.on("error", (err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = generateInvoicePDF;