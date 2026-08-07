export type ScreeningTitleClassification =
  { kind: 'movie'; title: string } | { kind: 'activity'; title: string };

function cleanTitle(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function comparableTitle(value: string): string {
  return cleanTitle(value)
    .normalize('NFD')
    .replace(/\p{Mark}/gu, '')
    .normalize('NFC')
    .toLocaleLowerCase('es-CL')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const activityPatterns = [
  /^(?:sin funcion|funcion sorpresa)$/u,
  /^(?:panel(?:es)? tematicos?|charla|clinica|premiacion|visionado|experiencia vr|showcase)\b/u,
  /^(?:animacion chilena hoy|especial pedro chaskel|inventada podcast)$/u,
  /\bjornadas sobre cine\b/u,
];

function isActivity(value: string): boolean {
  const comparable = comparableTitle(value);
  return activityPatterns.some((pattern) => pattern.test(comparable));
}

export function classifyScreeningTitle(value: string): ScreeningTitleClassification {
  let title = cleanTitle(value);
  if (!title) return { kind: 'movie', title };
  if (isActivity(title)) return { kind: 'activity', title };

  const doubleSlashParts = title.split(/\s*\/\/\s*/u).filter(Boolean);
  if (doubleSlashParts.length > 1) title = doubleSlashParts.at(-1) ?? title;

  title = title.replace(/^cine inclusivo\s*:\s*/iu, '');
  title = title.replace(/\s*\+\s*cineforo\b.*$/iu, '');
  title = title.replace(
    /\s*[([]\s*(?:doblada(?: al espa[nñ]ol)?|subtitulada|versi[oó]n extendida|corte del director|reestreno|restaurada|remasterizada|[234]d|4k)\s*[)\]]\s*$/iu,
    '',
  );
  title = cleanTitle(title);

  if (!title || isActivity(title) || /\s+\+\s+/u.test(title)) {
    return { kind: 'activity', title: cleanTitle(value) };
  }
  return { kind: 'movie', title };
}
