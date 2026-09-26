export function preserveDocumentPaths<T extends Record<string, any>>(
  payload: T,
  existing?: Partial<T> | null,
): T {
  if (!existing || Object.prototype.hasOwnProperty.call(payload, 'comprobantePagoPath')) {
    return payload;
  }

  const existingPath = (existing as any)?.comprobantePagoPath;
  if (existingPath === undefined || existingPath === null) {
    return payload;
  }

  return {
    ...payload,
    comprobantePagoPath: existingPath,
  };
}
