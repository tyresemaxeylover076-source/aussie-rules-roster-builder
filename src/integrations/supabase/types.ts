export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      brownlow_votes: {
        Row: {
          created_at: string | null
          format: string
          id: string
          match_id: string
          player_id: string
          team_id: string
          user_id: string
          votes: number
        }
        Insert: {
          created_at?: string | null
          format: string
          id?: string
          match_id: string
          player_id: string
          team_id: string
          user_id: string
          votes: number
        }
        Update: {
          created_at?: string | null
          format?: string
          id?: string
          match_id?: string
          player_id?: string
          team_id?: string
          user_id?: string
          votes?: number
        }
        Relationships: []
      }
      coaches_votes: {
        Row: {
          created_at: string | null
          id: string
          match_id: string
          player_id: string
          team_id: string
          user_id: string
          votes: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_id: string
          player_id: string
          team_id: string
          user_id: string
          votes: number
        }
        Update: {
          created_at?: string | null
          id?: string
          match_id?: string
          player_id?: string
          team_id?: string
          user_id?: string
          votes?: number
        }
        Relationships: []
      }
      contract_offers: {
        Row: {
          contract_length: number
          created_at: string | null
          id: string
          player_id: number
          salary: number | null
          season_id: string
          status: string | null
          team_id: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contract_length: number
          created_at?: string | null
          id?: string
          player_id: number
          salary?: number | null
          season_id: string
          status?: string | null
          team_id: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contract_length?: number
          created_at?: string | null
          id?: string
          player_id?: number
          salary?: number | null
          season_id?: string
          status?: string | null
          team_id?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_offers_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          contract_length: number
          created_at: string | null
          end_date: string | null
          id: string
          player_id: number
          salary: number | null
          season_id: string
          start_date: string | null
          status: string | null
          team_id: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contract_length?: number
          created_at?: string | null
          end_date?: string | null
          id?: string
          player_id: number
          salary?: number | null
          season_id: string
          start_date?: string | null
          status?: string | null
          team_id?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contract_length?: number
          created_at?: string | null
          end_date?: string | null
          id?: string
          player_id?: number
          salary?: number | null
          season_id?: string
          start_date?: string | null
          status?: string | null
          team_id?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          league_data: Json
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          league_data: Json
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          league_data?: Json
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      match_lineups: {
        Row: {
          created_at: string | null
          id: string
          is_starting: boolean | null
          match_id: string
          player_id: string
          position: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_starting?: boolean | null
          match_id: string
          player_id: string
          position: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_starting?: boolean | null
          match_id?: string
          player_id?: string
          position?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_lineups_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_lineups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_lineups_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_stats: {
        Row: {
          behinds: number | null
          created_at: string | null
          disposals: number | null
          fantasy_score: number | null
          goals: number | null
          hitouts: number | null
          id: string
          impact_score: number | null
          intercepts: number | null
          marks: number | null
          match_id: string
          player_id: string
          tackles: number | null
          team_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          behinds?: number | null
          created_at?: string | null
          disposals?: number | null
          fantasy_score?: number | null
          goals?: number | null
          hitouts?: number | null
          id?: string
          impact_score?: number | null
          intercepts?: number | null
          marks?: number | null
          match_id: string
          player_id: string
          tackles?: number | null
          team_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          behinds?: number | null
          created_at?: string | null
          disposals?: number | null
          fantasy_score?: number | null
          goals?: number | null
          hitouts?: number | null
          id?: string
          impact_score?: number | null
          intercepts?: number | null
          marks?: number | null
          match_id?: string
          player_id?: string
          tackles?: number | null
          team_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_score: number | null
          away_team_id: string
          created_at: string | null
          home_score: number | null
          home_team_id: string
          id: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          away_score?: number | null
          away_team_id: string
          created_at?: string | null
          home_score?: number | null
          home_team_id: string
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          away_score?: number | null
          away_team_id?: string
          created_at?: string | null
          home_score?: number | null
          home_team_id?: string
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string | null
          favorite_position: string
          id: string
          name: string
          overall_rating: number
          team_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          favorite_position: string
          id?: string
          name: string
          overall_rating: number
          team_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          favorite_position?: string
          id?: string
          name?: string
          overall_rating?: number
          team_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      season_matches: {
        Row: {
          created_at: string | null
          id: string
          match_data: Json
          season_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_data: Json
          season_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          match_data?: Json
          season_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      season_stats: {
        Row: {
          created_at: string | null
          id: string
          season_id: string
          stats_data: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          season_id: string
          stats_data: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          season_id?: string
          stats_data?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_stats_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          name: string
          start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          team_overall: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          team_overall?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          team_overall?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trade_players: {
        Row: {
          created_at: string | null
          from_team_id: number
          id: string
          player_id: number
          to_team_id: number
          trade_id: string
        }
        Insert: {
          created_at?: string | null
          from_team_id: number
          id?: string
          player_id: number
          to_team_id: number
          trade_id: string
        }
        Update: {
          created_at?: string | null
          from_team_id?: number
          id?: string
          player_id?: number
          to_team_id?: number
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_players_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          season_id: string
          status: string | null
          trade_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          season_id: string
          status?: string | null
          trade_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          season_id?: string
          status?: string | null
          trade_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
