import fs from 'node:fs';
import path from 'node:path';

const summaryPath = path.resolve('coverage', 'coverage-summary.json');

const MODULE_THRESHOLDS = [
  {
    name: 'app',
    prefix: `${path.sep}src${path.sep}app${path.sep}`,
    thresholds: { branches: 85, functions: 85, lines: 85, statements: 85 },
  },
  {
    name: 'cli',
    prefix: `${path.sep}src${path.sep}cli${path.sep}`,
    thresholds: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
  {
    name: 'core',
    prefix: `${path.sep}src${path.sep}core${path.sep}`,
    thresholds: { branches: 85, functions: 85, lines: 85, statements: 85 },
  },
  {
    name: 'io',
    prefix: `${path.sep}src${path.sep}io${path.sep}`,
    thresholds: { branches: 85, functions: 85, lines: 85, statements: 85 },
  },
  {
    name: 'providers',
    prefix: `${path.sep}src${path.sep}providers${path.sep}`,
    thresholds: { branches: 80, functions: 80, lines: 85, statements: 85 },
  },
  {
    name: 'reporters',
    prefix: `${path.sep}src${path.sep}reporters${path.sep}`,
    thresholds: { branches: 85, functions: 85, lines: 85, statements: 85 },
  },
];

function emptyMetric() {
  return { total: 0, covered: 0 };
}

function emptyBucket() {
  return {
    lines: emptyMetric(),
    statements: emptyMetric(),
    functions: emptyMetric(),
    branches: emptyMetric(),
  };
}

function addMetric(acc, metric) {
  return {
    total: acc.total + metric.total,
    covered: acc.covered + metric.covered,
  };
}

function pct(metric) {
  if (metric.total === 0) return 100;
  return (metric.covered / metric.total) * 100;
}

function main() {
  if (!fs.existsSync(summaryPath)) {
    throw new Error(`Coverage summary not found: ${summaryPath}`);
  }

  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const entries = Object.entries(summary).filter(([key]) => key !== 'total');
  const failures = [];

  for (const moduleCfg of MODULE_THRESHOLDS) {
    let bucket = emptyBucket();
    let fileCount = 0;

    for (const [filePath, metrics] of entries) {
      const normalized = filePath.split('/').join(path.sep);
      if (!normalized.includes(moduleCfg.prefix)) continue;
      fileCount += 1;
      bucket = {
        lines: addMetric(bucket.lines, metrics.lines),
        statements: addMetric(bucket.statements, metrics.statements),
        functions: addMetric(bucket.functions, metrics.functions),
        branches: addMetric(bucket.branches, metrics.branches),
      };
    }

    if (fileCount === 0) {
      console.warn(
        `[coverage] module "${moduleCfg.name}" had no matching files`,
      );
      continue;
    }

    for (const [metricName, threshold] of Object.entries(
      moduleCfg.thresholds,
    )) {
      const value = pct(bucket[metricName]);
      if (value < threshold) {
        failures.push(
          `[coverage] module "${moduleCfg.name}" ${metricName} ${value.toFixed(2)}% < ${threshold}%`,
        );
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(failures.join('\n'));
  }

  console.log('[coverage] module-level thresholds passed');
}

main();
