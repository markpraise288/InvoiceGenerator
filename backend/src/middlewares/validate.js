const apiResponse = require("../utils/apiResponse");
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
    if (error) {
      console.log(error)
        return res.status(400).json(new apiResponse(false, error.details[0].message));
    }
    next();
}

module.exports = validate;