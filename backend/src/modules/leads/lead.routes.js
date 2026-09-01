const express = require("express");
const router = express.Router();

const verifyToken = require("../../middlewares/auth.middleware");
const {
  createLead,
  getLeads,
  getLeadsKanban,
  getLeadsSummary,
  getLeadById,
  updateLead,
  updateLeadStage,
  deleteLead,
  convertLead,
} = require("./lead.controller");

router.use(verifyToken);

router.route("/").post(createLead).get(getLeads);

router.get("/kanban", getLeadsKanban);
router.get("/summary", getLeadsSummary);

router
  .route("/:id")
  .get(getLeadById)
  .put(updateLead)
  .delete(deleteLead);

router.patch("/:id/stage", updateLeadStage);
router.post("/:id/convert", convertLead);

module.exports = router;