const express = require("express");
const router = express.Router();

const verifyToken = require("../../middlewares/auth.middleware");
const {
  createProject,
  getProjects,
  getProjectsKanban,
  getProjectById,
  updateProject,
  updateProjectStatus,
  deleteProject,
  getProjectTasks,
} = require("./project.controller");

router.use(verifyToken);

router.route("/").post(createProject).get(getProjects);

router.get("/kanban", getProjectsKanban);

router
  .route("/:id")
  .get(getProjectById)
  .put(updateProject)
  .delete(deleteProject);

router.patch("/:id/status", updateProjectStatus);
router.get("/:id/tasks", getProjectTasks);

module.exports = router;