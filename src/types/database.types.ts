export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      merchants: {
        Row: {
          id: string
          name: string
          email: string
          business_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          business_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          business_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          merchant_id: string
          order_id: string | null
          payment_id: string | null
          amount: number
          currency: string
          payment_method: string | null
          status: string
          failure_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          merchant_id: string
          order_id?: string | null
          payment_id?: string | null
          amount: number
          currency?: string
          payment_method?: string | null
          status: string
          failure_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          merchant_id?: string
          order_id?: string | null
          payment_id?: string | null
          amount?: number
          currency?: string
          payment_method?: string | null
          status?: string
          failure_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      recovery_cases: {
        Row: {
          id: string
          payment_id: string
          merchant_id: string
          current_stage: string
          recovery_status: string
          confidence_score: number | null
          recommended_action: string | null
          customer_intent: string | null
          scheduled_retry_at: string | null
          failure_reason: string | null
          recovery_priority: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          payment_id: string
          merchant_id: string
          current_stage: string
          recovery_status: string
          confidence_score?: number | null
          recommended_action?: string | null
          customer_intent?: string | null
          scheduled_retry_at?: string | null
          failure_reason?: string | null
          recovery_priority?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          payment_id?: string
          merchant_id?: string
          current_stage?: string
          recovery_status?: string
          confidence_score?: number | null
          recommended_action?: string | null
          customer_intent?: string | null
          scheduled_retry_at?: string | null
          failure_reason?: string | null
          recovery_priority?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      recovery_queue: {
        Row: {
          id: string
          recovery_case_id: string
          merchant_id: string
          scheduled_retry_at: string
          attempt_count: number
          status: string
          leased_until: string | null
          worker_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          recovery_case_id: string
          merchant_id: string
          scheduled_retry_at: string
          attempt_count?: number
          status?: string
          leased_until?: string | null
          worker_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          recovery_case_id?: string
          merchant_id?: string
          scheduled_retry_at?: string
          attempt_count?: number
          status?: string
          leased_until?: string | null
          worker_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          recovery_case_id: string | null
          payment_id: string | null
          actor: string
          event_type: string
          reason: string | null
          result: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          recovery_case_id?: string | null
          payment_id?: string | null
          actor: string
          event_type: string
          reason?: string | null
          result?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          recovery_case_id?: string | null
          payment_id?: string | null
          actor?: string
          event_type?: string
          reason?: string | null
          result?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          recovery_case_id: string
          role: string
          message: string
          detected_intent: string | null
          confidence_score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          recovery_case_id: string
          role: string
          message: string
          detected_intent?: string | null
          confidence_score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          recovery_case_id?: string
          role?: string
          message?: string
          detected_intent?: string | null
          confidence_score?: number | null
          created_at?: string
        }
      }
      webhook_events: {
        Row: {
          id: string
          event_id: string
          event_type: string | null
          processed_at: string
        }
        Insert: {
          id?: string
          event_id: string
          event_type?: string | null
          processed_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          event_type?: string | null
          processed_at?: string
        }
      }
    }
  }
}
