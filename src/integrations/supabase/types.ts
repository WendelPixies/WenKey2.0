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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      checkin_results: {
        Row: {
          checkin_id: string
          company_id: string
          created_at: string
          id: string
          key_result_id: string
          meta_checkin: number | null
          minimo_orcamento: number | null
          note: string | null
          percentual_atingido: number | null
          updated_at: string
          user_id: string
          valor_realizado: number | null
        }
        Insert: {
          checkin_id: string
          company_id: string
          created_at?: string
          id?: string
          key_result_id: string
          meta_checkin?: number | null
          minimo_orcamento?: number | null
          note?: string | null
          percentual_atingido?: number | null
          updated_at?: string
          user_id: string
          valor_realizado?: number | null
        }
        Update: {
          checkin_id?: string
          company_id?: string
          created_at?: string
          id?: string
          key_result_id?: string
          meta_checkin?: number | null
          minimo_orcamento?: number | null
          note?: string | null
          percentual_atingido?: number | null
          updated_at?: string
          user_id?: string
          valor_realizado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checkin_results_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_results_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_results_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "key_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          checkin_date: string
          checkin_dates: string | null
          company_id: string | null
          created_at: string
          id: string
          key_result_id: string | null
          note: string | null
          occurred_at: string | null
          quarter_id: string
          result_percent: number | null
          user_id: string | null
          value: number | null
        }
        Insert: {
          checkin_date: string
          checkin_dates?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          key_result_id?: string | null
          note?: string | null
          occurred_at?: string | null
          quarter_id: string
          result_percent?: number | null
          user_id?: string | null
          value?: number | null
        }
        Update: {
          checkin_date?: string
          checkin_dates?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          key_result_id?: string | null
          note?: string | null
          occurred_at?: string | null
          quarter_id?: string
          result_percent?: number | null
          user_id?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "key_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarter_checkins_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          city: string | null
          cnpj: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          responsible: string | null
          sectors: string[] | null
          state: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          responsible?: string | null
          sectors?: string[] | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          cnpj?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          responsible?: string | null
          sectors?: string[] | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      key_results: {
        Row: {
          baseline: number | null
          code: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          current: number | null
          direction: string | null
          floor_value: number | null
          id: string
          input_method: string | null
          objective_id: string
          percent_kr: number | null
          quarter_id: string | null
          target: number | null
          title: string
          type: string | null
          unit: string | null
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          baseline?: number | null
          code?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          current?: number | null
          direction?: string | null
          floor_value?: number | null
          id?: string
          input_method?: string | null
          objective_id: string
          percent_kr?: number | null
          quarter_id?: string | null
          target?: number | null
          title?: string
          type?: string | null
          unit?: string | null
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          baseline?: number | null
          code?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          current?: number | null
          direction?: string | null
          floor_value?: number | null
          id?: string
          input_method?: string | null
          objective_id?: string
          percent_kr?: number | null
          quarter_id?: string | null
          target?: number | null
          title?: string
          type?: string | null
          unit?: string | null
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "key_results_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_results_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_results_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objective_checkins_view"
            referencedColumns: ["objective_id"]
          },
          {
            foreignKeyName: "key_results_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_results_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      kr_checkins: {
        Row: {
          attainment_pct: number | null
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          input_method: string | null
          key_result_id: string
          note: string | null
          quarter_checkin_id: string
          updated_at: string | null
          value_realized: number
        }
        Insert: {
          attainment_pct?: number | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          input_method?: string | null
          key_result_id: string
          note?: string | null
          quarter_checkin_id: string
          updated_at?: string | null
          value_realized: number
        }
        Update: {
          attainment_pct?: number | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          input_method?: string | null
          key_result_id?: string
          note?: string | null
          quarter_checkin_id?: string
          updated_at?: string | null
          value_realized?: number
        }
        Relationships: [
          {
            foreignKeyName: "kr_checkins_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kr_checkins_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "key_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kr_checkins_quarter_checkin_id_fkey"
            columns: ["quarter_checkin_id"]
            isOneToOne: false
            referencedRelation: "objective_checkins_view"
            referencedColumns: ["quarter_checkin_id"]
          },
          {
            foreignKeyName: "kr_checkins_quarter_checkin_id_fkey"
            columns: ["quarter_checkin_id"]
            isOneToOne: false
            referencedRelation: "quarter_checkins"
            referencedColumns: ["id"]
          },
        ]
      }
      objectives: {
        Row: {
          archived: boolean | null
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          parent_objective_id: string | null
          percent_obj: number | null
          quarter_id: string
          status: string | null
          title: string
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          archived?: boolean | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          parent_objective_id?: string | null
          percent_obj?: number | null
          quarter_id: string
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          archived?: boolean | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          parent_objective_id?: string | null
          percent_obj?: number | null
          quarter_id?: string
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "objectives_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_parent_objective_id_fkey"
            columns: ["parent_objective_id"]
            isOneToOne: false
            referencedRelation: "objective_checkins_view"
            referencedColumns: ["objective_id"]
          },
          {
            foreignKeyName: "objectives_parent_objective_id_fkey"
            columns: ["parent_objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objectives_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          position: string | null
          sector: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          position?: string | null
          sector?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          position?: string | null
          sector?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quarter_checkins: {
        Row: {
          checkin_date: string
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          quarter_id: string
          updated_at: string | null
        }
        Insert: {
          checkin_date: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          quarter_id: string
          updated_at?: string | null
        }
        Update: {
          checkin_date?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          quarter_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quarter_checkins_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarter_checkins_quarter_id_fkey1"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      quarter_results: {
        Row: {
          company_id: string
          id: string
          quarter_id: string
          result_percent: number
          saved_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          quarter_id: string
          result_percent?: number
          saved_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          quarter_id?: string
          result_percent?: number
          saved_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quarter_results_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarter_results_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      quarters: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          is_active: boolean
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quarters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quarters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      objective_checkins_view: {
        Row: {
          checkin_date: string | null
          checkin_name: string | null
          objective_attainment_pct: number | null
          objective_id: string | null
          objective_title: string | null
          quarter_checkin_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_kr_attainment: {
        Args: {
          p_baseline: number
          p_direction: string
          p_floor: number
          p_realized: number
          p_target: number
          p_type: string
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_member_check: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_manager_or_admin: { Args: { _user_id: string }; Returns: boolean }
      recalculate_all_percentages: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "manager" | "user"
      metric_type: "percentage" | "quantity" | "currency" | "boolean"
      user_permission: "user" | "manager" | "admin"
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
    Enums: {
      app_role: ["admin", "manager", "user"],
      metric_type: ["percentage", "quantity", "currency", "boolean"],
      user_permission: ["user", "manager", "admin"],
    },
  },
} as const
