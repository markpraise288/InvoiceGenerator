const express = require("express");
const router = express.Router();

const verifyToken = require("../../middlewares/auth.middleware");
const {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} = require("./customer.controller");

router.use(verifyToken);

router.route("/").post(createCustomer).get(getCustomers);

router
  .route("/:id")
  .get(getCustomerById)
  .put(updateCustomer)
  .delete(deleteCustomer);

module.exports = router;