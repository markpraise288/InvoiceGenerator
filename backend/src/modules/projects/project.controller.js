const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/apiResponse");
const projectService = require("./project.service");
const {
  createProjectSchema,
  updateProjectSchema,
  updateProjectStatusSchema,
  listProjectsQuerySchema,
} = require("./project.validate");

const createProject = asyncHandler(async (req, res) => {
  const { error, value } = createProjectSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const project = await projectService.createProject(value, req.user);
  return res
    .status(201)
    .json(new ApiResponse(201, "Project created successfully", project));
});

const getProjects = asyncHandler(async (req, res) => {
  const { error, value } = listProjectsQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const result = await projectService.getProjects(value, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, "Projects fetched successfully", result));
});

const getProjectsKanban = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.owner) filter.owner = req.query.owner;

  const columns = await projectService.getProjectsKanban(filter, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, "Kanban board fetched successfully", columns));
});

const getProjectById = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectById(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, "Project fetched successfully", project));
});

const updateProject = asyncHandler(async (req, res) => {
  const { error, value } = updateProjectSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const project = await projectService.updateProject(req.params.id, value, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, "Project updated successfully", project));
});

const updateProjectStatus = asyncHandler(async (req, res) => {
  const { error, value } = updateProjectStatusSchema.validate(req.body);
  if (error) {
    return res.status(400).json(new ApiResponse(400, error.details[0].message, null));
  }

  const project = await projectService.updateProjectStatus(req.params.id, value.status, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, "Project status updated successfully", project));
});

const deleteProject = asyncHandler(async (req, res) => {
  await projectService.deleteProject(req.params.id, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, "Project deleted successfully", null));
});

const getProjectTasks = asyncHandler(async (req, res) => {
  const tasks = await projectService.getProjectTasks(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, "Project tasks fetched successfully", tasks));
});

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