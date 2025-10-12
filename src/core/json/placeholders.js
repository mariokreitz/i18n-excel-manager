export function extractPlaceholders(text) {
  const placeholders = new Set();
  if (typeof text !== 'string') return placeholders;
  const regex = /{{?\s*([^{}]+?)\s*}}?/g;
  let match;
  while ((match = regex.exec(text))) {
    placeholders.add(match[1].trim());
  }
  return placeholders;
}
