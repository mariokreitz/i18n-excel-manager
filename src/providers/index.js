/**
 * @fileoverview Provider registry and loader helpers.
 * @module providers
 */

import fs from 'node:fs';
import path from 'node:path';

import { GeminiProvider } from './gemini.provider.js';

/**
 * Built-in translation provider registry.
 */
const BUILTIN_PROVIDERS = {
  gemini: GeminiProvider,
};

function toCanonicalPath(filePath) {
  try {
    return fs.realpathSync(filePath);
  } catch {
    const parentReal = fs.realpathSync(path.dirname(filePath));
    return path.join(parentReal, path.basename(filePath));
  }
}

function assertPathWithinCwd(filePath) {
  const cwdReal = fs.realpathSync(process.cwd());
  const targetReal = toCanonicalPath(filePath);
  const relativePath = path.relative(cwdReal, targetReal);
  if (
    relativePath !== '' &&
    relativePath !== '.' &&
    (relativePath.startsWith('..') || path.isAbsolute(relativePath))
  ) {
    throw new Error(
      'Custom provider path must resolve within the current working directory',
    );
  }
  return targetReal;
}

/**
 * Resolve a built-in provider class by name.
 * @param {string} name Provider identifier.
 * @returns {typeof TranslationProvider} Provider constructor.
 */
export function getBuiltInProvider(name = 'gemini') {
  const normalized = String(name || 'gemini').toLowerCase();
  const ProviderClass = BUILTIN_PROVIDERS[normalized];
  if (!ProviderClass) {
    throw new Error(
      `Unknown provider "${name}". Available built-ins: ${Object.keys(BUILTIN_PROVIDERS).join(', ')}`,
    );
  }
  return ProviderClass;
}

/**
 * Instantiate a built-in provider.
 * @param {string} name Provider identifier.
 * @param {string} apiKey API key for provider setup.
 * @param {string} [model] Optional provider model.
 * @returns {TranslationProvider}
 */
export function createBuiltInProvider(name, apiKey, model) {
  const ProviderClass = getBuiltInProvider(name);
  return new ProviderClass(apiKey, model);
}

/**
 * Load a custom provider module from local filesystem path.
 * @param {string} providerPath Absolute or relative module path.
 * @param {string} apiKey API key passed to provider constructor.
 * @param {string} [model] Optional provider model.
 * @param {{restrictToCwd?: boolean}} [security] Loader security options.
 * @returns {Promise<TranslationProvider>} Created provider instance.
 */
export async function loadCustomProvider(
  providerPath,
  apiKey,
  model,
  security = {},
) {
  const resolvedPath = path.resolve(providerPath);
  const canonicalPath =
    security.restrictToCwd === false
      ? toCanonicalPath(resolvedPath)
      : assertPathWithinCwd(resolvedPath);
  const mod = await import(canonicalPath);
  const ProviderClass = mod.default;

  if (typeof ProviderClass !== 'function') {
    throw new TypeError(
      `Provider module must export a default class: ${providerPath}`,
    );
  }

  const instance = new ProviderClass(apiKey, model);
  if (typeof instance?.translateBatch !== 'function') {
    throw new TypeError(
      `Provider default export must implement translateBatch(texts, sourceLang, targetLang): ${providerPath}`,
    );
  }

  return instance;
}

export { GeminiProvider } from './gemini.provider.js';
export { TranslationError, TranslationProvider } from './base.js';
