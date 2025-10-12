import fs from 'node:fs/promises';
import path from 'node:path';

function assertStringPath(p, label) {
  if (typeof p !== 'string' || p.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
}

export function jsonFileReporter(filePath) {
  assertStringPath(filePath, 'filePath');
  const resolved = path.resolve(filePath);
  return {
    print: async (report) => {
      const content = JSON.stringify(report, null, 2);
      // Writing to a resolved path controlled by the caller (e.g., CLI arg)
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      await fs.writeFile(resolved, content, 'utf8');
    },
    warn: (m) => {
      /* eslint-disable no-console */
      console.warn(m); /* eslint-enable no-console */
    },
  };
}
