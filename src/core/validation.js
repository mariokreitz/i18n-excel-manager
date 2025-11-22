/**
 * Shared lightweight validation helpers to promote DRY & KISS.
 * Keep functions tiny and predictable; throw errors with clear messages.
 */

export function assertNonEmptyString(value, label = 'value') {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

export function assertStringPath(p, label = 'path') {
  if (typeof p !== 'string' || p.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return p;
}
