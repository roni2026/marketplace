export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type DatabaseV2System = {
  public: {
    Tables: {
      admin_bookmarks: {
        Row: {
          id: string
          admin_id: string
          entity_type: string
          entity_id: string
          label: string | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          entity_type: string
          entity_id: string
          label?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          entity_type?: string
          entity_id?: string
          label?: string | null
          created_at?: string
        }
        Relationships: []
      }
      admin_notes: {
        Row: {
          id: string
          admin_id: string
          entity_type: string
          entity_id: string
          note: string
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          entity_type: string
          entity_id: string
          note: string
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          entity_type?: string
          entity_id?: string
          note?: string
          created_at?: string
        }
        Relationships: []
      }
      admin_reminders: {
        Row: {
          id: string
          admin_id: string
          title: string
          description: string | null
          reminder_date: string
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          title: string
          description?: string | null
          reminder_date: string
          completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          title?: string
          description?: string | null
          reminder_date?: string
          completed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      admin_impersonation_logs: {
        Row: {
          id: string
          admin_id: string
          target_user_id: string
          started_at: string
          ended_at: string | null
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          target_user_id: string
          started_at?: string
          ended_at?: string | null
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          target_user_id?: string
          started_at?: string
          ended_at?: string | null
          reason?: string | null
          created_at?: string
        }
        Relationships: []
      }
      api_tokens: {
        Row: {
          id: string
          user_id: string
          name: string
          token_hash: string
          scopes: string[]
          last_used: string | null
          expires_at: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          token_hash: string
          scopes?: string[]
          last_used?: string | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          token_hash?: string
          scopes?: string[]
          last_used?: string | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      api_logs: {
        Row: {
          id: string
          user_id: string | null
          endpoint: string
          method: string
          status_code: number | null
          response_time_ms: number | null
          ip_address: string | null
          request_body: Json | null
          response_body: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          endpoint: string
          method: string
          status_code?: number | null
          response_time_ms?: number | null
          ip_address?: string | null
          request_body?: Json | null
          response_body?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          endpoint?: string
          method?: string
          status_code?: number | null
          response_time_ms?: number | null
          ip_address?: string | null
          request_body?: Json | null
          response_body?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      webhooks: {
        Row: {
          id: string
          user_id: string
          url: string
          events: string[]
          secret: string | null
          is_active: boolean
          last_triggered: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          url: string
          events?: string[]
          secret?: string | null
          is_active?: boolean
          last_triggered?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          url?: string
          events?: string[]
          secret?: string | null
          is_active?: boolean
          last_triggered?: string | null
          created_at?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          id: string
          level: string
          message: string
          stack_trace: string | null
          context: Json | null
          user_id: string | null
          url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          level?: string
          message: string
          stack_trace?: string | null
          context?: Json | null
          user_id?: string | null
          url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          level?: string
          message?: string
          stack_trace?: string | null
          context?: Json | null
          user_id?: string | null
          url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      system_health: {
        Row: {
          id: string
          metric_name: string
          metric_value: number
          recorded_at: string
        }
        Insert: {
          id?: string
          metric_name: string
          metric_value: number
          recorded_at?: string
        }
        Update: {
          id?: string
          metric_name?: string
          metric_value?: number
          recorded_at?: string
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          id: string
          to_email: string
          subject: string
          body: string | null
          status: string
          attempts: number
          last_attempt: string | null
          created_at: string
        }
        Insert: {
          id?: string
          to_email: string
          subject: string
          body?: string | null
          status?: string
          attempts?: number
          last_attempt?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          to_email?: string
          subject?: string
          body?: string | null
          status?: string
          attempts?: number
          last_attempt?: string | null
          created_at?: string
        }
        Relationships: []
      }
      failed_jobs: {
        Row: {
          id: string
          job_type: string
          payload: Json | null
          error: string | null
          attempts: number
          failed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          job_type: string
          payload?: Json | null
          error?: string | null
          attempts?: number
          failed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          job_type?: string
          payload?: Json | null
          error?: string | null
          attempts?: number
          failed_at?: string
          created_at?: string
        }
        Relationships: []
      }
      backup_history: {
        Row: {
          id: string
          type: string
          status: string
          size_bytes: number | null
          started_at: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type?: string
          status?: string
          size_bytes?: number | null
          started_at?: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          status?: string
          size_bytes?: number | null
          started_at?: string
          completed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          id: string
          key: string
          name: string
          description: string | null
          is_enabled: boolean
          config: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          key: string
          name: string
          description?: string | null
          is_enabled?: boolean
          config?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          key?: string
          name?: string
          description?: string | null
          is_enabled?: boolean
          config?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      consent_logs: {
        Row: {
          id: string
          user_id: string
          consent_type: string
          version: string
          accepted: boolean
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          consent_type: string
          version: string
          accepted: boolean
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          consent_type?: string
          version?: string
          accepted?: boolean
          ip_address?: string | null
          created_at?: string
        }
        Relationships: []
      }
      terms_acceptance: {
        Row: {
          id: string
          user_id: string
          terms_version: string
          accepted_at: string
          ip_address: string | null
        }
        Insert: {
          id?: string
          user_id: string
          terms_version: string
          accepted_at?: string
          ip_address?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          terms_version?: string
          accepted_at?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      translation_keys: {
        Row: {
          id: string
          key: string
          namespace: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          key: string
          namespace?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          key?: string
          namespace?: string | null
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      translations: {
        Row: {
          id: string
          key_id: string
          locale: string
          value: string
          created_at: string
        }
        Insert: {
          id?: string
          key_id: string
          locale: string
          value: string
          created_at?: string
        }
        Update: {
          id?: string
          key_id?: string
          locale?: string
          value?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'translations_key_id_fkey'
            columns: ['key_id']
            isOneToOne: false
            referencedRelation: 'translation_keys'
            referencedColumns: ['id']
          },
        ]
      }
      accessibility_settings: {
        Row: {
          id: string
          user_id: string
          high_contrast: boolean
          font_scale: number
          screen_reader: boolean
          keyboard_nav: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          high_contrast?: boolean
          font_scale?: number
          screen_reader?: boolean
          keyboard_nav?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          high_contrast?: boolean
          font_scale?: number
          screen_reader?: boolean
          keyboard_nav?: boolean
          created_at?: string
        }
        Relationships: []
      }
      scheduled_reports: {
        Row: {
          id: string
          name: string
          config: Json | null
          frequency: string
          recipients: string[]
          last_sent: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          config?: Json | null
          frequency?: string
          recipients?: string[]
          last_sent?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          config?: Json | null
          frequency?: string
          recipients?: string[]
          last_sent?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      custom_reports: {
        Row: {
          id: string
          name: string
          config: Json | null
          data: Json | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          config?: Json | null
          data?: Json | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          config?: Json | null
          data?: Json | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
  }
}
