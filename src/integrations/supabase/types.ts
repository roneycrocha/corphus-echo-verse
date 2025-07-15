export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          credits_balance: number | null
          email: string
          id: string
          subscription_plan:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          subscription_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_balance?: number | null
          email: string
          id?: string
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          subscription_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_balance?: number | null
          email?: string
          id?: string
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          subscription_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      body_traits: {
        Row: {
          codigo: string
          color: string | null
          created_at: string
          descricao: string | null
          id: string
          nome_simbolico: string
          updated_at: string
        }
        Insert: {
          codigo: string
          color?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome_simbolico: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          color?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome_simbolico?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_booking_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          patient_id: string | null
          token: string
          used: boolean | null
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          patient_id?: string | null
          token: string
          used?: boolean | null
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          patient_id?: string | null
          token?: string
          used?: boolean | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_booking_tokens_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_registration_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          patient_data: Json | null
          token: string
          updated_at: string | null
          used: boolean | null
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          patient_data?: Json | null
          token: string
          updated_at?: string | null
          used?: boolean | null
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          patient_data?: Json | null
          token?: string
          updated_at?: string | null
          used?: boolean | null
          used_at?: string | null
        }
        Relationships: []
      }
      patients: {
        Row: {
          account_id: string | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          created_by: string | null
          document: string | null
          document_type: string | null
          email: string
          full_name: string
          gender: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          document_type?: string | null
          email: string
          full_name: string
          gender?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          document_type?: string | null
          email?: string
          full_name?: string
          gender?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_id: string | null
          address: Json | null
          avatar_url: string | null
          created_at: string
          created_by: string | null
          email: string
          facebook: string | null
          full_name: string | null
          id: string
          instagram: string | null
          is_active: boolean | null
          job_title: string | null
          linkedin: string | null
          logo_url: string | null
          phone: string | null
          public_email: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          timezone: string | null
          updated_at: string
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"] | null
          video_call_settings: Json | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          account_id?: string | null
          address?: Json | null
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          facebook?: string | null
          full_name?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          job_title?: string | null
          linkedin?: string | null
          logo_url?: string | null
          phone?: string | null
          public_email?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          timezone?: string | null
          updated_at?: string
          user_id: string
          user_type?: Database["public"]["Enums"]["user_type"] | null
          video_call_settings?: Json | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          account_id?: string | null
          address?: Json | null
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          facebook?: string | null
          full_name?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          job_title?: string | null
          linkedin?: string | null
          logo_url?: string | null
          phone?: string | null
          public_email?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
          user_type?: Database["public"]["Enums"]["user_type"] | null
          video_call_settings?: Json | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_costs: {
        Row: {
          cost_per_usage: number
          created_at: string
          id: string
          is_active: boolean | null
          resource_description: string | null
          resource_name: string
          updated_at: string
        }
        Insert: {
          cost_per_usage: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          resource_description?: string | null
          resource_name: string
          updated_at?: string
        }
        Update: {
          cost_per_usage?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          resource_description?: string | null
          resource_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          account_id: string | null
          created_at: string
          id: string
          notes: string | null
          patient_id: string | null
          scheduled_at: string
          status: string | null
          therapist_id: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          scheduled_at: string
          status?: string | null
          therapist_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          scheduled_at?: string
          status?: string | null
          therapist_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          annual_credits: number | null
          annual_price: number | null
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          monthly_credits: number | null
          monthly_price: number | null
          name: string
          updated_at: string
        }
        Insert: {
          annual_credits?: number | null
          annual_price?: number | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          monthly_credits?: number | null
          monthly_price?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          annual_credits?: number | null
          annual_price?: number | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          monthly_credits?: number | null
          monthly_price?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          account_id: string | null
          action_plan_prompt: string | null
          body_analysis_prompt: string | null
          conversation_analysis_prompt: string | null
          created_at: string
          follow_up_prompt: string | null
          id: string
          therapeutic_plan_prompt: string | null
          therapy_conclusion_prompt: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          action_plan_prompt?: string | null
          body_analysis_prompt?: string | null
          conversation_analysis_prompt?: string | null
          created_at?: string
          follow_up_prompt?: string | null
          id?: string
          therapeutic_plan_prompt?: string | null
          therapy_conclusion_prompt?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          action_plan_prompt?: string | null
          body_analysis_prompt?: string | null
          conversation_analysis_prompt?: string | null
          created_at?: string
          follow_up_prompt?: string | null
          id?: string
          therapeutic_plan_prompt?: string | null
          therapy_conclusion_prompt?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      therapeutic_actions: {
        Row: {
          account_id: string | null
          created_at: string
          description: string | null
          duration: string | null
          frequency: string | null
          id: string
          status: string | null
          title: string
          treatment_plan_id: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          status?: string | null
          title: string
          treatment_plan_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          status?: string | null
          title?: string
          treatment_plan_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapeutic_actions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapeutic_actions_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      transcriptions: {
        Row: {
          account_id: string | null
          content: string
          created_at: string
          id: string
          session_id: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          content: string
          created_at?: string
          id?: string
          session_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          content?: string
          created_at?: string
          id?: string
          session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcriptions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          account_id: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          patient_id: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          patient_id?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          patient_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_account_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      credit_transaction_type: "purchase" | "consumption" | "bonus" | "refund"
      subscription_plan: "bronze" | "silver" | "gold" | "platinum"
      user_role: "admin" | "specialist" | "assistant"
      user_type: "therapist" | "patient"
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
      credit_transaction_type: ["purchase", "consumption", "bonus", "refund"],
      subscription_plan: ["bronze", "silver", "gold", "platinum"],
      user_role: ["admin", "specialist", "assistant"],
      user_type: ["therapist", "patient"],
    },
  },
} as const
