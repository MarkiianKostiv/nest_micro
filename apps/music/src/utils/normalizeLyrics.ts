export function normalizeLyrics(raw: string): string {
  return raw
    .replace(/^\d+\s+Contributors.*?\n+/is, '')
    .replace(/Read More.*?\n+/gi, '')
    .replace(/\(.*?(French|Deutsch|Español|中文).*?\)/gi, '')
    .replace(/\[.*?가사\]/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
