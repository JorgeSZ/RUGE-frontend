export interface ParticipantSummary {
  id: string;
  fullName: string;
  cedula?: string;
  church?: string;
}

export interface Tribe {
  id: string;
  eventId: string;
  name: string;
  color?: string;
  participantCount: number;
  participants: ParticipantSummary[];
}

export interface CreateTribeRequest {
  eventId: string;
  name: string;
  color?: string;
}

export interface AutoGenerateRequest {
  senderistasPerTribe: number;
}

export interface TribeSummary {
  name: string;
  participantCount: number;
}

export interface AutoGenerateResponse {
  tribesCreated: number;
  tribes: TribeSummary[];
}
