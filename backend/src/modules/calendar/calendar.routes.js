// modules/calendar/calendar.routes.js

const express = require("express");
const verifyToken = require("../../middlewares/auth.middleware");
const {
  validate,
  createEventSchema,
  updateEventSchema,
  queryEventSchema,
  updateAttendeeStatusSchema,
} = require("./calendar.validate");
const {
  createEvent,
  getEvents,
  getEvent,
  getUpcomingEvents,
  getRecordEvents,
  getCalendarStats,
  updateEvent,
  deleteEvent,
  updateAttendeeStatus,
} = require("./calendar.controller");

const router = express.Router();

// ─── All routes require authentication ────────────────────────────────────────

router.use(verifyToken);

// ─── Special routes first ─────────────────────────────────────────────────────
// All declared before /:eventId to prevent param capture

router.get(
  "/upcoming",
  getUpcomingEvents                              // GET /api/calendar/upcoming
);

router.get(
  "/stats",
  getCalendarStats                               // GET /api/calendar/stats
);

router.get(
  "/record",
  getRecordEvents                                // GET /api/calendar/record?leadId=&contactId=&dealId=
);

// ─── Collection routes ─────────────────────────────────────────────────────────

router
  .route("/")
  .get(
    validate(queryEventSchema, "query"),
    getEvents                                    // GET  /api/calendar
  )
  .post(
    validate(createEventSchema),
    createEvent                                  // POST /api/calendar
  );

// ─── Individual event routes ───────────────────────────────────────────────────

router
  .route("/:eventId")
  .get(getEvent)                                 // GET    /api/calendar/:eventId
  .patch(
    validate(updateEventSchema),
    updateEvent                                  // PATCH  /api/calendar/:eventId
  )
  .delete(deleteEvent);                          // DELETE /api/calendar/:eventId?scope=

// ─── Attendee RSVP ─────────────────────────────────────────────────────────────

router.patch(
  "/:eventId/rsvp",
  validate(updateAttendeeStatusSchema),
  updateAttendeeStatus                           // PATCH /api/calendar/:eventId/rsvp
);

module.exports = router;