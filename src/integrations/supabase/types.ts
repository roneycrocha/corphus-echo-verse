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
      account_credit_transactions: {
        Row: {
          account_id: string
          amount: number
          balance_after: number
          created_at: string
          description: string
          id: string
          related_action: string | null
          transaction_type: Database["public"]["Enums"]["credit_transaction_type"]
          user_id: string | null
          vindi_charge_id: string | null
        }
        Insert: {
          account_id: string
          amount: number
          balance_after: number
          created_at?: string
          description: string
          id?: string
          related_action?: string | null
          transaction_type: Database["public"]["Enums"]["credit_transaction_type"]
          user_id?: string | null
          vindi_charge_id?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string
          id?: string
          related_action?: string | null
          transaction_type?: Database["public"]["Enums"]["credit_transaction_type"]
          user_id?: string | null
          vindi_charge_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_credit_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_credits: {
        Row: {
          account_id: string
          balance: number
          created_at: string
          id: string
          total_consumed: number
          total_purchased: number
          updated_at: string
        }
        Insert: {
          account_id: string
          balance?: number
          created_at?: string
          id?: string
          total_consumed?: number
          total_purchased?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          balance?: number
          created_at?: string
          id?: string
          total_consumed?: number
          total_purchased?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_credits_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_plan: {
        Row: {
          account_type: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          level: number
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          account_type: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          level?: number
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          level?: number
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_plan_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "account_plan"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          address: Json | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          subscription_plan: string | null
          subscription_status: string | null
          updated_at: string
        }
        Insert: {
          address?: Json | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Update: {
          address?: Json | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      action_executions: {
        Row: {
          account_id: string | null
          action_id: string
          completed: boolean
          created_at: string
          difficulty_level: string | null
          emotional_state: number | null
          evidence_files: string[] | null
          execution_date: string
          id: string
          patient_id: string
          patient_report: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          action_id: string
          completed?: boolean
          created_at?: string
          difficulty_level?: string | null
          emotional_state?: number | null
          evidence_files?: string[] | null
          execution_date?: string
          id?: string
          patient_id: string
          patient_report?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          action_id?: string
          completed?: boolean
          created_at?: string
          difficulty_level?: string | null
          emotional_state?: number | null
          evidence_files?: string[] | null
          execution_date?: string
          id?: string
          patient_id?: string
          patient_report?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_executions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_executions_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "therapeutic_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_executions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      action_messages: {
        Row: {
          action_id: string
          created_at: string
          id: string
          message: string
          sender_id: string
          sender_type: string
        }
        Insert: {
          action_id: string
          created_at?: string
          id?: string
          message: string
          sender_id: string
          sender_type: string
        }
        Update: {
          action_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_messages_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "therapeutic_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          assistant_id: string
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          assistant_id: string
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          assistant_id?: string
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_suggestion_cache: {
        Row: {
          ai_generated_content: Json | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          patient_id: string
          session_hash: string
          suggestion_data: Json
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          ai_generated_content?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          patient_id: string
          session_hash: string
          suggestion_data: Json
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          ai_generated_content?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          patient_id?: string
          session_hash?: string
          suggestion_data?: Json
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestion_cache_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      body_analyses: {
        Row: {
          account_id: string | null
          analysis_date: string
          analysis_name: string
          created_at: string
          created_by: string | null
          evaluation_data: Json
          id: string
          observations: string | null
          patient_id: string
          photos: string[] | null
          status: string
          trait_scores: Json
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          analysis_date?: string
          analysis_name?: string
          created_at?: string
          created_by?: string | null
          evaluation_data?: Json
          id?: string
          observations?: string | null
          patient_id: string
          photos?: string[] | null
          status?: string
          trait_scores?: Json
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          analysis_date?: string
          analysis_name?: string
          created_at?: string
          created_by?: string | null
          evaluation_data?: Json
          id?: string
          observations?: string | null
          patient_id?: string
          photos?: string[] | null
          status?: string
          trait_scores?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "body_analyses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_body_analyses_patient_id"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      body_evaluations: {
        Row: {
          body_part: string
          created_at: string
          evaluation_context: string | null
          evaluation_description: string
          id: string
          is_active: boolean
          trait_code: string
          updated_at: string
          weight: number
        }
        Insert: {
          body_part: string
          created_at?: string
          evaluation_context?: string | null
          evaluation_description: string
          id?: string
          is_active?: boolean
          trait_code: string
          updated_at?: string
          weight?: number
        }
        Update: {
          body_part?: string
          created_at?: string
          evaluation_context?: string | null
          evaluation_description?: string
          id?: string
          is_active?: boolean
          trait_code?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_body_evaluations_trait_code"
            columns: ["trait_code"]
            isOneToOne: false
            referencedRelation: "body_traits"
            referencedColumns: ["codigo"]
          },
        ]
      }
      body_traits: {
        Row: {
          atributos_principais: string[]
          codigo: string
          color: string | null
          created_at: string
          descricao: string
          id: string
          is_active: boolean
          nome_simbolico: string
          nome_tecnico: string
          updated_at: string
        }
        Insert: {
          atributos_principais: string[]
          codigo: string
          color?: string | null
          created_at?: string
          descricao: string
          id?: string
          is_active?: boolean
          nome_simbolico: string
          nome_tecnico: string
          updated_at?: string
        }
        Update: {
          atributos_principais?: string[]
          codigo?: string
          color?: string | null
          created_at?: string
          descricao?: string
          id?: string
          is_active?: boolean
          nome_simbolico?: string
          nome_tecnico?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversation_analyses: {
        Row: {
          account_id: string | null
          conversation_summary: string | null
          created_at: string
          created_by: string
          id: string
          patient_id: string
          patient_traits_summary: string | null
          questions: Json
          raw_response: string | null
          session_type: string
          transcription_id: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          conversation_summary?: string | null
          created_at?: string
          created_by: string
          id?: string
          patient_id: string
          patient_traits_summary?: string | null
          questions?: Json
          raw_response?: string | null
          session_type?: string
          transcription_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          conversation_summary?: string | null
          created_at?: string
          created_by?: string
          id?: string
          patient_id?: string
          patient_traits_summary?: string | null
          questions?: Json
          raw_response?: string | null
          session_type?: string
          transcription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_analyses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_packages: {
        Row: {
          bonus_credits: number | null
          created_at: string
          credits: number
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          bonus_credits?: number | null
          created_at?: string
          credits: number
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          bonus_credits?: number | null
          created_at?: string
          credits?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string
          id: string
          related_action: string | null
          transaction_type: Database["public"]["Enums"]["credit_transaction_type"]
          user_id: string
          vindi_charge_id: string | null
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description: string
          id?: string
          related_action?: string | null
          transaction_type: Database["public"]["Enums"]["credit_transaction_type"]
          user_id: string
          vindi_charge_id?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string
          id?: string
          related_action?: string | null
          transaction_type?: Database["public"]["Enums"]["credit_transaction_type"]
          user_id?: string
          vindi_charge_id?: string | null
        }
        Relationships: []
      }
      evaluation_order: {
        Row: {
          body_part: string
          created_at: string
          evaluation_context: string | null
          id: string
          is_active: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          body_part: string
          created_at?: string
          evaluation_context?: string | null
          id?: string
          is_active?: boolean
          sort_order: number
          updated_at?: string
        }
        Update: {
          body_part?: string
          created_at?: string
          evaluation_context?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      exercise_prescriptions: {
        Row: {
          created_at: string
          duration_weeks: number | null
          exercise_id: string
          frequency: string | null
          id: string
          is_active: boolean | null
          patient_id: string
          prescribed_date: string
          specific_instructions: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_weeks?: number | null
          exercise_id: string
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          patient_id: string
          prescribed_date?: string
          specific_instructions?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_weeks?: number | null
          exercise_id?: string
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          patient_id?: string
          prescribed_date?: string
          specific_instructions?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_prescriptions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          image_url: string | null
          instructions: string | null
          name: string
          repetitions: number | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          name: string
          repetitions?: number | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          name?: string
          repetitions?: number | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          account_id: string | null
          amount: number
          attachment_url: string | null
          category_id: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          is_recurring: boolean
          notes: string | null
          payment_method: string | null
          recurrence_type: string | null
          reference_document: string | null
          status: string
          supplier_name: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          attachment_url?: string | null
          category_id: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          payment_method?: string | null
          recurrence_type?: string | null
          reference_document?: string | null
          status?: string
          supplier_name?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          attachment_url?: string | null
          category_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          payment_method?: string | null
          recurrence_type?: string | null
          reference_document?: string | null
          status?: string
          supplier_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          created_by: string | null
          description: string
          entry_date: string
          entry_type: string
          id: string
          notes: string | null
          patient_id: string | null
          reference_document: string | null
          session_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          created_by?: string | null
          description: string
          entry_date?: string
          entry_type: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          reference_document?: string | null
          session_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          entry_type?: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          reference_document?: string | null
          session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_plan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          account_id: string | null
          assessment: string | null
          attachments: string[] | null
          chief_complaint: string | null
          created_at: string
          homework: string | null
          id: string
          next_steps: string | null
          patient_id: string
          patient_response: string | null
          physical_exam: Json | null
          record_date: string
          session_id: string | null
          treatment_performed: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          assessment?: string | null
          attachments?: string[] | null
          chief_complaint?: string | null
          created_at?: string
          homework?: string | null
          id?: string
          next_steps?: string | null
          patient_id: string
          patient_response?: string | null
          physical_exam?: Json | null
          record_date?: string
          session_id?: string | null
          treatment_performed?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          assessment?: string | null
          attachments?: string[] | null
          chief_complaint?: string | null
          created_at?: string
          homework?: string | null
          id?: string
          next_steps?: string | null
          patient_id?: string
          patient_response?: string | null
          physical_exam?: Json | null
          record_date?: string
          session_id?: string | null
          treatment_performed?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_achievements: {
        Row: {
          achievement_name: string
          achievement_type: string
          created_at: string
          description: string | null
          earned_date: string
          id: string
          patient_id: string
          points: number
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          created_at?: string
          description?: string | null
          earned_date?: string
          id?: string
          patient_id: string
          points?: number
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          created_at?: string
          description?: string | null
          earned_date?: string
          id?: string
          patient_id?: string
          points?: number
        }
        Relationships: [
          {
            foreignKeyName: "patient_achievements_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_booking_tokens: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          patient_id: string
          token: string
          updated_at: string
          used: boolean
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          patient_id: string
          token: string
          updated_at?: string
          used?: boolean
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          patient_id?: string
          token?: string
          updated_at?: string
          used?: boolean
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
      patient_feedback_reads: {
        Row: {
          created_at: string
          feedback_id: string
          id: string
          patient_id: string
          read_at: string
        }
        Insert: {
          created_at?: string
          feedback_id: string
          id?: string
          patient_id: string
          read_at?: string
        }
        Update: {
          created_at?: string
          feedback_id?: string
          id?: string
          patient_id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_feedback_reads_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "therapist_feedback"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_feedback_reads_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_invites: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string
          expires_at: string
          id: string
          token: string
          used: boolean | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
        }
        Relationships: []
      }
      patient_registration_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          patient_data: Json
          patient_id: string | null
          token: string
          updated_at: string | null
          used: boolean
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          patient_data: Json
          patient_id?: string | null
          token: string
          updated_at?: string | null
          used?: boolean
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          patient_data?: Json
          patient_id?: string | null
          token?: string
          updated_at?: string | null
          used?: boolean
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_registration_tokens_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          account_id: string | null
          address: Json | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          created_by: string | null
          document: string | null
          document_type: string | null
          email: string | null
          emergency_contact: Json | null
          gender: string | null
          id: string
          is_active: boolean | null
          name: string
          occupation: string | null
          phone: string | null
          social_media: Json | null
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          account_id?: string | null
          address?: Json | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          document_type?: string | null
          email?: string | null
          emergency_contact?: Json | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          occupation?: string | null
          phone?: string | null
          social_media?: Json | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          account_id?: string | null
          address?: Json | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          document_type?: string | null
          email?: string | null
          emergency_contact?: Json | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          occupation?: string | null
          phone?: string | null
          social_media?: Json | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
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
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      plan_packages: {
        Row: {
          bonus_multiplier: number | null
          created_at: string
          id: string
          is_featured: boolean | null
          package_id: string
          plan_type: Database["public"]["Enums"]["subscription_plan"]
          updated_at: string
        }
        Insert: {
          bonus_multiplier?: number | null
          created_at?: string
          id?: string
          is_featured?: boolean | null
          package_id: string
          plan_type: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
        }
        Update: {
          bonus_multiplier?: number | null
          created_at?: string
          id?: string
          is_featured?: boolean | null
          package_id?: string
          plan_type?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "credit_packages"
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
          full_name: string
          id: string
          instagram: string | null
          is_active: boolean
          job_title: string | null
          linkedin: string | null
          logo_url: string | null
          phone: string | null
          public_email: string | null
          role: Database["public"]["Enums"]["user_role"]
          selected_ai_agent_id: string | null
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
          full_name: string
          id?: string
          instagram?: string | null
          is_active?: boolean
          job_title?: string | null
          linkedin?: string | null
          logo_url?: string | null
          phone?: string | null
          public_email?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          selected_ai_agent_id?: string | null
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
          full_name?: string
          id?: string
          instagram?: string | null
          is_active?: boolean
          job_title?: string | null
          linkedin?: string | null
          logo_url?: string | null
          phone?: string | null
          public_email?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          selected_ai_agent_id?: string | null
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
            foreignKeyName: "fk_profiles_selected_ai_agent"
            columns: ["selected_ai_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          created_at: string
          id: string
          issue_date: string
          pdf_url: string | null
          receipt_number: string
          transaction_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          issue_date?: string
          pdf_url?: string | null
          receipt_number: string
          transaction_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          issue_date?: string
          pdf_url?: string | null
          receipt_number?: string
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_costs: {
        Row: {
          cost_per_usage: number
          created_at: string
          id: string
          is_active: boolean
          resource_description: string | null
          resource_name: string
          updated_at: string
        }
        Insert: {
          cost_per_usage?: number
          created_at?: string
          id?: string
          is_active?: boolean
          resource_description?: string | null
          resource_name: string
          updated_at?: string
        }
        Update: {
          cost_per_usage?: number
          created_at?: string
          id?: string
          is_active?: boolean
          resource_description?: string | null
          resource_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          account_id: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          notes: string | null
          patient_id: string
          price: number | null
          scheduled_at: string
          session_type: string
          status: string | null
          treatment_plan_id: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          price?: number | null
          scheduled_at: string
          session_type: string
          status?: string | null
          treatment_plan_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          price?: number | null
          scheduled_at?: string
          session_type?: string
          status?: string | null
          treatment_plan_id?: string | null
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
          {
            foreignKeyName: "sessions_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          annual_credits: number | null
          annual_price: number | null
          created_at: string
          credit_multiplier: number
          features: Json | null
          id: string
          is_active: boolean | null
          monthly_credits: number | null
          monthly_price: number
          name: string
          plan_type: Database["public"]["Enums"]["subscription_plan"]
          updated_at: string
        }
        Insert: {
          annual_credits?: number | null
          annual_price?: number | null
          created_at?: string
          credit_multiplier?: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          monthly_credits?: number | null
          monthly_price: number
          name: string
          plan_type: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
        }
        Update: {
          annual_credits?: number | null
          annual_price?: number | null
          created_at?: string
          credit_multiplier?: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          monthly_credits?: number | null
          monthly_price?: number
          name?: string
          plan_type?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          action_plan_prompt: string | null
          appointment_duration: number
          appointment_interval: number
          body_analysis_prompt: string | null
          buffer_time: number
          conversation_analysis_prompt: string | null
          created_at: string
          follow_up_prompt: string | null
          id: string
          lunch_break_end: string
          lunch_break_start: string
          therapeutic_plan_prompt: string | null
          therapy_conclusion_prompt: string | null
          updated_at: string
          working_days: string[]
          working_hours_end: string
          working_hours_start: string
        }
        Insert: {
          action_plan_prompt?: string | null
          appointment_duration?: number
          appointment_interval?: number
          body_analysis_prompt?: string | null
          buffer_time?: number
          conversation_analysis_prompt?: string | null
          created_at?: string
          follow_up_prompt?: string | null
          id?: string
          lunch_break_end?: string
          lunch_break_start?: string
          therapeutic_plan_prompt?: string | null
          therapy_conclusion_prompt?: string | null
          updated_at?: string
          working_days?: string[]
          working_hours_end?: string
          working_hours_start?: string
        }
        Update: {
          action_plan_prompt?: string | null
          appointment_duration?: number
          appointment_interval?: number
          body_analysis_prompt?: string | null
          buffer_time?: number
          conversation_analysis_prompt?: string | null
          created_at?: string
          follow_up_prompt?: string | null
          id?: string
          lunch_break_end?: string
          lunch_break_start?: string
          therapeutic_plan_prompt?: string | null
          therapy_conclusion_prompt?: string | null
          updated_at?: string
          working_days?: string[]
          working_hours_end?: string
          working_hours_start?: string
        }
        Relationships: []
      }
      therapeutic_actions: {
        Row: {
          account_id: string | null
          created_at: string
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean
          name: string
          objective: string
          observations: string | null
          patient_notified: boolean | null
          priority: string
          start_date: string
          treatment_plan_id: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          end_date?: string | null
          frequency: string
          id?: string
          is_active?: boolean
          name: string
          objective: string
          observations?: string | null
          patient_notified?: boolean | null
          priority?: string
          start_date: string
          treatment_plan_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          name?: string
          objective?: string
          observations?: string | null
          patient_notified?: boolean | null
          priority?: string
          start_date?: string
          treatment_plan_id?: string
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
      therapist_feedback: {
        Row: {
          action_completed: boolean
          created_at: string
          execution_id: string
          feedback_text: string | null
          id: string
          quick_reaction: string | null
          therapist_id: string
          updated_at: string
        }
        Insert: {
          action_completed?: boolean
          created_at?: string
          execution_id: string
          feedback_text?: string | null
          id?: string
          quick_reaction?: string | null
          therapist_id: string
          updated_at?: string
        }
        Update: {
          action_completed?: boolean
          created_at?: string
          execution_id?: string
          feedback_text?: string | null
          id?: string
          quick_reaction?: string | null
          therapist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapist_feedback_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "action_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          description: string
          due_date: string | null
          id: string
          notes: string | null
          patient_id: string
          payment_date: string | null
          payment_method: string | null
          receipt_id: string | null
          session_id: string | null
          status: string
          transaction_date: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          payment_date?: string | null
          payment_method?: string | null
          receipt_id?: string | null
          session_id?: string | null
          status?: string
          transaction_date?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          payment_date?: string | null
          payment_method?: string | null
          receipt_id?: string | null
          session_id?: string | null
          status?: string
          transaction_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      transcriptions: {
        Row: {
          account_id: string | null
          audio_duration_seconds: number | null
          audio_url: string | null
          created_at: string
          created_by: string
          id: string
          patient_id: string
          session_type: string
          transcription_text: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          audio_duration_seconds?: number | null
          audio_url?: string | null
          created_at?: string
          created_by: string
          id?: string
          patient_id: string
          session_type?: string
          transcription_text?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          audio_duration_seconds?: number | null
          audio_url?: string | null
          created_at?: string
          created_by?: string
          id?: string
          patient_id?: string
          session_type?: string
          transcription_text?: string | null
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
        ]
      }
      treatment_plans: {
        Row: {
          account_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          goals: string[] | null
          id: string
          observations: string | null
          patient_id: string
          start_date: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          goals?: string[] | null
          id?: string
          observations?: string | null
          patient_id: string
          start_date: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          goals?: string[] | null
          id?: string
          observations?: string | null
          patient_id?: string
          start_date?: string
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
      user_credits: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_consumed: number
          total_purchased: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_consumed?: number
          total_purchased?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_consumed?: number
          total_purchased?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          next_billing_date: string | null
          plan_type: Database["public"]["Enums"]["subscription_plan"]
          started_at: string
          status: string
          updated_at: string
          user_id: string
          vindi_subscription_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          next_billing_date?: string | null
          plan_type: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
          vindi_subscription_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          next_billing_date?: string | null
          plan_type?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
          vindi_subscription_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_account_credits: {
        Args: {
          p_account_id: string
          p_user_id: string
          p_amount: number
          p_description: string
          p_transaction_type?: Database["public"]["Enums"]["credit_transaction_type"]
          p_vindi_charge_id?: string
        }
        Returns: boolean
      }
      add_credits: {
        Args: {
          p_user_id: string
          p_amount: number
          p_description: string
          p_transaction_type?: Database["public"]["Enums"]["credit_transaction_type"]
          p_vindi_charge_id?: string
        }
        Returns: boolean
      }
      consume_account_credits: {
        Args: {
          p_account_id: string
          p_user_id: string
          p_amount: number
          p_description: string
          p_action?: string
        }
        Returns: boolean
      }
      consume_credits: {
        Args: {
          p_user_id: string
          p_amount: number
          p_description: string
          p_action?: string
        }
        Returns: boolean
      }
      create_confirmed_patient_user: {
        Args: {
          patient_email: string
          patient_password: string
          patient_name: string
        }
        Returns: Json
      }
      create_patient_with_auth: {
        Args: {
          patient_name: string
          patient_email: string
          patient_password: string
          patient_phone?: string
          patient_birth_date?: string
          created_by_user_id?: string
        }
        Returns: {
          patient_id: string
          user_id: string
          message: string
        }[]
      }
      create_public_patient: {
        Args: { p_token: string; p_patient_data: Json }
        Returns: Json
      }
      get_account_credit_info: {
        Args: { p_account_id: string }
        Returns: {
          balance: number
          total_purchased: number
          total_consumed: number
          plan_type: Database["public"]["Enums"]["subscription_plan"]
          credit_multiplier: number
        }[]
      }
      get_resource_cost: {
        Args: { p_resource_name: string }
        Returns: number
      }
      get_treatment_plan_stats: {
        Args: { plan_id: string }
        Returns: {
          total_actions: number
          completed_actions: number
          progress_percentage: number
        }[]
      }
      get_user_account_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_credit_info: {
        Args: { p_user_id: string }
        Returns: {
          balance: number
          total_purchased: number
          total_consumed: number
          plan_type: Database["public"]["Enums"]["subscription_plan"]
          credit_multiplier: number
        }[]
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      initialize_account_credits_from_plan: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      is_admin: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      is_authenticated: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      user_has_permission: {
        Args: { user_uuid: string; permission_name: string }
        Returns: boolean
      }
    }
    Enums: {
      credit_transaction_type:
        | "purchase"
        | "consumption"
        | "admin_adjustment"
        | "plan_bonus"
      subscription_plan: "bronze" | "silver" | "gold"
      user_role: "admin" | "specialist" | "secretary" | "assistant"
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
      credit_transaction_type: [
        "purchase",
        "consumption",
        "admin_adjustment",
        "plan_bonus",
      ],
      subscription_plan: ["bronze", "silver", "gold"],
      user_role: ["admin", "specialist", "secretary", "assistant"],
      user_type: ["therapist", "patient"],
    },
  },
} as const
