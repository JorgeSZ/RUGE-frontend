export interface TribeRankingEntry {
  position: number;
  tribeId: string;
  tribeName: string;
  totalPoints: number;
}

export interface TribeChallengeScore {
  tribeId: string;
  tribeName: string;
  points: number;
}

export interface TribeChallengeEntry {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: string;
  scores: TribeChallengeScore[];
}

export interface TribeChallengeOverview {
  ranking: TribeRankingEntry[];
  challenges: TribeChallengeEntry[];
}
