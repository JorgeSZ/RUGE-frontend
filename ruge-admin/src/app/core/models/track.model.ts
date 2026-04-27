export interface TrackSegment {
  id: string;
  name: string;
  description?: string;
  order: number;
  estimatedTimeMinutes?: number;
  distanceKm?: number;
  dia?: string;
  scheduledTime?: string;
  predica?: string;
  predicador?: string;
  lugar?: string;
}

export interface Track {
  id: string;
  name: string;
  description?: string;
  distanceKm?: number;
  estimatedTimeMinutes?: number;
  createdAt: string;
  segments: TrackSegment[];
}

export interface CreateTrackRequest {
  name: string;
  description?: string;
  distanceKm?: number;
  estimatedTimeMinutes?: number;
}

export interface CreateSegmentRequest {
  name: string;
  description?: string;
  estimatedTimeMinutes?: number;
  distanceKm?: number;
  dia?: string;
  scheduledTime?: string;
  predica?: string;
  predicador?: string;
  lugar?: string;
}
