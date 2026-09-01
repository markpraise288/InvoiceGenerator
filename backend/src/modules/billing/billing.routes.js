const express = require("express");
const {
  getBillingData,
  initiateUpgrade,
  confirmUpgrade,
  cancelSubscription,
} = require("./billing.controller");
const verifyToken = require("../../middlewares/auth.middleware");

const router = express.Router();

router.use(verifyToken);

router.get("/data", getBillingData);
router.post("/upgrade", initiateUpgrade);
router.post("/upgrade/confirm", confirmUpgrade);
router.post("/cancel", cancelSubscription);

module.exports = router;