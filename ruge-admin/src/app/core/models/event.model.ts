export interface Event {
  id: string;
  name: string;
  location?: string;
  startDate: string;
  endDate: string;
  trackId?: string;
  trackName?: string;
  isActive?: boolean;
  participantRegistrationEnabled?: boolean;
  serverRegistrationEnabled?: boolean;
}

export interface PublicRegistrationStatus {
  participantRegistrationEnabled: boolean;
  serverRegistrationEnabled: boolean;
}
