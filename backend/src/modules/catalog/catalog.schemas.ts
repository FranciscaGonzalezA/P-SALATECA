import { z } from 'zod';

function emptyToUndefined(value: unknown): unknown {
  return value === '' ? undefined : value;
}

const optionalText = (schema: z.ZodString) => z.preprocess(emptyToUndefined, schema.optional());

function isValidDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    return false;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

export const catalogFiltersSchema = z.object({
  fecha: optionalText(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(isValidDate),
  ),
  horario: optionalText(
    z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .refine((value) => {
        const [hour, minute] = value.split(':').map(Number);
        return hour !== undefined && minute !== undefined && hour <= 23 && minute <= 59;
      }),
  ),
  sala: optionalText(z.string().trim().min(1).max(180)),
  genero: optionalText(z.string().trim().min(1).max(80)),
  buscar: optionalText(z.string().trim().min(1).max(120)),
  orden: z.enum(['proximas', 'destacados']).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(50).default(12),
});

export const movieIdSchema = z.coerce.number().int().positive();
