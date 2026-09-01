// modules/calendar/calendar.service.js

const mongoose = require("mongoose");
const { CalendarEvent } = require("./calendar.model");
const { logActivity } = require("../activities/activity.service");
const { body } = require("express-validator");

// ─── Populate helper ───────────────────────────────────────────────────────────

const defaultPopulate = (query) =>
  query
    .populate("owner", "name email avatar")
    .populate("createdBy", "name email avatar")
    .populate("relatedId", "name email avatar")
    .populate("attendees.user", "name email avatar");

// ─── Create Event ──────────────────────────────────────────────────────────────

const createEvent = async ({ data, userId, workspaceId }) => {
  const event = await CalendarEvent.create({
    ...data,
    owner: data.owner ?? userId,
    createdBy: userId,
    workspaceId: workspaceId,
  });

  try {
    await logActivity({
      relatedId: event.relatedId,
      relatedTo: event.relatedTo,
      userId,
      body: event.description,
      type: "created",
      title: `Event scheduled: ${event.title}`,
      workspaceId: event.workspaceId,
      meta: {
        eventId: event._id,
        startAt: event.startAt,
        type: event.type,
      },
    });
  } catch (err) {
    console.error("Failed to log calendar event activity:", err);
  }

  return defaultPopulate(CalendarEvent.findById(event._id)).lean({
    virtuals: true,
  });
};

// ─── Get Events (calendar view) ────────────────────────────────────────────────

const getEvents = async ({ filters = {}, workspaceId }) => {
  const {
    from,
    to,
    type,
    status,
    relatedId,
    search,
    page = 1,
    limit = 50,
  } = filters;

  const query = {};

  query.workspaceId = workspaceId;

  // Date range — events that overlap the requested window
  if (from || to) {
    query.$and = [
      from ? { endAt: { $gte: new Date(from) } } : {},
      to ? { startAt: { $lte: new Date(to) } } : {},
    ].filter((c) => Object.keys(c).length > 0);
  }

  if (type) query.type = type;
  if (status) query.status = status;
  if (relatedId) query.relatedId = new mongoose.Types.ObjectId(relatedId);

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [events, total] = await Promise.all([
    defaultPopulate(
      CalendarEvent.find(query).sort({ startAt: 1 }).skip(skip).limit(limit),
    ).lean({ virtuals: true }),
    CalendarEvent.countDocuments(query),
  ]);

  return {
    events,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

// ─── Get Event by ID ───────────────────────────────────────────────────────────

const getEventById = async (eventId) => {
  const event = await defaultPopulate(CalendarEvent.findById(eventId)).lean({
    virtuals: true,
  });

  return event;
};

// ─── Get Events for a CRM Record ──────────────────────────────────────────────

const getRecordEvents = async ({ relatedId, limit = 10 }) => {
  const query = {};

  if (relatedId) query.relatedId = new mongoose.Types.ObjectId(relatedId);
  else return [];

  const events = await defaultPopulate(
    CalendarEvent.find(query).sort({ startAt: -1 }).limit(limit),
  ).lean({ virtuals: true });

  return events;
};

// ─── Get Upcoming Events ───────────────────────────────────────────────────────

const getUpcomingEvents = async ({ workspaceId, limit = 5, daysAhead = 7 }) => {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + daysAhead);

  const events = await defaultPopulate(
    CalendarEvent.find({
      workspaceId: workspaceId,
      startAt: { $gte: now, $lte: future },
      status: "scheduled",
    })
      .sort({ startAt: 1 })
      .limit(limit),
  ).lean({ virtuals: true });

  return events;
};

// ─── Update Event ──────────────────────────────────────────────────────────────

const updateEvent = async ({ eventId, data, userId }) => {
  // Validate end is after start when both provided
  if (data.startAt && data.endAt) {
    if (new Date(data.endAt) <= new Date(data.startAt)) {
      throw new Error("END_BEFORE_START");
    }
  }

  const event = await defaultPopulate(
    CalendarEvent.findByIdAndUpdate(
      eventId,
      { $set: data },
      { returnDocument: "after", runValidators: true },
    ),
  ).lean({ virtuals: true });

  try {
    await logActivity({
      relatedId: event.relatedId,
      relatedTo: event.relatedTo,
      userId,
      body: event.description,
      type: "updated",
      title: `Event updated: ${event.title}`,
      workspaceId: event.workspaceId,
      meta: {
        eventId: event._id,
        startAt: event.startAt,
        type: event.type,
      },
    });
  } catch (err) {
    console.error("Failed to log calendar event activity:", err);
  }


  return event;
};

// ─── Update Recurring Event ────────────────────────────────────────────────────

const updateRecurringEvent = async ({
  eventId,
  data,
  scope, // "this" | "this_and_future" | "all"
  userId,
}) => {
  const event = await CalendarEvent.findById(eventId);
  if (!event) throw new Error("EVENT_NOT_FOUND");

  const seriesId = event.recurringEventId ?? event._id;

  if (scope === "this") {
    // Update only this occurrence
    return updateEvent({ eventId, data, userId });
  }

  if (scope === "this_and_future") {
    // Update this and all future occurrences in the series
    await CalendarEvent.updateMany(
      {
        $or: [{ _id: seriesId }, { recurringEventId: seriesId }],
        startAt: { $gte: event.startAt },
      },
      { $set: data },
    );
  }

  if (scope === "all") {
    // Update every occurrence in the series
    await CalendarEvent.updateMany(
      {
        $or: [{ _id: seriesId }, { recurringEventId: seriesId }],
      },
      { $set: data },
    );
  }

  try {
    await logActivity({
      relatedId: event.relatedId,
      relatedTo: event.relatedTo,
      userId,
      body: event.description,
      type: "updated",
      title: `Event updated: ${event.title}`,
      workspaceId: event.workspaceId,
      meta: {
        eventId: event._id,
        startAt: event.startAt,
        type: event.type,
      },
    });
  } catch (err) {
    console.error("Failed to log calendar event activity:", err);
  }


  return defaultPopulate(CalendarEvent.findById(eventId)).lean({
    virtuals: true,
  });
};

// ─── Delete Event ──────────────────────────────────────────────────────────────

const deleteEvent = async ({ eventId }) => {
  const event = await CalendarEvent.findByIdAndDelete(eventId);
  return event;
};

// ─── Delete Recurring Event ────────────────────────────────────────────────────

const deleteRecurringEvent = async ({ eventId, scope, userId }) => {
  const event = await CalendarEvent.findById(eventId);
  if (!event) throw new Error("EVENT_NOT_FOUND");

  const seriesId = event.recurringEventId ?? event._id;

  try {
    await logActivity({
      relatedId: event.relatedId,
      relatedTo: event.relatedTo,
      body: event.description,
      userId,
      type: "deleted",
      title: `Event deleted: ${event.title}`,
      workspaceId: event.workspaceId,
      meta: {
        eventId: event._id,
        startAt: event.startAt,
        type: event.type,
      },
    });
  } catch (err) {
    console.error("Failed to log calendar event activity:", err);
  }

  if (scope === "this") {
    await CalendarEvent.findByIdAndDelete(eventId);
  } else if (scope === "this_and_future") {
    await CalendarEvent.deleteMany({
      $or: [{ _id: seriesId }, { recurringEventId: seriesId }],
      startAt: { $gte: event.startAt },
    });
  } else if (scope === "all") {
    await CalendarEvent.deleteMany({
      $or: [{ _id: seriesId }, { recurringEventId: seriesId }],
    });
  }

  return true;
};

// ─── Update Attendee Status ────────────────────────────────────────────────────

const updateAttendeeStatus = async ({ eventId, userId, status }) => {
  const event = await CalendarEvent.findOneAndUpdate(
    {
      _id: eventId,
      "attendees.user": new mongoose.Types.ObjectId(userId),
    },
    {
      $set: { "attendees.$.status": status },
    },
    { returnDocument: "after" },
  );

  if (!event) throw new Error("ATTENDEE_NOT_FOUND");

  try {
    await logActivity({
      relatedId: event.relatedId,
      relatedTo: event.relatedTo,
      body: event.description,
      userId,
      type: "status_changed",
      title: `Event updated: ${event.title}`,
      workspaceId: event.workspaceId,
      meta: {
        eventId: event._id,
        startAt: event.startAt,
        type: event.type,
      },
    });
  } catch (err) {
    console.error("Failed to log calendar event activity:", err);
  }

  return defaultPopulate(CalendarEvent.findById(eventId)).lean({
    virtuals: true,
  });
};

// ─── Get Calendar Stats ────────────────────────────────────────────────────────

const getCalendarStats = async ({ workspaceId }) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const [totalThisMonth, upcomingThisWeek, typeBreakdown, completedThisMonth] =
    await Promise.all([
      CalendarEvent.countDocuments({
        workspaceId: workspaceId,
        startAt: { $gte: monthStart, $lte: monthEnd },
      }),
      CalendarEvent.countDocuments({
        workspaceId: workspaceId,
        startAt: {
          $gte: now,
          $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
        status: "scheduled",
      }),
      CalendarEvent.aggregate([
        { $match: { workspaceId: workspaceId } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      CalendarEvent.countDocuments({
        workspaceId: workspaceId,
        status: "completed",
        startAt: { $gte: monthStart, $lte: monthEnd },
      }),
    ]);

  return {
    totalThisMonth,
    upcomingThisWeek,
    completedThisMonth,
    typeBreakdown: typeBreakdown.reduce((acc, { _id, count }) => {
      acc[_id] = count;
      return acc;
    }, {}),
  };
};

// ─── Generate Recurring Occurrences ───────────────────────────────────────────
// Called internally when creating a recurring event to expand future instances

const generateRecurringOccurrences = async ({
  parentEvent,
  workspaceId,
  userId,
}) => {
  const { recurrence, startAt, endAt, _id: parentId } = parentEvent;
  if (!recurrence?.frequency) return;

  const duration = new Date(endAt) - new Date(startAt);
  const occurrences = [];
  let current = new Date(startAt);
  const maxOccurrences = recurrence.occurrences ?? 52; // default max 1 year weekly
  const endDate = recurrence.endDate ? new Date(recurrence.endDate) : null;
  let count = 0;

  // Skip the first occurrence — it's the parent event itself
  const advance = () => {
    const interval = recurrence.interval ?? 1;
    switch (recurrence.frequency) {
      case "daily":
        current.setDate(current.getDate() + interval);
        break;
      case "weekly":
        current.setDate(current.getDate() + 7 * interval);
        break;
      case "monthly":
        current.setMonth(current.getMonth() + interval);
        break;
      case "yearly":
        current.setFullYear(current.getFullYear() + interval);
        break;
    }
  };

  advance(); // skip parent

  while (count < maxOccurrences - 1) {
    if (endDate && current > endDate) break;

    const occurrenceStart = new Date(current);
    const occurrenceEnd = new Date(current.getTime() + duration);

    occurrences.push({
      ...parentEvent,
      _id: undefined,
      startAt: occurrenceStart,
      endAt: occurrenceEnd,
      recurringEventId: parentId,
      recurrence: undefined, // only parent stores recurrence config
      reminders: parentEvent.reminders.map((r) => ({
        ...r,
        sent: false,
      })),
      createdBy: userId,
      workspaceId,
    });

    advance();
    count++;
  }

  if (occurrences.length > 0) {
    await CalendarEvent.insertMany(occurrences);
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  getRecordEvents,
  getUpcomingEvents,
  updateEvent,
  updateRecurringEvent,
  deleteEvent,
  deleteRecurringEvent,
  updateAttendeeStatus,
  getCalendarStats,
  generateRecurringOccurrences,
};
