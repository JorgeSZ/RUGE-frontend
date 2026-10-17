import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { TribeChallengeOverview } from '../models/tribe-challenge.model';

@Injectable({ providedIn: 'root' })
export class TribeChallengeService {
  constructor(private api: ApiService) {}

  getOverview(eventId: string): Observable<TribeChallengeOverview> {
    return this.api.get<TribeChallengeOverview>(`/events/${eventId}/tribe-challenges`);
  }
}
