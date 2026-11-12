export interface PersonNameFields {
  firstName: string;
  firstLastName: string;
  secondLastName?: string | null;
}

const spanishNameCollator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

export function comparePersonNames<T extends PersonNameFields>(a: T, b: T): number {
  return spanishNameCollator.compare(a.firstName ?? '', b.firstName ?? '')
    || spanishNameCollator.compare(a.firstLastName ?? '', b.firstLastName ?? '')
    || spanishNameCollator.compare(a.secondLastName ?? '', b.secondLastName ?? '');
}

export function compareFullNames(a: string, b: string): number {
  return spanishNameCollator.compare(a, b);
}
