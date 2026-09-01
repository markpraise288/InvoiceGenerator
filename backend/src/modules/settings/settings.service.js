// modules/settings/settings.service.js

const Settings = require("./settings.model");
const bcrypt = require("bcrypt");
const User = require("../users/user.model");
const Workspace = require("./workspace.model");
const { logActivity } = require("../activities/activity.service");

const WORKSPACE_FIELDS = "name logo website industry size timezone currency dateFormat FiscalYearStart";
// ─── Get or create workspace settings ─────────────────────────────────────────
// Always returns a settings document — creates one if it doesn't exist

const getSettings = async (user) => {
  let settings = await Settings.findOne({ workspaceId: user.workspaceId }).populate("workspaceId", WORKSPACE_FIELDS);
  if (!settings) {
    settings = await Settings.create({ createdBy: user.id, workspaceId: user.workspaceId }).populate("workspaceId", WORKSPACE_FIELDS);
    return settings;
  }

  return settings;
};

// ─── Update workspace settings ─────────────────────────────────────────────────

const updateWorkspace = async ({ data, workspaceId, userId }) => {
  const workspace = await Workspace.findOneAndUpdate(
    { ...data, _id: workspaceId},
    { returnDocument: 'after' }
  ).lean();

  const settings = await Settings.findById(userId);

  return settings;
};

// ─── Update notification settings ─────────────────────────────────────────────

const updateNotifications = async ({ data }) => {
  const settings = await Settings.findOneAndUpdate(
    {},
    { $set: { notifications: data.notifications } },
    { new: true, upsert: true, runValidators: true }
  ).lean();

  return settings;
};

// ─── Update feature flags ──────────────────────────────────────────────────────

const updateFeatures = async ({ data }) => {
  const settings = await Settings.findOneAndUpdate(
    {},
    { $set: { features: data.features } },
    { new: true, upsert: true, runValidators: true }
  ).lean();

  return settings;
};

// ─── Get current user profile ──────────────────────────────────────────────────

const getProfile = async (userId) => {
  const user = await User.findById(userId)
    .select("-password -__v")
    .lean();

  return user;
};

// ─── Update current user profile ──────────────────────────────────────────────

const updateProfile = async ({ userId, data }) => {
  // Check email uniqueness if email is being changed
  if (data.email) {
    const existing = await User.findOne({
      email: data.email,
      _id: { $ne: userId },
    });

    if (existing) {
      throw new Error("EMAIL_TAKEN");
    }
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: data },
    { returnDocument: 'after', runValidators: true }
  )
    .select("-password -__v")
    .lean();

  return user;
};

// ─── Change password ───────────────────────────────────────────────────────────

const changePassword = async ({ userId, currentPassword, newPassword }) => {
  // Fetch user with password
  const user = await User.findById(userId).select("+password");

  if (!user) throw new Error("USER_NOT_FOUND");

  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new Error("WRONG_PASSWORD");

  // Prevent reuse of same password
  const isSame = await bcrypt.compare(newPassword, user.password);
  if (isSame) throw new Error("SAME_PASSWORD");

  // Hash and save
  const salt = await bcrypt.genSalt(12);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();

  return true;
};

// ─── Get all team members ──────────────────────────────────────────────────────

const getTeamMembers = async (user) => {
  const users = await User.find({workspaceId: user.workspaceId})
    .select("-password -__v")
    .sort({ createdAt: 1 })
    .lean();

  return users;
};

// ─── Update member role ────────────────────────────────────────────────────────

const updateMemberRole = async ({ targetUserId, role, requestingUserId }) => {
  // Prevent self-role change
  if (targetUserId === requestingUserId) {
    throw new Error("SELF_ROLE_CHANGE");
  }

  const user = await User.findByIdAndUpdate(
    targetUserId,
    { $set: { role } },
    { returnDocument: 'after' }
  )
    .select("-password -__v")
    .lean();

  if (!user) throw new Error("USER_NOT_FOUND");

  return user;
};

// ─── Remove team member ────────────────────────────────────────────────────────

const removeMember = async ({ targetUserId, requestingUserId }) => {
  // Prevent self-removal
  if (targetUserId === requestingUserId) {
    throw new Error("SELF_REMOVAL");
  }

  const user = await User.findByIdAndDelete(targetUserId);
  if (!user) throw new Error("USER_NOT_FOUND");

  return true;
};

// ─── Get active sessions ───────────────────────────────────────────────────────
// Returns session metadata stored on the user document

const getSessions = async (userId) => {
  const user = await User.findById(userId)
    .select("sessions")
    .lean();

  return user?.sessions ?? [];
};

// ─── Revoke session ────────────────────────────────────────────────────────────

const revokeSession = async ({ userId, sessionId }) => {
  await User.findByIdAndUpdate(userId, {
    $pull: { sessions: { _id: sessionId } },
  });

  return true;
};

// ─── Revoke all other sessions ─────────────────────────────────────────────────

const revokeAllOtherSessions = async ({ userId, currentSessionId }) => {
  await User.findByIdAndUpdate(userId, {
    $pull: {
      sessions: { _id: { $ne: currentSessionId } },
    },
  });

  return true;
};

// ─── Get API keys ──────────────────────────────────────────────────────────────

const getApiKeys = async (userId) => {
  const user = await User.findById(userId)
    .select("apiKeys")
    .lean();

  // Never return the raw key — only metadata
  return (user?.apiKeys ?? []).map((k) => ({
    _id: k._id,
    name: k.name,
    prefix: k.key?.slice(0, 8) + "••••••••",
    createdAt: k.createdAt,
    lastUsedAt: k.lastUsedAt,
  }));
};

// ─── Create API key ────────────────────────────────────────────────────────────

const createApiKey = async ({ userId, name }) => {
  const crypto = require("crypto");
  const rawKey = `sk_${crypto.randomBytes(32).toString("hex")}`;

  await User.findByIdAndUpdate(userId, {
    $push: {
      apiKeys: {
        name,
        key: rawKey,
        createdAt: new Date(),
      },
    },
  });

  // Return the raw key ONCE — never stored in plaintext after this
  return { key: rawKey, name };
};

// ─── Revoke API key ────────────────────────────────────────────────────────────

const revokeApiKey = async ({ userId, keyId }) => {
  await User.findByIdAndUpdate(userId, {
    $pull: { apiKeys: { _id: keyId } },
  });

  return true;
};

module.exports = {
  getSettings,
  updateWorkspace,
  updateNotifications,
  updateFeatures,
  getProfile,
  updateProfile,
  changePassword,
  getTeamMembers,
  updateMemberRole,
  removeMember,
  getSessions,
  revokeSession,
  revokeAllOtherSessions,
  getApiKeys,
  createApiKey,
  revokeApiKey,
};