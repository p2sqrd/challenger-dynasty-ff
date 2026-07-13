// Narrow types covering only the fields this app actually reads. Sleeper's
// API returns much more than this per endpoint.

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  season_type: string;
  previous_league_id: string | null;
  draft_id: string | null;
  status: string;
  settings: {
    type: number;
    [key: string]: unknown;
  };
}

export interface SleeperUser {
  user_id: string;
  display_name: string;
  metadata?: { team_name?: string };
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string | null;
  league_id: string;
  players: string[] | null;
}

export interface SleeperPlayer {
  player_id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string;
}

export interface SleeperDraft {
  draft_id: string;
  league_id: string;
  season: string;
  status: string;
  type: string;
  settings: {
    budget?: number;
    teams?: number;
    [key: string]: unknown;
  };
}

export interface SleeperDraftPick {
  draft_id: string;
  round: number;
  pick_no: number;
  roster_id: number;
  picked_by: string;
  player_id: string;
  is_keeper: boolean | null;
  metadata: {
    amount?: string;
    first_name?: string;
    last_name?: string;
    position?: string;
    [key: string]: unknown;
  };
}

export interface SleeperTransaction {
  transaction_id: string;
  type: string;
  status: string;
  roster_ids: number[];
  adds: Record<string, number> | null;
  drops: Record<string, number> | null;
  draft_picks: unknown[];
  /** FAAB bid on a waiver claim lives in `settings.waiver_bid`. */
  settings?: { waiver_bid?: number } | null;
  waiver_budget?: { sender: number; receiver: number; amount: number }[];
}
