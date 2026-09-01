const mongoose = require("mongoose");
const { Schema } = mongoose;

const adminAuditLogSchema = new Schema(
  {
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      // the super-admin who performed the action
    },
    action: {
      type: String,
      enum: [
        "tenant_suspended",
        "tenant_reactivated",
        "tenant_plan_changed",
        "tenant_deleted",
        "tenant_created",
        "tenant_updated",
        "impersonation_started",
        "impersonation_ended",
        "user_suspended",
        "user_reactivated",
        "user_role_changed",
        "user_deleted",
      ],
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["tenant", "user"],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    targetLabel: {
      type: String,
      trim: true,
      default: "",
      // denormalized snapshot (e.g. business name or user email) so the log
      // stays readable even if the target is later deleted or renamed
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
      // action-specific details, e.g. { fromPlan: "starter", toPlan: "pro" }
      // or { reason: "non-payment" } for suspensions
    },
    ipAddress: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ actor: 1, createdAt: -1 });
adminAuditLogSchema.index({ targetType: 1, targetId: 1 });

// Enforce append-only behavior at the schema level — audit logs should never
// be editable or deletable through normal application code, only through
// direct DB access if absolutely necessary (e.g. legal/compliance purge).
adminAuditLogSchema.pre(["updateOne", "findOneAndUpdate", "updateMany"], function () {
  throw new Error("Audit logs are immutable and cannot be updated");
});

module.exports = mongoose.model("AdminAuditLog", adminAuditLogSchema);