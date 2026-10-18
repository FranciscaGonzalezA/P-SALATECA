import { z } from 'zod';
export declare const catalogFiltersSchema: z.ZodObject<
  {
    fecha: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    horario: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    sala: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    genero: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    buscar: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    orden: z.ZodOptional<
      z.ZodEnum<{
        proximas: 'proximas';
        destacados: 'destacados';
        alfabetico_asc: 'alfabetico_asc';
        alfabetico_desc: 'alfabetico_desc';
      }>
    >;
    pagina: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limite: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
  },
  z.core.$strip
>;
export declare const movieIdSchema: z.ZodCoercedNumber<unknown>;
