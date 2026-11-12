import { Participant } from './participant.model';

export interface ConsolidationParticipant extends Participant {
  eventName: string;
  eventStartDate: string;
  eventIsArchived: boolean;
}

export interface ConsolidationParticipantResponse {
  participant: Participant;
  eventName: string;
  eventStartDate: string;
  eventIsArchived: boolean;
}
