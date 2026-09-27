import type {
  AdminPendingVenueDto,
  AdminVenueValidationDto,
  ApiResponse,
  ChileRegionCode,
} from '@salateca/contracts';
import { Router } from 'express';
import { z } from 'zod';
import type { AuthService } from '../auth/auth.service.js';
import { createAuthenticate, requireRole, requireTrustedOrigin } from '../auth/auth.http.js';
import { AdminVenuesService } from './adminVenues.service.js';

const venueIdSchema = z.coerce.number().int().positive();
const regionCodeSchema = z.enum([
  'CL-AP',
  'CL-TA',
  'CL-AN',
  'CL-AT',
  'CL-CO',
  'CL-VS',
  'CL-RM',
  'CL-LI',
  'CL-ML',
  'CL-NB',
  'CL-BI',
  'CL-AR',
  'CL-LR',
  'CL-LL',
  'CL-AI',
  'CL-MA',
]);

export function createAdminVenuesRouter(
  authService: AuthService,
  venuesService: AdminVenuesService,
): Router {
  const router = Router();
  router.use('/admin', createAuthenticate(authService), requireRole('admin'));
  router.use('/admin', requireTrustedOrigin);

  router.get('/admin/venues/pending', async (_request, response) => {
    const body: ApiResponse<AdminPendingVenueDto[]> = {
      data: await venuesService.listPendingVenues(),
    };
    response.json(body);
  });

  router.patch('/admin/venues/:id/region', async (request, response) => {
    const venueId = venueIdSchema.safeParse(request.params.id);
    const regionCode = regionCodeSchema.safeParse(request.body?.regionCode);
    if (!venueId.success || !regionCode.success) {
      response.status(400).json({
        error: {
          code: 'invalid_parameters',
          message: 'Selecciona una región válida para la sala.',
        },
      });
      return;
    }

    const venue = await venuesService.validateVenue(
      venueId.data,
      regionCode.data satisfies ChileRegionCode,
    );
    if (!venue) {
      response.status(409).json({
        error: {
          code: 'venue_already_validated',
          message: 'La sala no existe o ya fue validada por otra persona.',
        },
      });
      return;
    }

    const body: ApiResponse<AdminVenueValidationDto> = { data: venue };
    response.json(body);
  });

  return router;
}
