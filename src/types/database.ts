// Hand-written to match supabase/migrations/0001_init.sql. Regenerate with
// `npx supabase gen types typescript --linked` once the project is linked
// via the Supabase CLI, and this file can be replaced with the generated one.

export type ManagerRole = "manager" | "commissioner";
export type SeasonStatus = "active" | "closed";
export type DraftSource = "auction" | "waiver" | "keeper";
export type TradeStatus =
  | "pending_cash"
  | "pending_approval"
  | "approved"
  | "rejected";
export type KeeperPriceRule =
  | "standard_plus_3"
  | "waiver_first_year"
  | "drafted_and_dropped";
export type KeeperStatus = "submitted" | "approved" | "rejected";
export type LedgerReason = "trade" | "keeper" | "starting_budget" | "other";

export interface Database {
  public: {
    Tables: {
      managers: {
        Row: {
          id: string;
          sleeper_user_id: string;
          sleeper_roster_id: number;
          display_name: string;
          email: string;
          role: ManagerRole;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["managers"]["Row"]> & {
          sleeper_user_id: string;
          sleeper_roster_id: number;
          display_name: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["managers"]["Row"]>;
        Relationships: [];
      };
      seasons: {
        Row: {
          id: string;
          year: number;
          starting_budget: number;
          status: SeasonStatus;
          keeper_deadline: string | null;
          draft_datetime: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["seasons"]["Row"]> & {
          year: number;
        };
        Update: Partial<Database["public"]["Tables"]["seasons"]["Row"]>;
        Relationships: [];
      };
      players: {
        Row: {
          player_id: string;
          full_name: string;
          position: string | null;
          team: string | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["players"]["Row"]> & {
          player_id: string;
          full_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["players"]["Row"]>;
        Relationships: [];
      };
      trash_talk_posts: {
        Row: {
          id: string;
          manager_id: string;
          body: string | null;
          image_path: string | null;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["trash_talk_posts"]["Row"]
        > & {
          manager_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["trash_talk_posts"]["Row"]>;
        Relationships: [];
      };
      draft_records: {
        Row: {
          id: string;
          season_id: string;
          manager_id: string;
          player_id: string;
          player_name: string;
          price: number;
          source: DraftSource;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["draft_records"]["Row"]
        > & {
          season_id: string;
          manager_id: string;
          player_id: string;
          player_name: string;
          price: number;
          source: DraftSource;
        };
        Update: Partial<Database["public"]["Tables"]["draft_records"]["Row"]>;
        Relationships: [];
      };
      trades: {
        Row: {
          id: string;
          sleeper_transaction_id: string | null;
          season_id: string;
          status: TradeStatus;
          rejection_reason: string | null;
          created_at: string;
          approved_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["trades"]["Row"]> & {
          season_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["trades"]["Row"]>;
        Relationships: [];
      };
      trade_sides: {
        Row: {
          id: string;
          trade_id: string;
          manager_id: string;
          players_received: string[];
          cash_amount: number | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["trade_sides"]["Row"]> & {
          trade_id: string;
          manager_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["trade_sides"]["Row"]>;
        Relationships: [];
      };
      keepers: {
        Row: {
          id: string;
          season_id: string;
          manager_id: string;
          player_id: string;
          player_name: string;
          previous_price: number | null;
          new_price: number;
          price_rule: KeeperPriceRule;
          status: KeeperStatus;
          rejection_reason: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["keepers"]["Row"]> & {
          season_id: string;
          manager_id: string;
          player_id: string;
          player_name: string;
          new_price: number;
          price_rule: KeeperPriceRule;
        };
        Update: Partial<Database["public"]["Tables"]["keepers"]["Row"]>;
        Relationships: [];
      };
      budget_ledger: {
        Row: {
          id: string;
          season_id: string;
          manager_id: string;
          amount: number;
          reason: LedgerReason;
          source_id: string | null;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["budget_ledger"]["Row"]
        > & {
          season_id: string;
          manager_id: string;
          amount: number;
          reason: LedgerReason;
        };
        Update: Partial<Database["public"]["Tables"]["budget_ledger"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
