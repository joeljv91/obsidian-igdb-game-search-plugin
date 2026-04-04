export interface RAUserCompletionProgressResponse {
  Count: number;
  Total: number;
  Results: RAUserCompletionProgressEntry[];
}

export interface RAUserCompletionProgressEntry {
  GameID: number;
  Title: string;
  ImageIcon?: string;
  ConsoleID?: number;
  ConsoleName?: string;
  MaxPossible?: number;
  NumAwarded?: number;
  NumAwardedHardcore?: number;
  MostRecentAwardedDate?: string | null;
  HighestAwardKind?: string | null;
  HighestAwardDate?: string | null;
}

export interface RAGameInfoAndUserProgressResponse {
  ID: number;
  UserCompletionHardcore?: string | null;
  HighestAwardKind?: string | null;
  HighestAwardDate?: string | null;
}

export interface RASyncGame {
  id: number;
  title: string;
  userCompletionHardcore: string | null;
  highestAwardKind: string | null;
  highestAwardDate: string | null;
  mostRecentAwardedDate: string | null;
}
