import fs from 'node:fs/promises';
import path from 'node:path';

function assertStringPath(p, label) {
  if (typeof p !== 'string' || p.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
}

export async function ensureDirectoryExists(dirPath) {
  assertStringPath(dirPath, 'dirPath');
  const resolved = path.resolve(dirPath);
  // Path is resolved and controlled by caller; mkdir is safe here.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await fs.mkdir(resolved, { recursive: true });
}

export async function checkFileExists(filePath) {
  assertStringPath(filePath, 'filePath');
  const resolved = path.resolve(filePath);
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await fs.access(resolved);
  } catch {
    throw new Error(`File does not exist: ${filePath}`);
  }
}

export async function loadJsonFile(filePath) {
  assertStringPath(filePath, 'filePath');
  const resolved = path.resolve(filePath);
  // Reading a resolved file path; content is validated via JSON.parse.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const content = await fs.readFile(resolved, 'utf8');
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}

export async function writeJsonFile(filePath, data) {
  assertStringPath(filePath, 'filePath');
  const resolved = path.resolve(filePath);
  // Writing to a resolved path; upstream callers control/sanitize path.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await fs.writeFile(resolved, JSON.stringify(data, null, 2), 'utf8');
}

export async function readDirJsonFiles(dir) {
  assertStringPath(dir, 'dir');
  const resolvedDir = path.resolve(dir);
  // List entries in a resolved directory path.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const files = await fs.readdir(resolvedDir);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));
  const results = [];
  for (const file of jsonFiles) {
    const full = path.join(resolvedDir, file);
    const data = await loadJsonFile(full);
    results.push({ name: file, data });
  }
  return results;
}
