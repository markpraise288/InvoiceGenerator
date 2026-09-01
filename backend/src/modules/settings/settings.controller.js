// modules/settings/settings.controller.js

const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const settingsService = require("./settings.service");

// ─── Get Settings ──────────────────────────────────────────────────────────────

const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSettings(req.user);

  return res.status(200).json(
    new ApiResponse(200, "Settings fetched successfully", settings)
  );
});

// ─── Update Workspace ──────────────────────────────────────────────────────────

const updateWorkspace = asyncHandler(async (req, res) => {
  const data = req.body.workspace
  const settings = await settingsService.updateWorkspace({
    data,
    workspaceId: req.params.id,
    userId: req.user.id,
  });

  return res.status(200).json(
    new ApiResponse(200, "Workspace settings updated successfully", settings)
  );
});

// ─── Update Notifications ──────────────────────────────────────────────────────

const updateNotifications = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateNotifications({
    data: req.body,
  });

  return res.status(200).json(
    new ApiResponse(200, "Notification settings updated successfully", settings)
  );
});

// ─── Update Features ───────────────────────────────────────────────────────────

const updateFeatures = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateFeatures({
    data: req.body,
  });

  return res.status(200).json(
    new ApiResponse(200, "Feature settings updated successfully", settings)
  );
});

// ─── Get Profile ───────────────────────────────────────────────────────────────

const getProfile = asyncHandler(async (req, res) => {
  const profile = await settingsService.getProfile(req.user.id);

  if (!profile) {
    return res.status(404).json(
      new ApiResponse(404, "User not found", null)
    );
  }

  return res.status(200).json(
    new ApiResponse(200, "Profile fetched successfully", profile)
  );
});

// ─── Update Profile ────────────────────────────────────────────────────────────

const updateProfile = asyncHandler(async (req, res) => {
  try {
    const profile = await settingsService.updateProfile({
      userId: req.user.id,
      data: req.body,
    });

    return res.status(200).json(
      new ApiResponse(200, "Profile updated successfully", profile)
    );
  } catch (err) {
    if (err.message === "EMAIL_TAKEN") {
      return res.status(409).json(
        new ApiResponse(409, "This email address is already in use", null)
      );
    }
    throw err;
  }
});

// ─── Change Password ───────────────────────────────────────────────────────────

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    await settingsService.changePassword({
      userId: req.user.id,
      currentPassword,
      newPassword,
    });

    return res.status(200).json(
      new ApiResponse(200, "Password changed successfully", null)
    );
  } catch (err) {
    if (err.message === "WRONG_PASSWORD") {
      return res.status(400).json(
        new ApiResponse(400, "Current password is incorrect", null)
      );
    }
    if (err.message === "SAME_PASSWORD") {
      return res.status(400).json(
        new ApiResponse(
          400,
          "New password must be different from your current password",
          null
        )
      );
    }
    if (err.message === "USER_NOT_FOUND") {
      return res.status(404).json(
        new ApiResponse(404, "User not found", null)
      );
    }
    throw err;
  }
});

// ─── Get Team Members ──────────────────────────────────────────────────────────

const getTeamMembers = asyncHandler(async (req, res) => {
  const members = await settingsService.getTeamMembers(req.user);

  return res.status(200).json(
    new ApiResponse(200, "Team members fetched successfully", members)
  );
});

// ─── Update Member Role ────────────────────────────────────────────────────────

const updateMemberRole = asyncHandler(async (req, res) => {
  const { userId: targetUserId } = req.params;
  const requestingUserId = req.user.id;

  try {
    const user = await settingsService.updateMemberRole({
      targetUserId,
      role: req.body.role,
      requestingUserId,
    });

    return res.status(200).json(
      new ApiResponse(200, "Member role updated successfully", user)
    );
  } catch (err) {
    if (err.message === "SELF_ROLE_CHANGE") {
      return res.status(400).json(
        new ApiResponse(400, "You cannot change your own role", null)
      );
    }
    if (err.message === "USER_NOT_FOUND") {
      return res.status(404).json(
        new ApiResponse(404, "Team member not found", null)
      );
    }
    throw err;
  }
});

// ─── Remove Member ─────────────────────────────────────────────────────────────

const removeMember = asyncHandler(async (req, res) => {
  const { userId: targetUserId } = req.params;
  const requestingUserId = req.user.id;

  try {
    await settingsService.removeMember({
      targetUserId,
      requestingUserId,
    });

    return res.status(200).json(
      new ApiResponse(200, "Team member removed successfully", null)
    );
  } catch (err) {
    if (err.message === "SELF_REMOVAL") {
      return res.status(400).json(
        new ApiResponse(400, "You cannot remove yourself from the team", null)
      );
    }
    if (err.message === "USER_NOT_FOUND") {
      return res.status(404).json(
        new ApiResponse(404, "Team member not found", null)
      );
    }
    throw err;
  }
});

// ─── Get Sessions ──────────────────────────────────────────────────────────────

const getSessions = asyncHandler(async (req, res) => {
  const sessions = await settingsService.getSessions(req.user.id);

  return res.status(200).json(
    new ApiResponse(200, "Sessions fetched successfully", sessions)
  );
});

// ─── Revoke Session ────────────────────────────────────────────────────────────

const revokeSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  await settingsService.revokeSession({
    userId: req.user.id,
    sessionId,
  });

  return res.status(200).json(
    new ApiResponse(200, "Session revoked successfully", null)
  );
});

// ─── Revoke All Other Sessions ─────────────────────────────────────────────────

const revokeAllOtherSessions = asyncHandler(async (req, res) => {
  const currentSessionId = req.user.sessionId ?? null;

  await settingsService.revokeAllOtherSessions({
    userId: req.user.id,
    currentSessionId,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      "All other sessions revoked successfully",
      null
    )
  );
});

// ─── Get API Keys ──────────────────────────────────────────────────────────────

const getApiKeys = asyncHandler(async (req, res) => {
  const keys = await settingsService.getApiKeys(req.user.id);

  return res.status(200).json(
    new ApiResponse(200, "API keys fetched successfully", keys)
  );
});

// ─── Create API Key ────────────────────────────────────────────────────────────

const createApiKey = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(422).json(
      new ApiResponse(422, "API key name is required", null)
    );
  }

  const result = await settingsService.createApiKey({
    userId: req.user.id,
    name: name.trim(),
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      "API key created. Copy it now — it will not be shown again.",
      result
    )
  );
});

// ─── Revoke API Key ────────────────────────────────────────────────────────────

const revokeApiKey = asyncHandler(async (req, res) => {
  const { keyId } = req.params;

  await settingsService.revokeApiKey({
    userId: req.user.id,
    keyId,
  });

  return res.status(200).json(
    new ApiResponse(200, "API key revoked successfully", null)
  );
});

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