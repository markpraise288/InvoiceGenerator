const Project = require("./project.model");
const Task = require("../tasks/task.model");
const { logActivity } = require("../activities/activity.service");
const {
  notificationService,
} = require("../notifications/notification.service");
const { MAX_FILE_SIZE_BYTES } = require("../files/file.validate");

const createProject = async (payload, user) => {
  const project = await Project.create({
    ...payload,
    createdBy: user.id,
    owner: payload.owner || user.id,
    workspaceId: user.workspaceId,
  });

  payload.members.map(async (m) => {
    await notificationService.createNotification({
      userId: m._id,
      title: "You have been assigned a new Project",
      description: `Assigned Project: ${payload.name}`,
      type: "project",
    });
  });

  await logActivity({
    relatedId: project._id,
    relatedTo: "Project",
    body: project.description,
    userId: user.id,
    type: "created",
    title: `Project created: ${project.name}`,
    workspaceId: project.workspaceId,
    meta: {
      projectId: project._id,
    },
  });

  return project;
};

const getProjects = async (query, user) => {
  const {
    search,
    status,
    owner,
    member,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const filter = {};
  filter.workspaceId = user.workspaceId;
  if (status) filter.status = status;
  if (owner) filter.owner = owner;
  if (member) filter.members = member;

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .populate("relatedId", "name email title")
      .populate("owner", "name email")
      .populate("members", "name email")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Project.countDocuments(filter),
  ]);

  // Attach progress percentage to each project in a single batched query
  // rather than N+1 querying Tasks per project.
  const projectIds = projects.map((p) => p._id);
  const taskCounts = await Task.aggregate([
    { $match: { project: { $in: projectIds } } },
    {
      $group: {
        _id: "$project",
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
      },
    },
  ]);

  const progressMap = {};
  taskCounts.forEach((tc) => {
    progressMap[tc._id.toString()] =
      tc.total > 0 ? Math.round((tc.completed / tc.total) * 100) : 0;
  });

  const projectsWithProgress = projects.map((p) => ({
    ...p,
    progress: progressMap[p._id.toString()] ?? 0,
  }));

  return {
    projects: projectsWithProgress,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

// Returns ALL projects grouped by status — used by the Kanban board, which
// needs every column populated at once rather than a paginated page.
const getProjectsKanban = async (filter = {}, user) => {
  filter.workspaceId = user.workspaceId;
  const projects = await Project.find(filter)
    .populate("relatedId", "name email")
    .populate("owner", "name email")
    .populate("members", "name email")
    .sort({ createdAt: -1 })
    .lean();

  const projectIds = projects.map((p) => p._id);
  const taskCounts = await Task.aggregate([
    { $match: { project: { $in: projectIds } } },
    {
      $group: {
        _id: "$project",
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
      },
    },
  ]);

  const progressMap = {};
  taskCounts.forEach((tc) => {
    progressMap[tc._id.toString()] =
      tc.total > 0 ? Math.round((tc.completed / tc.total) * 100) : 0;
  });

  const columns = {
    planning: [],
    active: [],
    on_hold: [],
    completed: [],
    cancelled: [],
  };

  projects.forEach((p) => {
    const withProgress = { ...p, progress: progressMap[p._id.toString()] ?? 0 };
    columns[p.status]?.push(withProgress);
  });

  return columns;
};

const getProjectById = async (projectId) => {
  const project = await Project.findById(projectId)
    .populate("relatedId", "name email title")
    .populate("owner", "name email")
    .populate("members", "name email")
    .populate("createdBy", "name email");

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  const taskStats = await Task.aggregate([
    { $match: { project: project._id } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
      },
    },
  ]);

  const stats = taskStats[0] || { total: 0, completed: 0 };
  const progress =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return { ...project.toObject(), progress, taskStats: stats };
};

const updateProject = async (projectId, payload, user) => {
  const project = await Project.findByIdAndUpdate(
    projectId,
    { $set: payload },
    { returnDocument: "after", runValidators: true },
  )
    .populate("relatedId", "name")
    .populate("owner", "name email")
    .populate("members", "name email");

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  await logActivity({
    relatedId: project._id,
    relatedTo: "Project",
    body: project.description,
    userId: user.id,
    type: "updated",
    title: `Project updated: ${project.name}`,
    workspaceId: project.workspaceId,
    meta: {
      projectId: project._id,
    },
  });

  return project;
};

const updateProjectStatus = async (projectId, status, user) => {
  const project = await Project.findByIdAndUpdate(
    projectId,
    { $set: { status } },
    { returnDocument: "after" },
  );

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  await logActivity({
    relatedId: project._id,
    relatedTo: "Project",
    body: project.description,
    userId: user.id,
    type: "status_changed",
    title: `Project updated: ${project.name}`,
    workspaceId: project.workspaceId,
    meta: {
      projectId: project._id,
    },
  });

  return project;
};

const deleteProject = async (projectId, user) => {
  const project = await Project.findById(projectId);

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  await logActivity({
    relatedId: project._id,
    relatedTo: "Project",
    body: project.description,
    userId: user.id,
    type: "deleted",
    title: `Project deleted: ${project.name}`,
    workspaceId: project.workspaceId,
    meta: {
      projectId: project._id,
    },
  });

  await Project.deleteOne(projectId);

  return project;
};

const getProjectTasks = async (projectId) => {
  return Task.find({ relatedId: projectId }).sort({ createdAt: -1 }).lean();
};

module.exports = {
  createProject,
  getProjects,
  getProjectsKanban,
  getProjectById,
  updateProject,
  updateProjectStatus,
  deleteProject,
  getProjectTasks,
};
