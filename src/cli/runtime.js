/**
 * @module cli/runtime
 * Injectable runtime dependencies for CLI commands.
 *
 * Separates process-level side effects (exit, argv, console) from business logic
 * so command handlers can be unit-tested without spawning real subprocesses.
 *
 * @example Real usage (production):
 *   import { defaultRuntime } from './runtime.js';
 *   await processCliOptions(options, defaultConfig, config, validate, defaultRuntime());
 *
 * @example Test usage:
 *   import { silentRuntime } from './runtime.js';
 *   const rt = silentRuntime();
 *   await processCliOptions(options, defaultConfig, config, validate, rt);
 *   assert.equal(rt.exitCode, 0);
 */

/**
 * @typedef {Object} Runtime
 * @property {(code?: number) => never} exit - Process exit function (injectable for tests).
 * @property {string[]} argv - Process argv array (injectable for tests).
 * @property {(...args: unknown[]) => void} log - Console log function.
 * @property {(...args: unknown[]) => void} warn - Console warn function.
 * @property {(...args: unknown[]) => void} error - Console error function.
 * @property {NodeJS.ProcessEnv} env - Process environment variables.
 * @property {boolean} isTTY - Whether stdout is attached to a TTY.
 */

/**
 * Build the real production runtime backed by Node.js process globals.
 * @returns {Runtime}
 */
export function defaultRuntime() {
  return {
    exit: (code = 0) => process.exit(code), // eslint-disable-line n/no-process-exit, unicorn/no-process-exit
    argv: process.argv,
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    env: process.env,
    isTTY: Boolean(process.stdout.isTTY),
  };
}

/**
 * Build a testable runtime that records calls instead of executing them.
 * @returns {Runtime & {exitCode: number|null, logMessages: string[], errorMessages: string[]}}
 */
export function silentRuntime() {
  const rt = {
    exitCode: null,
    logMessages: [],
    warnMessages: [],
    errorMessages: [],
    exit(code = 0) {
      rt.exitCode = code;
      throw new Error(`process.exit(${code})`); // simulate exit for test assertions
    },
    argv: [],
    log(...args) {
      rt.logMessages.push(args.join(' '));
    },
    warn(...args) {
      rt.warnMessages.push(args.join(' '));
    },
    error(...args) {
      rt.errorMessages.push(args.join(' '));
    },
    env: {},
    isTTY: false,
  };
  return rt;
}
