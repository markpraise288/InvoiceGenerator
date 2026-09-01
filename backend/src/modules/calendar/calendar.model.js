// modules/calendar/calendar.model.js

const mongoose = require("mongoose");

const EVENT_TYPES = [
  "meeting",
  "call",
  "follow_up",
  "deadline",
  "demo",
  "task",
  "other",
];

const RECURRENCE_FREQUENCIES = [
  "daily",
  "weekly",
  "monthly",
  "yearly",
];

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    type: {
      type: String,
      enum: EVENT_TYPES,
      default: "meeting",
    },

    // ─── Time ──────────────────────────────────────────────────────────────────

    startAt: {
      type: Date,
      required: true,
      index: true,
    },

    endAt: {
      type: Date,
      required: true,
    },

    allDay: {
      type: Boolean,
      default: false,
    },

    timezone: {
      type: String,
      default: "UTC",
      maxlength: 100,
    },

    // ─── Location ──────────────────────────────────────────────────────────────

    location: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    meetingUrl: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // ─── CRM Relations ─────────────────────────────────────────────────────────

    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "relatedTo",
      default: null,
      index: true,
    },

    relatedTo: {
      type: String,
      enum: ["Lead", "Contact", "Deal", "Task", "Company", "Invoice", "Customer", "Project"],
      default: null,
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true
    },

    // ─── Attendees ─────────────────────────────────────────────────────────────

    attendees: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        // External attendees (non-users)
        email: {
          type: String,
          trim: true,
          lowercase: true,
        },
        name: {
          type: String,
          trim: true,
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "declined", "tentative"],
          default: "pending",
        },
      },
    ],

    // ─── Recurrence ────────────────────────────────────────────────────────────

    recurrence: {
      frequency: {
        type: String,
        enum: RECURRENCE_FREQUENCIES,
      },
      interval: {
        type: Number,
        min: 1,
        default: 1, // every N frequency units
      },
      daysOfWeek: {
        type: [Number], // 0=Sun, 1=Mon, ... 6=Sat
      },
      endDate: {
        type: Date,
      },
      occurrences: {
        type: Number,
        min: 1,
      },
    },

    // If this event is part of a recurring series
    recurringEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CalendarEvent",
      default: null,
    },

    // ─── Reminders ─────────────────────────────────────────────────────────────

    reminders: [
      {
        method: {
          type: String,
          enum: ["email", "notification"],
          default: "notification",
        },
        minutesBefore: {
          type: Number,
          min: 0,
          default: 15,
        },
        sent: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // ─── Visual ────────────────────────────────────────────────────────────────

    color: {
      type: String,
      default: "#60a5fa", // blue
      maxlength: 7,
    },

    // ─── Status ────────────────────────────────────────────────────────────────

    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },

    // ─── Ownership ─────────────────────────────────────────────────────────────

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtuals ──────────────────────────────────────────────────────────────────

eventSchema.virtual("durationMinutes").get(function () {
  if (!this.startAt || !this.endAt) return 0;
  return Math.round((this.endAt - this.startAt) / (1000 * 60));
});

eventSchema.virtual("isUpcoming").get(function () {
  return this.startAt > new Date() && this.status === "scheduled";
});

eventSchema.virtual("isPast").get(function () {
  return this.endAt < new Date();
});

// ─── Indexes ───────────────────────────────────────────────────────────────────

// Primary calendar view query — events in a date range for a user
eventSchema.index({ owner: 1, startAt: 1, endAt: 1 });

// CRM quick lookups
eventSchema.index({ relatedId: 1, startAt: -1 });

// Reminder processing
eventSchema.index({ "reminders.sent": 1, startAt: 1 });

// Recurring series
eventSchema.index({ recurringEventId: 1 });

const CalendarEvent = mongoose.model("CalendarEvent", eventSchema);

module.exports = { CalendarEvent, EVENT_TYPES, RECURRENCE_FREQUENCIES };