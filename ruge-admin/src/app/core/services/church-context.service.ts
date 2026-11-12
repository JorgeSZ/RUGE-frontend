import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const CHURCH_ID_KEY = 'ruge_selected_church_id';
const CHURCH_NAME_KEY = 'ruge_selected_church_name';

@Injectable({ providedIn: 'root' })
export class ChurchContextService {
  private readonly selectedChurchSubject = new BehaviorSubject<{ id: string; name: string } | null>(this.restore());
  readonly selectedChurch$ = this.selectedChurchSubject.asObservable();

  get selectedChurch(): { id: string; name: string } | null { return this.selectedChurchSubject.value; }
  get selectedChurchId(): string | null { return this.selectedChurchSubject.value?.id ?? null; }

  select(id: string, name: string): void {
    localStorage.setItem(CHURCH_ID_KEY, id);
    localStorage.setItem(CHURCH_NAME_KEY, name);
    this.selectedChurchSubject.next({ id, name });
  }

  clear(): void {
    localStorage.removeItem(CHURCH_ID_KEY);
    localStorage.removeItem(CHURCH_NAME_KEY);
    this.selectedChurchSubject.next(null);
  }

  private restore(): { id: string; name: string } | null {
    const id = localStorage.getItem(CHURCH_ID_KEY);
    if (!id) return null;
    return { id, name: localStorage.getItem(CHURCH_NAME_KEY) ?? 'Iglesia seleccionada' };
  }
}
