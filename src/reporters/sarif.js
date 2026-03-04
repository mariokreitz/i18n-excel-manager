/**
 * @fileoverview SARIF 2.1.0 report builder for translation analysis results.
 * Produces GitHub Code Scanning compatible output.
 * @module reporters/sarif
 */

/**
 * Build a SARIF 2.1.0 report from analysis results.
 *
 * @param {{totalCodeKeys: number, fileReports: Object<string, {missing: string[], unused: string[]}>}} report Analysis report.
 * @param {string} sourcePath Path to the i18n source directory (used for location URIs).
 * @returns {Object} SARIF 2.1.0 JSON object.
 */
export function buildSarifReport(report, sourcePath) {
  const results = [];

  for (const [file, res] of Object.entries(report.fileReports)) {
    for (const key of res.missing) {
      results.push({
        ruleId: 'i18n/missing-key',
        level: 'warning',
        message: {
          text: `Translation key "${key}" is used in code but missing from "${file}".`,
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: file,
                uriBaseId: '%SRCROOT%',
              },
            },
          },
        ],
      });
    }

    for (const key of res.unused) {
      results.push({
        ruleId: 'i18n/unused-key',
        level: 'note',
        message: {
          text: `Translation key "${key}" is defined in "${file}" but unused in code.`,
        },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: file,
                uriBaseId: '%SRCROOT%',
              },
            },
          },
        ],
      });
    }
  }

  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'i18n-excel-manager',
            informationUri: 'https://github.com/mariokreitz/i18n-excel-manager',
            rules: [
              {
                id: 'i18n/missing-key',
                shortDescription: {
                  text: 'Translation key used in code but missing from JSON.',
                },
                defaultConfiguration: { level: 'warning' },
              },
              {
                id: 'i18n/unused-key',
                shortDescription: {
                  text: 'Translation key defined in JSON but unused in code.',
                },
                defaultConfiguration: { level: 'note' },
              },
            ],
          },
        },
        results,
        originalUriBaseIds: {
          '%SRCROOT%': {
            uri: `file:///${sourcePath.replaceAll('\\', '/')}/`,
          },
        },
      },
    ],
  };
}
