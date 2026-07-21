export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          handle: string;
          full_name: string;
          avatar_initials: string;
          primary_currency: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          handle: string;
          full_name?: string;
          avatar_initials?: string;
          primary_currency?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          currency: string;
          balance: number;
          account_number: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          currency: string;
          balance?: number;
          account_number: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["wallets"]["Insert"]>;
        Relationships: [];
      };
      ledger_entries: {
        Row: {
          id: string;
          user_id: string;
          counterparty_id: string | null;
          wallet_id: string | null;
          transfer_id: string | null;
          type: string;
          status: string;
          amount: number;
          currency: string;
          title: string;
          subtitle: string;
          meta: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          counterparty_id?: string | null;
          wallet_id?: string | null;
          transfer_id?: string | null;
          type: string;
          status?: string;
          amount: number;
          currency: string;
          title: string;
          subtitle?: string;
          meta?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ledger_entries"]["Insert"]>;
        Relationships: [];
      };
      transfers: {
        Row: {
          id: string;
          from_user_id: string;
          to_user_id: string;
          currency: string;
          amount: number;
          note: string;
          reference: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_user_id: string;
          to_user_id: string;
          currency: string;
          amount: number;
          note?: string;
          reference: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transfers"]["Insert"]>;
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          owner_id: string;
          contact_user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          contact_user_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contacts"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "contacts_contact_user_id_fkey";
            columns: ["contact_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      cards: {
        Row: {
          id: string;
          user_id: string;
          wallet_id: string;
          cardholder_name: string;
          last4: string;
          full_number: string;
          expiry: string;
          cvv: string;
          network: string;
          status: string;
          spend_limit_daily: number;
          spend_limit_monthly: number;
          spent_today: number;
          spent_month: number;
          online_payments: boolean;
          contactless: boolean;
          foreign_transactions: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          wallet_id: string;
          cardholder_name: string;
          last4: string;
          full_number: string;
          expiry: string;
          cvv: string;
          network?: string;
          status?: string;
          spend_limit_daily?: number;
          spend_limit_monthly?: number;
          spent_today?: number;
          spent_month?: number;
          online_payments?: boolean;
          contactless?: boolean;
          foreign_transactions?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cards"]["Insert"]>;
        Relationships: [];
      };
      crypto_holdings: {
        Row: {
          id: string;
          user_id: string;
          asset: string;
          quantity: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          asset: string;
          quantity?: number;
        };
        Update: Partial<Database["public"]["Tables"]["crypto_holdings"]["Insert"]>;
        Relationships: [];
      };
      crypto_trades: {
        Row: {
          id: string;
          user_id: string;
          asset: string;
          side: string;
          quantity: number;
          price_usd: number;
          fiat_amount: number;
          fiat_currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          asset: string;
          side: string;
          quantity: number;
          price_usd: number;
          fiat_amount: number;
          fiat_currency?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["crypto_trades"]["Insert"]>;
        Relationships: [];
      };
      fx_rates: {
        Row: {
          currency: string;
          rate_to_usd: number;
          updated_at: string;
        };
        Insert: {
          currency: string;
          rate_to_usd: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["fx_rates"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      topup_wallet: {
        Args: { p_currency: string; p_amount: number };
        Returns: Database["public"]["Tables"]["wallets"]["Row"];
      };
      convert_fiat: {
        Args: { p_from: string; p_to: string; p_amount: number };
        Returns: Json;
      };
      transfer_p2p: {
        Args: {
          p_to_handle: string;
          p_currency: string;
          p_amount: number;
          p_note?: string;
        };
        Returns: Database["public"]["Tables"]["transfers"]["Row"];
      };
      create_virtual_card: {
        Args: {
          p_wallet_id: string;
          p_daily_limit?: number;
          p_monthly_limit?: number;
        };
        Returns: Database["public"]["Tables"]["cards"]["Row"];
      };
      set_card_status: {
        Args: { p_card_id: string; p_status: string };
        Returns: Database["public"]["Tables"]["cards"]["Row"];
      };
      update_card_limits: {
        Args: { p_card_id: string; p_daily: number; p_monthly: number };
        Returns: Database["public"]["Tables"]["cards"]["Row"];
      };
      simulate_card_spend: {
        Args: { p_card_id: string; p_amount: number; p_merchant?: string };
        Returns: Database["public"]["Tables"]["ledger_entries"]["Row"];
      };
      crypto_buy: {
        Args: {
          p_asset: string;
          p_fiat_amount: number;
          p_quote_price: number;
          p_quoted_at: string;
        };
        Returns: Json;
      };
      crypto_sell: {
        Args: {
          p_asset: string;
          p_quantity: number;
          p_quote_price: number;
          p_quoted_at: string;
        };
        Returns: Json;
      };
      search_profiles: {
        Args: { p_query: string };
        Returns: {
          id: string;
          handle: string;
          full_name: string;
          avatar_initials: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Wallet = Database["public"]["Tables"]["wallets"]["Row"];
export type LedgerEntry = Database["public"]["Tables"]["ledger_entries"]["Row"];
export type CardRow = Database["public"]["Tables"]["cards"]["Row"];
export type CryptoHolding = Database["public"]["Tables"]["crypto_holdings"]["Row"];
export type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
