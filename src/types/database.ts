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
export type FireSaleMode = "private" | "public";
export type FireSaleStatus = "active" | "accepted" | "rejected" | "cancelled";

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
          onboarded_at: string | null;
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
      fire_sales: {
        Row: {
          id: string;
          season_id: string;
          seller_id: string;
          player_id: string;
          player_name: string;
          mode: FireSaleMode;
          min_bid: number;
          deadline: string;
          status: FireSaleStatus;
          winner_id: string | null;
          trade_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["fire_sales"]["Row"]> & {
          season_id: string;
          seller_id: string;
          player_id: string;
          player_name: string;
          deadline: string;
        };
        Update: Partial<Database["public"]["Tables"]["fire_sales"]["Row"]>;
        Relationships: [];
      };
      fire_sale_bids: {
        Row: {
          id: string;
          fire_sale_id: string;
          bidder_id: string;
          amount: number;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["fire_sale_bids"]["Row"]
        > & {
          fire_sale_id: string;
          bidder_id: string;
          amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["fire_sale_bids"]["Row"]>;
        Relationships: [];
      };
      fire_sale_presence: {
        Row: {
          fire_sale_id: string;
          manager_id: string;
          last_seen: string;
        };
        Insert: {
          fire_sale_id: string;
          manager_id: string;
          last_seen?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["fire_sale_presence"]["Row"]
        >;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          manager_id: string;
          title: string;
          body: string | null;
          link: string | null;
          created_at: string;
          read_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          manager_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [];
      };
      reminder_log: {
        Row: { key: string; created_at: string };
        Insert: { key: string; created_at?: string };
        Update: Partial<{ key: string; created_at: string }>;
        Relationships: [];
      };
      rule_proposals: {
        Row: {
          id: string;
          season_id: string;
          author_id: string;
          title: string;
          body: string | null;
          override_status: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["rule_proposals"]["Row"]> & {
          season_id: string;
          author_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["rule_proposals"]["Row"]>;
        Relationships: [];
      };
      rule_proposal_votes: {
        Row: {
          proposal_id: string;
          manager_id: string;
          vote: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          proposal_id: string;
          manager_id: string;
          vote: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["rule_proposal_votes"]["Row"]
        >;
        Relationships: [];
      };
      rule_proposal_comments: {
        Row: {
          id: string;
          proposal_id: string;
          manager_id: string;
          body: string;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["rule_proposal_comments"]["Row"]
        > & {
          proposal_id: string;
          manager_id: string;
          body: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["rule_proposal_comments"]["Row"]
        >;
        Relationships: [];
      };
      rule_proposal_comment_reactions: {
        Row: {
          comment_id: string;
          manager_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          comment_id: string;
          manager_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["rule_proposal_comment_reactions"]["Row"]
        >;
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
