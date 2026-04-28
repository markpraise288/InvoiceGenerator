
const joi = require('joi');

const createClientSchema = joi.object({
    name: joi.string().required(),
    email: joi.string().email().required(),
    phone: joi.string(),
    address: joi.string()
});

const updateClientSchema = joi.object({
    name: joi.string(),
    email: joi.string().email(),
    phone: joi.string(),
    address: joi.string()
}).min(1);

module.exports = {
    createClientSchema,
    updateClientSchema,
};