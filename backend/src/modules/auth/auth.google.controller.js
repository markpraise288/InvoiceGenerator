const { loginWithGoogle } = require("./auth.service");
const { acceptInvitationViaGoogle } = require("../invitations/invitation.service");
const asyncHandler = require("../../utils/asyncHandler");

// Same cookie options loginHandler uses — kept in one place so both flows
// can never drift out of sync
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true, // true in production (HTTPS)
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// GET /auth/google/callback
// req.user here is the raw Google profile passed through by passport.js.
// req.query.state carries the invitation token IF the person arrived via
// an "Accept invitation → Continue with Google" flow (see auth.routes.js's
// /google route, which sets state: req.query.invitationToken).
const googleCallbackHandler = asyncHandler(async (req, res) => {
  const invitationToken = req.query.state;

  let result = null;
  let isNewUser = false;

  if (invitationToken) {
    // Returns null (never throws) if the invite is invalid/expired, or if
    // this Google account's email doesn't match who it was sent to — in
    // either case we fall through to a normal login below rather than
    // silently failing the whole sign-in.
    result = await acceptInvitationViaGoogle({ token: invitationToken, profile: req.user });
    if (result) isNewUser = result.isNewUser;
  }

  if (!result) {
    result = await loginWithGoogle(req.user);
    isNewUser = result.isNewUser;
  }

  res.cookie("refreshToken", result.refreshToken, COOKIE_OPTIONS);
  res.cookie("accessToken", result.accessToken, COOKIE_OPTIONS);

  // Came in through a valid invitation → the workspace already has a real
  // name and the person already has a defined role, so skip the "/profile"
  // onboarding step that new plain-Google signups get and go straight in.
  const cameViaValidInvite = Boolean(invitationToken) && result;
  const redirectPath = cameViaValidInvite ? "/dashboard" : isNewUser ? "/profile" : "/dashboard";

  res.redirect(`${process.env.FRONTEND_URL}${redirectPath}`);
});

module.exports = { googleCallbackHandler };