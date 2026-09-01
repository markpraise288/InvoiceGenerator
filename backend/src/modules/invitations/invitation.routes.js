const express = require("express");
const {
  inviteMember,
  listInvitations,
  resendInvitation,
  cancelInvitation,
  acceptInvitation,
} = require("./invitation.controller");
const verifyToken = require("../../middlewares/auth.middleware");
const requireWorkspaceAdmin = require("../../middlewares/requireWorkspaceAdmin.middleware");

const router = express.Router();

router.use(verifyToken);

// Any logged-in user can accept an invitation addressed to their own email —
// no admin permission needed to accept your own invite
router.post("/invitations/accept", acceptInvitation);

// Managing the team's invitations requires the workspace owner or an admin
router.post("/invite", requireWorkspaceAdmin, inviteMember);
router.get("/invitations", requireWorkspaceAdmin, listInvitations);
router.post("/invitations/:id/resend", requireWorkspaceAdmin, resendInvitation);
router.post("/invitations/:id/cancel", requireWorkspaceAdmin, cancelInvitation);

module.exports = router;