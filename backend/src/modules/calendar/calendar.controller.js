// modules/calendar/calendar.controller.js

const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const calendarService = require("./calendar.service");

// ─── Create Event ──────────────────────────────────────────────────────────────

const createEvent = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const workspaceId = req.user.workspaceId;

  const event = await calendarService.createEvent({
    data: req.body,
    userId,
    workspaceId
  });

  // If recurring, generate future occurrences
  if (req.body.recurrence?.frequency) {
    try {
      await calendarService.generateRecurringOccurrences({
        parentEvent: event,
        userId,
      });
    } catch (err) {
      console.error("Failed to generate recurring occurrences:", err);
    }
  }

  return res.status(201).json(
    new ApiResponse(201, "Event created successfully", event)
  );
});

// ─── Get Events ────────────────────────────────────────────────────────────────

const getEvents = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const workspaceId = req.user.workspaceId;

  const result = await calendarService.getEvents({
    filters: req.query,
    userId,
    workspaceId
  });

  return res.status(200).json(
    new ApiResponse(200, "Events fetched successfully", result)
  );
});

// ─── Get Single Event ──────────────────────────────────────────────────────────

const getEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const event = await calendarService.getEventById(eventId);

  if (!event) {
    return res.status(404).json(
      new ApiResponse(404, "Event not found", null)
    );
  }

  return res.status(200).json(
    new ApiResponse(200, "Event fetched successfully", event)
  );
});

// ─── Get Upcoming Events ───────────────────────────────────────────────────────

const getUpcomingEvents = asyncHandler(async (req, res) => {
  const workspaceId = req.user.workspaceId;
  const limit = parseInt(req.query.limit) || 5;
  const daysAhead = parseInt(req.query.daysAhead) || 7;

  const events = await calendarService.getUpcomingEvents({
    workspaceId,
    limit,
    daysAhead,
  });

  return res.status(200).json(
    new ApiResponse(200, "Upcoming events fetched successfully", events)
  );
});

// ─── Get Record Events (CRM-scoped) ───────────────────────────────────────────

const getRecordEvents = asyncHandler(async (req, res) => {
  const { relatedId, relatedTo } = req.query;
  const limit = parseInt(req.query.limit) || 10;

  const events = await calendarService.getRecordEvents({
    relatedId,
    relatedTo,
    limit,
  });

  return res.status(200).json(
    new ApiResponse(200, "Record events fetched successfully", events)
  );
});

// ─── Get Calendar Stats ────────────────────────────────────────────────────────

const getCalendarStats = asyncHandler(async (req, res) => {
  const workspaceId = req.user.workspaceId;

  const stats = await calendarService.getCalendarStats({ workspaceId });

  return res.status(200).json(
    new ApiResponse(200, "Calendar stats fetched successfully", stats)
  );
});

// ─── Update Event ──────────────────────────────────────────────────────────────

const updateEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user.id;
  const { scope, ...data } = req.body;

  try {
    let event;

    // Check if this is a recurring event update
    if (scope && ["this", "this_and_future", "all"].includes(scope)) {
      event = await calendarService.updateRecurringEvent({
        eventId,
        data,
        scope,
        userId,
      });
    } else {
      event = await calendarService.updateEvent({
        eventId,
        data,
        userId,
      });
    }

    if (!event) {
      return res.status(404).json(
        new ApiResponse(404, "Event not found", null)
      );
    }

    return res.status(200).json(
      new ApiResponse(200, "Event updated successfully", event)
    );
  } catch (err) {
    if (err.message === "END_BEFORE_START") {
      return res.status(400).json(
        new ApiResponse(400, "End date must be after start date", null)
      );
    }
    if (err.message === "EVENT_NOT_FOUND") {
      return res.status(404).json(
        new ApiResponse(404, "Event not found", null)
      );
    }
    throw err;
  }
});

// ─── Delete Event ──────────────────────────────────────────────────────────────

const deleteEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user.id;
  const { scope } = req.query;

  try {
    if (scope && ["this", "this_and_future", "all"].includes(scope)) {
      await calendarService.deleteRecurringEvent({
        eventId,
        scope,
        userId,
      });
    } else {
      const event = await calendarService.deleteEvent({
        eventId,
        userId,
      });

      if (!event) {
        return res.status(404).json(
          new ApiResponse(404, "Event not found", null)
        );
      }
    }

    return res.status(200).json(
      new ApiResponse(200, "Event deleted successfully", null)
    );
  } catch (err) {
    if (err.message === "EVENT_NOT_FOUND") {
      return res.status(404).json(
        new ApiResponse(404, "Event not found", null)
      );
    }
    throw err;
  }
});

// ─── Update Attendee Status ────────────────────────────────────────────────────

const updateAttendeeStatus = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user.id;
  const { status } = req.body;

  try {
    const event = await calendarService.updateAttendeeStatus({
      eventId,
      userId,
      status,
    });

    return res.status(200).json(
      new ApiResponse(200, "Attendance status updated successfully", event)
    );
  } catch (err) {
    if (err.message === "ATTENDEE_NOT_FOUND") {
      return res.status(404).json(
        new ApiResponse(
          404,
          "You are not listed as an attendee for this event",
          null
        )
      );
    }
    throw err;
  }
});

module.exports = {
  createEvent,
  getEvents,
  getEvent,
  getUpcomingEvents,
  getRecordEvents,
  getCalendarStats,
  updateEvent,
  deleteEvent,
  updateAttendeeStatus,
};