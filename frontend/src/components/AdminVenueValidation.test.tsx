import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AdminVenueValidation } from './AdminVenueValidation';

const venue = {
  id: 4,
  name: 'Cine pendiente',
  slug: 'cine-pendiente',
  address: 'Calle 10',
  municipality: 'Santiago',
  websiteUrl: 'https://example.com',
  regionCode: null as null,
  screeningCount: 6,
  upcomingScreeningCount: 2,
};

describe('AdminVenueValidation', () => {
  it('permite elegir y confirmar manualmente la región', async () => {
    const loader = vi.fn().mockResolvedValue([venue]);
    const validator = vi.fn().mockResolvedValue({ id: venue.id, regionCode: 'CL-VS' });
    render(<AdminVenueValidation loader={loader} validator={validator} />);

    expect(await screen.findByText(venue.name)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText(`Región para ${venue.name}`), 'CL-VS');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar región' }));

    expect(validator).toHaveBeenCalledWith(venue.id, 'CL-VS');
    expect(await screen.findByRole('status')).toHaveTextContent('Valparaíso');
    expect(screen.queryByText(venue.name)).not.toBeInTheDocument();
    expect(screen.getByText('No hay salas pendientes de validación.')).toBeInTheDocument();
  });

  it('muestra los errores sin retirar la sala', async () => {
    const validator = vi.fn().mockRejectedValue(new Error('La sala ya fue validada.'));
    render(
      <AdminVenueValidation loader={vi.fn().mockResolvedValue([venue])} validator={validator} />,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar región' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('ya fue validada');
    await waitFor(() => expect(screen.getByText(venue.name)).toBeInTheDocument());
  });
});
