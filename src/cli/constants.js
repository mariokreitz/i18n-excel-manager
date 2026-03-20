/**
 * @module cli/constants
 * String literals & flag descriptors for CLI usage.
 * Categories:
 * - Option descriptions (DESC_*)
 * - Messages (MSG_*)
 * - Flags (FLAG_*)
 * - Metadata (TOOL_*)
 */

/**
 * Description for sheet name option.
 * @constant {string}
 */
export const DESC_SHEET_NAME = 'name of the Excel worksheet';

/**
 * Description for dry-run option.
 * @constant {string}
 */
export const DESC_DRY_RUN = 'simulate only, do not write files';

/**
 * Description for no-report option.
 * @constant {string}
 */
export const DESC_NO_REPORT = 'skip generating translation report';

/**
 * Description for fail-on-duplicates option.
 * @constant {string}
 */
export const DESC_FAIL_ON_DUP =
  'fail if duplicate keys are detected in the Excel sheet';

/**
 * Description for output i18n directory option.
 * @constant {string}
 */
export const DESC_OUTPUT_I18N_DIR = 'target directory for i18n JSON files';

/**
 * Description for init languages option.
 * @constant {string}
 */
export const DESC_INIT_LANGS =
  'comma-separated language codes to initialize (e.g., en,de,fr)';

/**
 * Description for config file option.
 * @constant {string}
 */
export const DESC_CONFIG_FILE = 'path to config file';

/**
 * Default config file path.
 * @constant {string}
 */
export const DEFAULT_CONFIG_FILE = './config.json';

/**
 * Config flag for commander.
 * @constant {string}
 */
export const OPT_CONFIG_FLAG = '--config <file>';

/**
 * Prefix for converting i18n files message.
 * @constant {string}
 */
export const MSG_CONVERTING_I18N_PREFIX = 'Converting i18n files from ';

/**
 * Prefix for converting Excel files message.
 * @constant {string}
 */
export const MSG_CONVERTING_EXCEL_PREFIX = 'Converting Excel from ';

/**
 * Prefix for conversion completed message.
 * @constant {string}
 */
export const MSG_CONVERSION_COMPLETED_PREFIX = '✅ Conversion completed: ';

/**
 * Message for dry-run single file.
 * @constant {string}
 */
export const MSG_DRY_RUN_SINGLE = '🔎 Dry-run: No file was written.';

/**
 * Message for dry-run multiple files.
 * @constant {string}
 */
export const MSG_DRY_RUN_PLURAL = '🔎 Dry-run: No files were written.';

/**
 * Prefix for init completed message.
 * @constant {string}
 */
export const MSG_INIT_COMPLETED_PREFIX = '✅ Initialization completed in ';

/**
 * Prefix for skipped existing file message.
 * @constant {string}
 */
export const MSG_INIT_SKIPPED_PREFIX = '⚠️  Skipped existing file ';

/**
 * Prefix for will create file message.
 * @constant {string}
 */
export const MSG_INIT_WILL_CREATE = '📝 Will create: ';

/**
 * Prefix for created file message.
 * @constant {string}
 */
export const MSG_INIT_CREATED = '🆕 Created: ';

/**
 * Message for no i18n files detected.
 * @constant {string}
 */
export const MSG_INIT_DETECTED_NONE = 'No i18n JSON files detected at ';

/**
 * Dry-run flag literal.
 * @constant {string}
 */
export const FLAG_DRY_RUN = '-d, --dry-run';

/**
 * Fail on duplicates flag literal.
 * @constant {string}
 */
export const FLAG_FAIL_ON_DUP = '--fail-on-duplicates';

/**
 * Tool name.
 * @constant {string}
 */
export const TOOL_NAME = 'i18n-excel-manager';

/**
 * Tool description.
 * @constant {string}
 */
export const TOOL_DESCRIPTION =
  'Tool for converting i18n files to Excel and back';

/**
 * Description for JSON report option on analyze command.
 * @constant {string}
 */
export const DESC_JSON_REPORT = 'output analysis report as JSON to stdout';

/**
 * Description for fail-on-missing option on analyze command.
 * @constant {string}
 */
export const DESC_FAIL_ON_MISSING =
  'exit with code 1 if any missing keys are found';

/**
 * Description for fail-on-unused option on analyze command.
 * @constant {string}
 */
export const DESC_FAIL_ON_UNUSED =
  'exit with code 1 if any unused keys are found';

/**
 * Description for init template option.
 * @constant {string}
 */
export const DESC_INIT_TEMPLATE =
  'path to a JSON file to use as the starter translation skeleton';

/**
 * Description for custom translation provider option.
 * @constant {string}
 */
export const DESC_PROVIDER =
  'path to a custom TranslationProvider module (must export a default class)';

/**
 * Description for all-sheets option on excel-to-i18n.
 * @constant {string}
 */
export const DESC_ALL_SHEETS =
  'process all worksheets instead of only the named one';

/**
 * Description for watch option on analyze.
 * @constant {string}
 */
export const DESC_WATCH = 'watch files and re-run analysis on change';

/**
 * Description for metadata-keys option on analyze.
 * @constant {string}
 */
export const DESC_METADATA_KEYS =
  'comma-separated metadata property names to treat as translation keys (e.g., titleKey,descriptionKey)';

/**
 * Description for format option on analyze.
 * @constant {string}
 */
export const DESC_FORMAT =
  'output format for analysis report (text, json, sarif)';

/**
 * Description for patterns option on analyze.
 * @constant {string}
 */
export const DESC_PATTERNS =
  'comma-separated glob patterns for source code files (useful for monorepos)';
