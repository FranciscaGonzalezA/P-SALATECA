import { z } from 'zod';

export const postIdSchema = z.coerce.number().int().positive();
