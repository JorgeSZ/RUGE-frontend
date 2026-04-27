export interface Event {
  id: string;
  name: string;
  location?: string;
  startDate: string;
  endDate: string;
  trackId?: string;
  trackName?: string;
  isActive?: boolean;
}
