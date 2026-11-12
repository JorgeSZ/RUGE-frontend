export interface Teaching {
  id: string;
  name: string;
  objectives: string;
  generalMessage: string;
  pdfFileName: string | null;
  hasPdf: boolean;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeachingSaveRequest {
  name: string;
  objectives: string;
  generalMessage: string;
  pdfFile: File | null;
  isActive: boolean;
}

export interface TeachingServerOption {
  id: string;
  name: string;
  email: string | null;
}

export interface TeachingAssignment {
  id: string;
  globalTeachingId: string;
  teachingNameSnapshot: string;
  teachingVersion: number;
  serverId: string;
  serverName: string;
  serverEmail: string | null;
  isCurrent: boolean;
  assignedAt: string;
}

export interface EventTeaching extends Pick<Teaching, 'id' | 'name' | 'objectives' | 'generalMessage' | 'version' | 'isActive' | 'hasPdf'> {
  currentAssignment: TeachingAssignment | null;
  assignmentHistory: TeachingAssignment[];
}

export interface EventTeachingsResponse {
  eventId: string;
  eventName: string;
  isArchived: boolean;
  teachings: EventTeaching[];
  servers: TeachingServerOption[];
}
