const Joi = require('joi');

const envVarsSchema = Joi.object({
  PORT: Joi.number().default(3000),
  MONGODB_URL: Joi.string().required().description('Mongo DB url'),
  JWT_SECRET: Joi.string().required().description('JWT secret key'),
  CORS_ORIGIN: Joi.string().default('*'),
}).unknown().required();

const { error, value: envVars } = envVarsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  PORT: envVars.PORT,
  MONGODB_URL: envVars.MONGODB_URL,
  JWT_SECRET: envVars.JWT_SECRET,
  CORS_ORIGIN: envVars.CORS_ORIGIN,
};
