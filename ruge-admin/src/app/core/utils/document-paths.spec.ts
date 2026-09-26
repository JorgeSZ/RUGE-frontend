import { describe, expect, it } from 'vitest';
import { preserveDocumentPaths } from './document-paths';

describe('preserveDocumentPaths', () => {
  it('keeps the existing comprobante path when the edit form does not send one', () => {
    const payload = { firstName: 'Ana', email: 'ana@example.com' };
    const existing = { firstName: 'Ana', email: 'ana@example.com', comprobantePagoPath: 'uploads/participant-1/comprobante.png' };

    expect(preserveDocumentPaths(payload, existing)).toEqual({
      firstName: 'Ana',
      email: 'ana@example.com',
      comprobantePagoPath: 'uploads/participant-1/comprobante.png',
    });
  });

  it('keeps an explicit empty string as a real value if the backend intentionally clears it', () => {
    const payload = { firstName: 'Ana', comprobantePagoPath: '' };
    const existing = { firstName: 'Ana', comprobantePagoPath: 'uploads/old.png' };

    expect(preserveDocumentPaths(payload, existing)).toEqual({
      firstName: 'Ana',
      comprobantePagoPath: '',
    });
  });
});
