const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "support-tickets");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ⚠️ Local disk storage — fine for a single-server setup, but files won't
// survive a redeploy and won't be visible across multiple server instances.
// If you move to S3/Cloudinary later, this `storage` object is the only
// thing that needs to change — swap it for that provider's multer-storage
// engine and everything downstream (filesToAttachments, the SupportMessage
// model) stays the same, since they only care about the final `url`.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
  },
});

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }, // 10MB/file, 5 files max
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error(`File type ${file.mimetype} isn't allowed`));
    }
    cb(null, true);
  },
});

// Converts multer's req.files into the attachment shape SupportMessage expects
const filesToAttachments = (req) =>
  (req.files || []).map((file) => ({
    url: `${process.env.BACKEND_URL}/uploads/support-tickets/${file.filename}`,
    filename: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  }));

module.exports = { upload, filesToAttachments };