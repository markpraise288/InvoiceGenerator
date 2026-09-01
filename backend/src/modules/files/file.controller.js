// modules/files/file.controller.js

const multer = require("multer");
const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const fileService = require("./file.service");
const {
  multerFileFilter,
  MAX_FILE_SIZE_BYTES,
} = require("./file.validate");

// ─── Multer config ───────────────────────────────────────────────────────────
// Memory storage — the file buffer goes straight to the cloud storage util,
// never touching local disk. Fine for the 25MB cap set in file.validate.js;
// if you raise the limit significantly beyond that, switch to streaming
// upload instead of buffering the whole file in memory.

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: multerFileFilter,
});

// Exported so routes.js can apply it as middleware before this controller
const uploadMiddleware = upload.single("file");

// ─── Normalize tags from multipart form-data ───────────────────────────────────
// form-data doesn't have native arrays — tags may arrive as a single string,
// a comma-separated string, or (if the client JSON-stringified it) a string
// that needs parsing. This handles all three so the service always gets a
// clean array.

const normalizeTags = (rawTags) => {
  if (!rawTags) return [];
  if (Array.isArray(rawTags)) return rawTags;
  if (typeof rawTags === "string") {
    try {
      const parsed = JSON.parse(rawTags);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // not JSON — treat as comma-separated or a single tag
    }
    return rawTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
};

// ─── Upload file ────────────────────────────────────────────────────────────────

const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(422).json(
      new ApiResponse(422, "No file was uploaded", null)
    );
  }

  const { folder, description, relatedId, relatedTo } = req.body;
  const tags = normalizeTags(req.body.tags);

  const file = await fileService.uploadNewFile({
    buffer: req.file.buffer,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    workspaceId: req.user.workspaceId,
    userId: req.user.id,
    folder: folder || null,
    tags,
    description,
    relatedId: relatedId || null,
    relatedTo: relatedTo || null,
  });

  return res.status(201).json(
    new ApiResponse(201, "File uploaded successfully", file)
  );
});

// ─── Upload a new version of an existing file ──────────────────────────────────

const uploadNewVersion = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(422).json(
      new ApiResponse(422, "No file was uploaded", null)
    );
  }

  const { fileId } = req.params;

  try {
    const file = await fileService.uploadNewVersion({
      fileId,
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      workspaceId: req.user.workspaceId,
      userId: req.user.id,
    });

    return res.status(201).json(
      new ApiResponse(201, "New version uploaded successfully", file)
    );
  } catch (err) {
    if (err.message === "FILE_NOT_FOUND") {
      return res.status(404).json(
        new ApiResponse(404, "Original file not found", null)
      );
    }
    throw err;
  }
});

// ─── Get files (library view) ──────────────────────────────────────────────────

const getFiles = asyncHandler(async (req, res) => {
  const result = await fileService.getFiles({
    workspaceId: req.user.workspaceId,
    filters: req.query,
  });

  return res.status(200).json(
    new ApiResponse(200, "Files fetched successfully", result)
  );
});

// ─── Get files for a specific record ───────────────────────────────────────────

const getRecordFiles = asyncHandler(async (req, res) => {
  const { relatedTo, relatedId } = req.query;

  if (!relatedTo || !relatedId) {
    return res.status(422).json(
      new ApiResponse(422, "relatedTo and relatedId are both required", null)
    );
  }

  const files = await fileService.getRecordFiles({
    relatedTo,
    relatedId,
    workspaceId: req.user.workspaceId,
  });

  return res.status(200).json(
    new ApiResponse(200, "Record files fetched successfully", files)
  );
});

// ─── Get a signed download URL ─────────────────────────────────────────────────
// The frontend calls this, then immediately redirects the browser to the
// returned signed URL — this endpoint itself never streams file bytes.

const getDownloadUrl = asyncHandler(async (req, res) => {
  const { fileId } = req.params;

  try {
    const result = await fileService.getFileDownloadUrl({
      fileId,
      workspaceId: req.user.workspaceId,
    });

    return res.status(200).json(
      new ApiResponse(200, "Download URL generated successfully", result)
    );
  } catch (err) {
    if (err.message === "FILE_NOT_FOUND") {
      return res.status(404).json(new ApiResponse(404, "File not found", null));
    }
    throw err;
  }
});

// ─── Update file metadata ───────────────────────────────────────────────────────

const updateFile = asyncHandler(async (req, res) => {
  const { fileId } = req.params;

  try {
    const file = await fileService.updateFile({
      fileId,
      workspaceId: req.user.workspaceId,
      data: req.body,
    });

    return res.status(200).json(
      new ApiResponse(200, "File updated successfully", file)
    );
  } catch (err) {
    if (err.message === "FILE_NOT_FOUND") {
      return res.status(404).json(new ApiResponse(404, "File not found", null));
    }
    throw err;
  }
});

// ─── Attach to record ───────────────────────────────────────────────────────────

const attachToRecord = asyncHandler(async (req, res) => {
  const { fileId } = req.params;
  const { relatedId, relatedTo } = req.body;

  try {
    const file = await fileService.attachToRecord({
      fileId,
      workspaceId: req.user.workspaceId,
      relatedId,
      relatedTo,
    });

    return res.status(200).json(
      new ApiResponse(200, "File attached successfully", file)
    );
  } catch (err) {
    if (err.message === "FILE_NOT_FOUND") {
      return res.status(404).json(new ApiResponse(404, "File not found", null));
    }
    throw err;
  }
});

// ─── Detach from record ─────────────────────────────────────────────────────────

const detachFromRecord = asyncHandler(async (req, res) => {
  const { fileId } = req.params;

  try {
    const file = await fileService.detachFromRecord({
      fileId,
      workspaceId: req.user.workspaceId,
    });

    return res.status(200).json(
      new ApiResponse(200, "File detached successfully", file)
    );
  } catch (err) {
    if (err.message === "FILE_NOT_FOUND") {
      return res.status(404).json(new ApiResponse(404, "File not found", null));
    }
    throw err;
  }
});

// ─── Soft delete (move to trash) ───────────────────────────────────────────────

const deleteFile = asyncHandler(async (req, res) => {
  const { fileId } = req.params;

  try {
    await fileService.deleteFileRecord({
      fileId,
      workspaceId: req.user.workspaceId,
    });

    return res.status(200).json(
      new ApiResponse(200, "File moved to trash", null)
    );
  } catch (err) {
    if (err.message === "FILE_NOT_FOUND") {
      return res.status(404).json(new ApiResponse(404, "File not found", null));
    }
    throw err;
  }
});

// ─── Permanently delete (from trash) ───────────────────────────────────────────

const permanentlyDeleteFile = asyncHandler(async (req, res) => {
  const { fileId } = req.params;

  try {
    await fileService.permanentlyDeleteFile({
      fileId,
      workspaceId: req.user.workspaceId,
    });

    return res.status(200).json(
      new ApiResponse(200, "File permanently deleted", null)
    );
  } catch (err) {
    if (err.message === "FILE_NOT_FOUND") {
      return res.status(404).json(new ApiResponse(404, "File not found", null));
    }
    throw err;
  }
});

// ─── Restore from trash ─────────────────────────────────────────────────────────

const restoreFile = asyncHandler(async (req, res) => {
  const { fileId } = req.params;

  try {
    const file = await fileService.restoreFile({
      fileId,
      workspaceId: req.user.workspaceId,
    });

    return res.status(200).json(
      new ApiResponse(200, "File restored successfully", file)
    );
  } catch (err) {
    if (err.message === "FILE_NOT_FOUND") {
      return res.status(404).json(new ApiResponse(404, "File not found", null));
    }
    throw err;
  }
});

// ─── Storage stats ────────────────────────────────────────────────────────────

const getStorageStats = asyncHandler(async (req, res) => {
  const stats = await fileService.getStorageStats({
    workspaceId: req.user.workspaceId,
  });

  return res.status(200).json(
    new ApiResponse(200, "Storage stats fetched successfully", stats)
  );
});

module.exports = {
  uploadMiddleware,
  uploadFile,
  uploadNewVersion,
  getFiles,
  getRecordFiles,
  getDownloadUrl,
  updateFile,
  attachToRecord,
  detachFromRecord,
  deleteFile,
  permanentlyDeleteFile,
  restoreFile,
  getStorageStats,
};