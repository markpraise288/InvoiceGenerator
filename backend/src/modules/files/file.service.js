// modules/files/file.service.js

const mongoose = require("mongoose");
const { File } = require("./file.model");
const {
  uploadFile,
  getSignedDownloadUrl,
  deleteFile,
} = require("../../utils/storage.util");

// ─── Populate helper ───────────────────────────────────────────────────────────

const defaultPopulate = (query) =>
  query.populate("uploadedBy", "name email avatar");

// ─── Upload file ────────────────────────────────────────────────────────────────

const uploadNewFile = async ({
  buffer,
  originalName,
  mimeType,
  size,
  workspaceId,
  userId,
  folder,
  tags,
  description,
  relatedId,
  relatedTo,
}) => {
  // Upload to cloud storage first — only create the DB record if this
  // succeeds, so we never end up with an orphaned metadata row pointing
  // at a file that doesn't actually exist in the bucket
  const { key } = await uploadFile({
    buffer,
    workspaceId,
    originalName,
    mimeType,
  });

  try {
    const file = await File.create({
      originalName,
      mimeType,
      size,
      storageKey: key,
      storageProvider: "s3",
      folder: folder || null,
      tags: tags || [],
      description,
      relatedId: relatedId || null,
      relatedTo: relatedTo || null,
      workspaceId,
      uploadedBy: userId,
    });

    return defaultPopulate(File.findById(file._id)).lean({ virtuals: true });
  } catch (err) {
    // DB write failed after a successful upload — clean up the orphaned
    // object so it doesn't sit in the bucket forever with no metadata
    await deleteFile(key).catch((cleanupErr) => {
      console.error(
        `Failed to clean up orphaned storage object ${key}:`,
        cleanupErr
      );
    });
    throw err;
  }
};

// ─── Upload a new version of an existing file ──────────────────────────────────

const uploadNewVersion = async ({
  fileId,
  buffer,
  originalName,
  mimeType,
  size,
  workspaceId,
  userId,
}) => {
  const previous = await File.findOne({
    _id: fileId,
    workspaceId,
    isDeleted: false,
  });

  if (!previous) {
    const err = new Error("FILE_NOT_FOUND");
    err.status = 404;
    throw err;
  }

  const { key } = await uploadFile({
    buffer,
    workspaceId,
    originalName,
    mimeType,
  });

  try {
    const newVersion = await File.create({
      originalName,
      mimeType,
      size,
      storageKey: key,
      storageProvider: "s3",
      folder: previous.folder,
      tags: previous.tags,
      description: previous.description,
      relatedId: previous.relatedId,
      relatedTo: previous.relatedTo,
      workspaceId,
      uploadedBy: userId,
      version: previous.version + 1,
      previousVersion: previous._id,
    });

    return defaultPopulate(File.findById(newVersion._id)).lean({
      virtuals: true,
    });
  } catch (err) {
    await deleteFile(key).catch(() => {});
    throw err;
  }
};

// ─── Get files (library view, filterable) ──────────────────────────────────────

const getFiles = async ({ workspaceId, filters = {} }) => {
  const {
    search,
    folder,
    relatedTo,
    relatedId,
    tags,
    page = 1,
    limit = 40,
  } = filters;

  const query = {
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
    isDeleted: false,
  };

  if (search) {
    query.originalName = { $regex: search, $options: "i" };
  }

  if (folder) query.folder = folder;
  if (relatedTo) query.relatedTo = relatedTo;
  if (relatedId) query.relatedId = new mongoose.Types.ObjectId(relatedId);
  if (tags && tags.length > 0) query.tags = { $in: tags };

  const skip = (page - 1) * limit;

  const [files, total] = await Promise.all([
    defaultPopulate(
      File.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
    ).lean({ virtuals: true }),
    File.countDocuments(query),
  ]);

  return {
    files,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

// ─── Get files for a specific record (embedded widget) ────────────────────────

const getRecordFiles = async ({ relatedTo, relatedId, workspaceId }) => {
  const files = await defaultPopulate(
    File.find({
      relatedTo,
      relatedId: new mongoose.Types.ObjectId(relatedId),
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      isDeleted: false,
    }).sort({ createdAt: -1 })
  ).lean({ virtuals: true });

  return files;
};

// ─── Get single file + generate signed download URL ────────────────────────────

const getFileDownloadUrl = async ({ fileId, workspaceId }) => {
  const file = await File.findOne({
    _id: fileId,
    workspaceId,
    isDeleted: false,
  });

  if (!file) {
    const err = new Error("FILE_NOT_FOUND");
    err.status = 404;
    throw err;
  }

  const url = await getSignedDownloadUrl({
    key: file.storageKey,
    fileName: file.originalName,
  });

  return { url, fileName: file.originalName };
};

// ─── Update file metadata ───────────────────────────────────────────────────────

const updateFile = async ({ fileId, workspaceId, data }) => {
  const file = await File.findOneAndUpdate(
    { _id: fileId, workspaceId, isDeleted: false },
    { $set: data },
    { new: true, runValidators: true }
  );

  if (!file) {
    const err = new Error("FILE_NOT_FOUND");
    err.status = 404;
    throw err;
  }

  return defaultPopulate(File.findById(file._id)).lean({ virtuals: true });
};

// ─── Attach / detach a file to a record ────────────────────────────────────────

const attachToRecord = async ({ fileId, workspaceId, relatedId, relatedTo }) => {
  return updateFile({
    fileId,
    workspaceId,
    data: { relatedId, relatedTo },
  });
};

const detachFromRecord = async ({ fileId, workspaceId }) => {
  return updateFile({
    fileId,
    workspaceId,
    data: { relatedId: null, relatedTo: null },
  });
};

// ─── Soft delete ────────────────────────────────────────────────────────────────

const deleteFileRecord = async ({ fileId, workspaceId }) => {
  const file = await File.findOneAndUpdate(
    { _id: fileId, workspaceId, isDeleted: false },
    { isDeleted: true, deletedAt: new Date() },
    { new: true }
  );

  if (!file) {
    const err = new Error("FILE_NOT_FOUND");
    err.status = 404;
    throw err;
  }

  return file;
};

// ─── Permanent delete (from trash) ─────────────────────────────────────────────

const permanentlyDeleteFile = async ({ fileId, workspaceId }) => {
  const file = await File.findOne({ _id: fileId, workspaceId });
  if (!file) {
    const err = new Error("FILE_NOT_FOUND");
    err.status = 404;
    throw err;
  }

  // Remove from cloud storage first, then the DB record — if storage
  // deletion fails, we keep the DB record so the file isn't silently
  // lost from view while still orphaned in the bucket
  await deleteFile(file.storageKey);
  await File.deleteOne({ _id: fileId });

  return true;
};

// ─── Restore from trash ─────────────────────────────────────────────────────────

const restoreFile = async ({ fileId, workspaceId }) => {
  const file = await File.findOneAndUpdate(
    { _id: fileId, workspaceId, isDeleted: true },
    { isDeleted: false, deletedAt: null },
    { new: true }
  );

  if (!file) {
    const err = new Error("FILE_NOT_FOUND");
    err.status = 404;
    throw err;
  }

  return file;
};

// ─── Storage stats (for the library page header) ───────────────────────────────

const getStorageStats = async ({ workspaceId }) => {
  const [totalStats, folderBreakdown, typeBreakdown] = await Promise.all([
    File.aggregate([
      {
        $match: {
          workspaceId: new mongoose.Types.ObjectId(workspaceId),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: "$size" },
        },
      },
    ]),
    File.aggregate([
      {
        $match: {
          workspaceId: new mongoose.Types.ObjectId(workspaceId),
          isDeleted: false,
          folder: { $ne: null },
        },
      },
      { $group: { _id: "$folder", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    File.aggregate([
      {
        $match: {
          workspaceId: new mongoose.Types.ObjectId(workspaceId),
          isDeleted: false,
        },
      },
      { $group: { _id: "$mimeType", count: { $sum: 1 } } },
    ]),
  ]);

  return {
    totalFiles: totalStats[0]?.totalFiles ?? 0,
    totalSize: totalStats[0]?.totalSize ?? 0,
    folders: folderBreakdown.map((f) => ({ folder: f._id, count: f.count })),
    typeBreakdown: typeBreakdown.reduce((acc, { _id, count }) => {
      acc[_id] = count;
      return acc;
    }, {}),
  };
};

module.exports = {
  uploadNewFile,
  uploadNewVersion,
  getFiles,
  getRecordFiles,
  getFileDownloadUrl,
  updateFile,
  attachToRecord,
  detachFromRecord,
  deleteFileRecord,
  permanentlyDeleteFile,
  restoreFile,
  getStorageStats,
};