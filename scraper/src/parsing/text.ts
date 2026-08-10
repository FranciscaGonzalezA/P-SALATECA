const nonMoviePatterns = [
  /^charla\b/i,
  /^cl[ií]nica\b/i,
  /^conversatorio\b/i,
  /^encuentro\b/i,
  /^panel(?:es)?\b/i,
  /^premiaci[oó]n\b/i,
  /^seminario\b/i,
  /^taller\b/i,
  /experiencia\s+vr/i,
  /m[uú]sica\s+en\s+vivo/i,
];

export function cleanText(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isNonMovieActivity(value: string): boolean {
  const normalized = cleanText(value);
  return !normalized || nonMoviePatterns.some((pattern) => pattern.test(normalized));
}

export function cleanMovieTitle(value: string): string {
  let title = cleanText(value);
  title = title.replace(/\s*\[[^\]]*(?:doblada|subtitulada|accesibilidad)[^\]]*\]\s*$/i, '');
  title = title.replace(/\s*\+\s*(?:cineforo|foro|conversatorio).*$/i, '');
  title = title.replace(/^cine\s+(?:pekes|peques|inclusivo)\s*:\s*/i, '');
  title = title.replace(/^maestras\s*:\s*/i, '');
  title = title.replace(/^imprescindibles(?::[^/]+)?\s*\/\/\s*/i, '');
  title = title.replace(/^imprescindibles:\s*pesadillas\s+en\s+los\s+80[′']?\s*\/\/\s*/i, '');
  return cleanText(title).slice(0, 180).replace(/^[\s|/:–—-]+|[\s|/:–—-]+$/g, '');
}
