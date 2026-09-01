// utils/storage.util.js

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");
const path = require("path");

// ─── Client setup ────────────────────────────────────────────────────────────
// Works with AWS S3 directly, or any S3-compatible provider (Cloudflare R2,
// DigitalOcean Spaces, MinIO, Backblaze B2) by pointing STORAGE_ENDPOINT at
// the provider's endpoint. Leave STORAGE_ENDPOINT unset for real AWS S3.

const s3Client = new S3Client({
  region: process.env.STORAGE_REGION || "auto",
  endpoint: process.env.STORAGE_ENDPOINT || undefined,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
  },
  // R2/Spaces/MinIO generally need path-style addressing; real AWS S3 does not
  forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === "true",
});

const BUCKET = process.env.STORAGE_BUCKET;

if (!BUCKET) {
  console.warn(
    "[storage.util] STORAGE_BUCKET is not set — file uploads will fail until configured."
  );
}

// ─── Key generation ──────────────────────────────────────────────────────────
// Every object key is namespaced by workspace so tenants never collide and
// a bucket-level listing naturally segments by workspace.

const generateObjectKey = (workspaceId, originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  const randomId = crypto.randomBytes(16).toString("hex");
  return `workspaces/${workspaceId}/files/${randomId}${ext}`;
};

// ─── Upload ──────────────────────────────────────────────────────────────────

/**
 * Uploads a file buffer to cloud storage.
 * @param {Object} params
 * @param {Buffer} params.buffer - File contents
 * @param {string} params.workspaceId
 * @param {string} params.originalName - Original filename, used to derive extension
 * @param {string} params.mimeType
 * @returns {Promise<{ key: string }>}
 */
const uploadFile = async ({ buffer, workspaceId, originalName, mimeType }) => {
  const key = generateObjectKey(workspaceId, originalName);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      // Never publicly readable — access is only ever via signed URLs
      // generated per-request after our own auth/permission checks
      ACL: "private",
    })
  );

  return { key };
};

// ─── Signed download URL ───────────────────────────────────────────────────────
// Short-lived, single-use-in-spirit URL — generated fresh on every download
// request after the controller has already verified the requester has
// access to this file's record. Never cache/store this URL.

const getSignedDownloadUrl = async ({
  key,
  fileName,
  expiresInSeconds = 300,
}) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(
      fileName
    )}"`,
  });

  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
};

// ─── Delete ──────────────────────────────────────────────────────────────────

const deleteFile = async (key) => {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
};

// ─── Existence check ────────────────────────────────────────────────────────
// Useful for verifying an upload actually landed before saving the DB record,
// or confirming a file still exists before generating a download link.

const fileExists = async (key) => {
  try {
    await s3Client.send(
      new HeadObjectCommand({ Bucket: BUCKET, Key: key })
    );
    return true;
  } catch (err) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw err;
  }
};

module.exports = {
  uploadFile,
  getSignedDownloadUrl,
  deleteFile,
  fileExists,
  generateObjectKey,
};