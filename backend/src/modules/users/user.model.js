// modules/users/user.model.js

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // ─── Core Identity ─────────────────────────────────────────────────────────

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },

    // In your User model (wherever it lives — user.model.js), add:

    googleId: {
      type: String,
      unique: true,
      sparse: true, // lets multiple docs have no googleId without violating uniqueness
    },

    // Then change your existing `password` field's `required: true` to:
    password: {
      type: String,
      required: function () {
        return !this.googleId; // not required for accounts created via Google
      },
    },

    // ─── CRM Role & Permissions ────────────────────────────────────────────────

    role: {
      type: String,
      enum: ["admin", "member", "viewer", "superadmin"],
      default: "member",
    },

    // ─── Profile ───────────────────────────────────────────────────────────────

    // Renamed from profileImage → avatar for consistency across CRM components
    avatar: {
      type: String,
      default: null,
      maxlength: 500,
    },

    // Keep profileImage as alias so existing code doesn't break
    profileImage: {
      type: String,
      default: null,
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },

    position: {
      type: String,
      trim: true,
      maxlength: 150,
    },

    timezone: {
      type: String,
      default: "UTC",
      maxlength: 100,
    },

    // ─── Workspace / Business Info ─────────────────────────────────────────────
    // Kept for backward compatibility — will migrate to Settings model later

    companyName: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    address: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    workspaceId: {
      type: String,
      ref: "Workspace",
      required: true,
    },

    // ─── Authentication & Security ─────────────────────────────────────────────

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    refreshToken: {
      type: String,
    },

    resetPasswordToken: {
      type: String,
      select: false,
    },

    resetPasswordExpiry: {
      type: Date,
      select: false,
    },

    // ─── Active Sessions (Security page) ──────────────────────────────────────
    // Populated by auth middleware on each login

    sessions: [
      {
        token: {
          type: String,
          select: false,
        },
        device: {
          type: String,
          maxlength: 200,
        },
        ip: {
          type: String,
          maxlength: 45, // supports IPv6
        },
        lastActiveAt: {
          type: Date,
          default: Date.now,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ─── API Keys (Security page) ──────────────────────────────────────────────

    apiKeys: [
      {
        name: {
          type: String,
          trim: true,
          maxlength: 100,
        },
        key: {
          type: String,
          select: false, // raw key never returned
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        lastUsedAt: {
          type: Date,
          default: null,
        },
      },
    ],

    // ─── Billing & Subscription ────────────────────────────────────────────────

    // Add these fields to your existing User model schema:

    
    // Other existing fields remain unchanged
    // ...

    // Keep Stripe fields for backward compatibility
    stripeCustomerId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    subscriptionId: {
      type: String,
      default: null,
    },

    nextBillingDate: {
      type: Date,
      default: null,
    },

    trialEndsAt: {
      type: Date,
      default: null,
    },

    // ─── Notification Preferences ──────────────────────────────────────────────
    // Per-user overrides on top of workspace defaults

    notificationPrefs: {
      emailOnLeadAssigned: {
        type: Boolean,
        default: true,
      },
      emailOnDealWon: {
        type: Boolean,
        default: true,
      },
      emailOnDealLost: {
        type: Boolean,
        default: false,
      },
      emailOnTaskDue: {
        type: Boolean,
        default: true,
      },
      emailOnTaskOverdue: {
        type: Boolean,
        default: true,
      },
      emailOnMentioned: {
        type: Boolean,
        default: true,
      },
      emailDigest: {
        type: String,
        enum: ["never", "daily", "weekly"],
        default: "daily",
      },
    },

    // ─── CRM Preferences ───────────────────────────────────────────────────────

    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
      density: {
        type: String,
        enum: ["comfortable", "compact"],
        default: "comfortable",
      },
      defaultCurrency: {
        type: String,
        default: "USD",
        maxlength: 3,
      },
      dateFormat: {
        type: String,
        enum: ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"],
        default: "MM/DD/YYYY",
      },
      timezone: {
        type: String,
        default: "UTC",
      },
    },

    // ─── Soft Delete ────────────────────────────────────────────────────────────

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    deactivatedAt: {
      type: Date,
      default: null,
    },

    deactivationReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    // ─── Multi-Tenancy ─────────────────────────────────────────────────────────

    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ─── Virtuals ──────────────────────────────────────────────────────────────────

// Resolves avatar from either field so old code using profileImage still works
userSchema.virtual("displayAvatar").get(function () {
  return this.avatar || this.profileImage || null;
});

// Multi-tenant scoping — every "show me this tenant's users" query filters by this
userSchema.index({ tenant: 1, isActive: 1 });

// Whether this user is on a paid plan
userSchema.virtual("isPaid").get(function () {
  return (
    ["starter", "professional", "enterprise"].includes(this.plan) &&
    this.subscriptionStatus === "active"
  );
});

// Whether this user is in a free trial
userSchema.virtual("isTrialing").get(function () {
  return (
    this.subscriptionStatus === "trialing" &&
    this.trialEndsAt &&
    this.trialEndsAt > new Date()
  );
});

// ─── Indexes ───────────────────────────────────────────────────────────────────

// Primary lookup
userSchema.index({ email: 1 }, { unique: true });

// CRM queries — filter team by role
userSchema.index({ role: 1 });

// Active users only queries
userSchema.index({ isActive: 1, createdAt: -1 });

// Auth token lookups
userSchema.index({ resetPasswordToken: 1 }, { sparse: true });

// Billing lookups
userSchema.index({ paypalSubscriptionId: 1 }, { sparse: true });
userSchema.index({ subscriptionStatus: 1 });

// General sort
userSchema.index({ createdAt: 1 });

module.exports = mongoose.model("User", userSchema);
