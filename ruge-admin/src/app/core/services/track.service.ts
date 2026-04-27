import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Track, CreateTrackRequest, CreateSegmentRequest } from '../models/track.model';

@Injectable({ providedIn: 'root' })
export class TrackService {
  constructor(private api: ApiService) {}

  getAll(): Observable<Track[]> {
    return this.api.get<Track[]>('/tracks');
  }

  getById(id: string): Observable<Track> {
    return this.api.get<Track>(`/tracks/${id}`);
  }

  create(data: CreateTrackRequest): Observable<Track> {
    return this.api.post<Track>('/tracks', data);
  }

  update(id: string, data: CreateTrackRequest): Observable<Track> {
    return this.api.put<Track>(`/tracks/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/tracks/${id}`);
  }

  addSegment(trackId: string, data: CreateSegmentRequest): Observable<Track> {
    return this.api.post<Track>(`/tracks/${trackId}/segments`, data);
  }

  updateSegment(trackId: string, segmentId: string, data: CreateSegmentRequest): Observable<Track> {
    return this.api.put<Track>(`/tracks/${trackId}/segments/${segmentId}`, data);
  }

  deleteSegment(trackId: string, segmentId: string): Observable<void> {
    return this.api.delete<void>(`/tracks/${trackId}/segments/${segmentId}`);
  }

  reorderSegments(trackId: string, orderedIds: string[]): Observable<void> {
    return this.api.put<void>(`/tracks/${trackId}/segments/reorder`, orderedIds);
  }
}
