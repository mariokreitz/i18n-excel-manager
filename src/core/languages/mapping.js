export function createReverseLanguageMap(languageMap) {
  const reverseMap = {};
  for (const [code, name] of Object.entries(languageMap || {})) {
    reverseMap[name] = code;
  }
  return reverseMap;
}
