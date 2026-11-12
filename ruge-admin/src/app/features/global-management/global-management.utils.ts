export function searchText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
}

export function initials(value: string): string {
  return value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toLocaleUpperCase('es');
}
