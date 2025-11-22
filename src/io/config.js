/**
 * Configuration loading and validation utilities.
 * Handles reading config files and validating against a schema.
 */

import fs from 'node:fs/promises';

import Joi from 'joi';

/**
 * Joi schema for validating configuration objects.
 * Defines the structure for languages mapping and default paths.
 * @type {Joi.ObjectSchema}
 */
export const configSchema = Joi.object({
  languages: Joi.object()
    .pattern(/^[\w.-]+$/, Joi.string().min(1))
    .min(1)
    .required()
    .messages({
      'object.base': 'languages must be an object of code:name',
      'any.required': 'languages is required',
    }),
  defaults: Joi.object({
    sourcePath: Joi.string().min(1).required(),
    targetFile: Joi.string().min(1).required(),
    targetPath: Joi.string().min(1).required(),
    sheetName: Joi.string().min(1).default('Translations'),
  })
    .required()
    .messages({ 'any.required': 'defaults is required' }),
}).required();

/**
 * Loads and validates a configuration file.
 * Reads the JSON file, parses it, and validates against the config schema.
 * @param {string} filePath - Path to the configuration JSON file.
 * @returns {Promise<Object>} Validated configuration object.
 * @throws {Error} If file reading fails, JSON parsing fails, or validation fails.
 */
export async function loadValidatedConfig(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  let json;
  try {
    json = JSON.parse(raw);
  } catch (error_) {
    throw new Error(`Invalid JSON in config: ${error_.message}`);
  }
  return validateConfigObject(json);
}

/**
 * Validates a configuration object against the schema.
 * @param {Object} obj - The configuration object to validate.
 * @returns {Object} The validated and potentially transformed configuration object.
 * @throws {Error} If validation fails, with detailed error messages.
 */
export function validateConfigObject(obj) {
  const { value, error } = configSchema.validate(obj, {
    abortEarly: false,
    allowUnknown: false,
  });
  if (error) {
    const details = error.details
      .map((d) => `- ${d.message} at ${d.path.join('.')}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${details}`);
  }
  return value;
}
