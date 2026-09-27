const nonMoviePatterns = [
  /^charla\b/i,
  /^cl[ií]nica\b/i,
  /^conversatorio\b/i,
  /^encuentro\b/i,
  /^panel(?:es)?\b/i,
  /^premiaci[oó]n\b/i,
  /^seminario\b/i,
  /^taller\b/i,
  /^funci[oó]n\s+de\s+(?:apertura|clausura)\b/i,
  /^visionado\b/i,
  /^animaci[oó]n\s+chilena\s+hoy$/i,
  /experiencia\s+vr/i,
  /m[uú]sica\s+en\s+vivo/i,
];

export function cleanText(value: string): string {
  return value
    .replace(/&(amp|quot|apos|lt|gt|nbsp);/gi, (entity, name: string) => {
      const values: Readonly<Record<string, string>> = {
        amp: '&',
        quot: '"',
        apos: "'",
        lt: '<',
        gt: '>',
        nbsp: ' ',
      };
      return values[name.toLowerCase()] ?? entity;
    })
    .replace(/&#(\d+);/g, (_entity, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_entity, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
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
  return cleanText(title)
    .slice(0, 180)
    .replace(/^[\s|/:–—-]+|[\s|/:–—-]+$/g, '');
}
