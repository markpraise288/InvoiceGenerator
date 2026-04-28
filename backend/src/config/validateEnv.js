const Joi = require('joi');

const envVarsSchema = Joi.object({
  PORT: Joi.number().default(3000),
  MONGODB_URI: Joi.string().required().description('Mongo DB url'),
  JWT_SECRET: Joi.string().required().description('JWT secret key'),
  CORS_ORIGIN: Joi.string().default('*'),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  PAYPAL_CLIENT_ID: Joi.string().required().description('PayPal Client ID'),
  PAYPAL_SECRET: Joi.string().required().description('PayPal Secret'),
}).unknown().required();

const { error, value: envVars } = envVarsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  PORT: envVars.PORT,
  MONGODB_URI: envVars.MONGODB_URI,
  JWT_SECRET: envVars.JWT_SECRET,
  CORS_ORIGIN: envVars.CORS_ORIGIN,
  REDIS_HOST: envVars.REDIS_HOST,
  REDIS_PORT: envVars.REDIS_PORT,
  PAYPAL_CLIENT_ID: envVars.PAYPAL_CLIENT_ID,
  PAYPAL_SECRET: envVars.PAYPAL_SECRET,
};
