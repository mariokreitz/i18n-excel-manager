/**
 * @module cli/contracts
 * Contract dispatcher for CLI command normalization.
 */

import {
  assertAnalyzeInvariants,
  assertAnalyzeThenTranslateInvariants,
  normalizeAnalyzeContract,
  normalizeAnalyzeThenTranslateContract,
} from './analyze.contract.js';
import {
  assertExcelToI18nInvariants,
  assertI18nToExcelInvariants,
  normalizeExcelToI18nContract,
  normalizeI18nToExcelContract,
} from './convert.contract.js';
import {
  assertInitInvariants,
  normalizeInitContract,
} from './init.contract.js';
import {
  assertTranslateInvariants,
  normalizeTranslateContract,
} from './translate.contract.js';

/**
 * Assert invariants for the resolved command action.
 * @param {'i18nToExcel'|'excelToI18n'|'init'|'analyze'|'analyzeThenTranslate'|'translate'|undefined} action Resolved action.
 * @param {Object} options Normalized options.
 * @param {{runtime?: import('../runtime.js').Runtime}} [context] Validation context.
 * @returns {void}
 */
export function assertCommandInvariants(action, options, context = {}) {
  switch (action) {
    case 'i18nToExcel': {
      return assertI18nToExcelInvariants(options);
    }
    case 'excelToI18n': {
      return assertExcelToI18nInvariants(options);
    }
    case 'init': {
      return assertInitInvariants(options);
    }
    case 'analyze': {
      return assertAnalyzeInvariants(options);
    }
    case 'analyzeThenTranslate': {
      return assertAnalyzeThenTranslateInvariants(options);
    }
    case 'translate': {
      return assertTranslateInvariants(options, context);
    }
    default: {
      return;
    }
  }
}

/**
 * Normalize merged CLI options for the resolved action.
 * @param {'i18nToExcel'|'excelToI18n'|'init'|'analyze'|'analyzeThenTranslate'|'translate'|undefined} action Resolved action.
 * @param {Object} options Merged CLI options.
 * @param {{defaultConfig:Object, runtimeConfig:Object, runtime: import('../runtime.js').Runtime, isDryRun:boolean}} context Normalization context.
 * @returns {Object} Normalized options.
 */
export function normalizeCommandOptions(action, options, context) {
  const { defaultConfig, runtimeConfig, runtime, isDryRun } = context;

  switch (action) {
    case 'i18nToExcel': {
      return normalizeI18nToExcelContract(
        options,
        defaultConfig,
        runtimeConfig,
        isDryRun,
      );
    }
    case 'excelToI18n': {
      return normalizeExcelToI18nContract(
        options,
        defaultConfig,
        runtimeConfig,
        isDryRun,
        runtime,
      );
    }
    case 'init': {
      return normalizeInitContract(options, defaultConfig);
    }
    case 'analyze': {
      return normalizeAnalyzeContract(options, defaultConfig);
    }
    case 'analyzeThenTranslate': {
      return normalizeAnalyzeThenTranslateContract(options, defaultConfig);
    }
    case 'translate': {
      return normalizeTranslateContract(options, defaultConfig, runtimeConfig);
    }
    default: {
      return {
        ...options,
        format: options?.format ?? 'text',
        quiet: options?.quiet === true,
      };
    }
  }
}
