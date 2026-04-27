export interface Commission {
  id: string;
  name: string;
  description?: string;
  serverCount?: number;
  createdAt?: string;
}

export interface CreateCommissionRequest {
  name: string;
  description?: string;
}
