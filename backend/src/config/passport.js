const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL, // e.g. http://localhost:5000/auth/google/callback
    },
    (accessToken, refreshToken, profile, done) => {
      // No DB work here — find-or-create + token issuing lives in
      // auth.service.js's loginWithGoogle, same place signup()/login() live.
      // This just verifies the Google response and hands the profile through
      // as req.user for googleCallbackHandler to use.
      done(null, profile);
    }
  )
);

module.exports = passport;