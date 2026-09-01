const mongoose = require("mongoose");
const { Schema } = mongoose;

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    relatedId: {
      type: Schema.Types.ObjectId,
      refPath: "relatedTo",
      required: true,
    },
    relatedTo: {
      type: String,
      enum: ["Customer", "Company", "Contact", "Deal"],
      required: true
    },
    status: {
      type: String,
      enum: ["planning", "active", "on_hold", "completed", "cancelled"],
      default: "planning",
      index: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    budget: {
      type: Number,
      default: 0,
      min: 0,
      // stored in cents
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    members: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
  },
  { timestamps: true }
);

projectSchema.index({ name: "text" });
projectSchema.index({ status: 1, createdBy: 1 });
projectSchema.index({ customer: 1 });
projectSchema.index({ company: 1 });

module.exports = mongoose.model("Project", projectSchema);