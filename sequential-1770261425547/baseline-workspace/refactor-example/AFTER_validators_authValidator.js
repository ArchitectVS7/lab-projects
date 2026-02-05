/**
 * AFTER: validators/authValidator.js
 * 
 * Pure validation logic - no DB, no side effects, easy to test
 */

const Joi = require('joi');

const passwordSchema = Joi.string()
  .min(8)
  .pattern(/[A-Z]/, 'uppercase')
  .pattern(/[0-9]/, 'number')
  .messages({
    'string.min': 'Password must be at least 8 characters',
    'string.pattern.name': 'Password must contain an {#name}',
  });

const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required',
    }),
  
  password: passwordSchema
    .required()
    .messages({
      'any.required': 'Password is required',
    }),
  
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name must be at most 50 characters',
      'any.required': 'Name is required',
    }),
});

/**
 * Validate registration input
 * @param {object} data - Raw request body
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
function validateRegister(data) {
  const { error, value } = registerSchema.validate(data, {
    abortEarly: true,
    stripUnknown: true,
  });

  if (error) {
    return { success: false, error: error.details[0].message };
  }

  return { success: true, data: value };
}

module.exports = {
  validateRegister,
  registerSchema,
  passwordSchema,
};
