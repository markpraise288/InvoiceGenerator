const express = require("express");
const { validateInvitation, signupViaInvitation } = require("./invitation.controller");

const router = express.Router();

// GET /api/invitations/validate?token=...
// Powers the /accept-invitation landing page before the person is logged in
router.get("/validate", validateInvitation);

// POST /api/invitations/signup
// For invitees who don't have an account yet
router.post("/signup", signupViaInvitation);

module.exports = router;