const joi = require('joi');

const registerSchema = joi.object({
    name: joi.string(),
    email: joi.string().email().required(),
    address: joi.string(),
    phone: joi.string(),
    companyName: joi.string(),
    password: joi.string().min(6).required(),
});

const loginSchema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().min(6).required()
});

module.exports = {
    registerSchema,
    loginSchema
}