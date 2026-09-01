// modules/deals/deal.routes.js

const express = require("express");
const verifyToken = require("../../middlewares/auth.middleware");
const {
  validate,
  createDealSchema,
  updateDealSchema,
  moveStageSchema,
  queryDealSchema,
} = require("./deal.validate");
const {
  createDeal,
  getDeals,
  getKanbanDeals,
  getDeal,
  searchDeals,
  updateDeal,
  moveDealStage,
  deleteDeal,
  getPipelineSummary,
} = require("./deal.controller");

const router = express.Router();

// ─── All routes require authentication ────────────────────────────────────────

router.use(verifyToken);

// ─── Special routes first ─────────────────────────────────────────────────────
// All declared before /:dealId to prevent param capture

router.get("/search", searchDeals);                    // GET /api/deals/search?q=
router.get("/kanban", getKanbanDeals);                 // GET /api/deals/kanban
router.get("/pipeline-summary", getPipelineSummary);   // GET /api/deals/pipeline-summary

// ─── Collection routes ─────────────────────────────────────────────────────────

router
  .route("/")
  .get(validate(queryDealSchema, "query"), getDeals)   // GET  /api/deals
  .post(validate(createDealSchema), createDeal);        // POST /api/deals

// ─── Individual deal routes ────────────────────────────────────────────────────

router
  .route("/:dealId")
  .get(getDeal)                                         // GET    /api/deals/:dealId
  .patch(validate(updateDealSchema), updateDeal)        // PATCH  /api/deals/:dealId
  .delete(deleteDeal);                                  // DELETE /api/deals/:dealId

// ─── Move stage ────────────────────────────────────────────────────────────────

router.patch(
  "/:dealId/stage",
  validate(moveStageSchema),
  moveDealStage                                         // PATCH /api/deals/:dealId/stage
);

module.exports = router;