const express = require("express");
const { handlePayPalWebhook } = require("./webhook.contoller");

const router = express.Router();

// Local JSON parser — this router is mounted before the global
// express.json() in server.js (intentionally, so it stays outside
// verifyToken-protected routes), so it needs its own body parsing.
router.use(express.json());

// POST /api/billing/webhook
// Mounted directly at this path in server.js (app.use('/api/billing/webhook', ...)),
// so the route here is "/" — PayPal's notify_url (baked into the billing
// plans at creation time) points at exactly this bare path, no /paypal suffix.
router.post("/", handlePayPalWebhook);

module.exports = router;