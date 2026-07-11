export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type TrustDatabase = {
  public: {
    Tables: {
      business_verifications: {
        Row: {
          id: string
          user_id: string
          business_name: string
          business_type: string
          license_number: string | null
          tax_id: string | null
          address: string | null
          verification_status: 'pending' | 'approved' | 'rejected'
          verified_at: string | null
          verified_by: string | null
          documents: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_name: string
          business_type?: string
          license_number?: string | null
          tax_id?: string | null
          address?: string | null
          verification_status?: 'pending' | 'approved' | 'rejected'
          verified_at?: string | null
          verified_by?: string | null
          documents?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_name?: string
          business_type?: string
          license_number?: string | null
          tax_id?: string | null
          address?: string | null
          verification_status?: 'pending' | 'approved' | 'rejected'
          verified_at?: string | null
          verified_by?: string | null
          documents?: Json
          created_at?: string
        }
        Relationships: []
      }
      address_verifications: {
        Row: {
          id: string
          user_id: string
          address: string
          verification_status: 'pending' | 'approved' | 'rejected'
          verified_at: string | null
          coordinates: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          address: string
          verification_status?: 'pending' | 'approved' | 'rejected'
          verified_at?: string | null
          coordinates?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          address?: string
          verification_status?: 'pending' | 'approved' | 'rejected'
          verified_at?: string | null
          coordinates?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      seller_scores: {
        Row: {
          id: string
          user_id: string
          trust_score: number
          fraud_risk_score: number
          reputation_score: number
          factors: Json
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          trust_score?: number
          fraud_risk_score?: number
          reputation_score?: number
          factors?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          trust_score?: number
          fraud_risk_score?: number
          reputation_score?: number
          factors?: Json
          updated_at?: string
        }
        Relationships: []
      }
      fraud_flags: {
        Row: {
          id: string
          user_id: string
          flag_type: string
          severity: 'low' | 'medium' | 'high' | 'critical'
          description: string | null
          auto_generated: boolean
          resolved: boolean
          resolved_by: string | null
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          flag_type: string
          severity?: 'low' | 'medium' | 'high' | 'critical'
          description?: string | null
          auto_generated?: boolean
          resolved?: boolean
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          flag_type?: string
          severity?: 'low' | 'medium' | 'high' | 'critical'
          description?: string | null
          auto_generated?: boolean
          resolved?: boolean
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      device_fingerprints: {
        Row: {
          id: string
          user_id: string
          fingerprint_hash: string
          device_info: Json
          ip_address: string | null
          first_seen: string
          last_seen: string
        }
        Insert: {
          id?: string
          user_id: string
          fingerprint_hash: string
          device_info?: Json
          ip_address?: string | null
          first_seen?: string
          last_seen?: string
        }
        Update: {
          id?: string
          user_id?: string
          fingerprint_hash?: string
          device_info?: Json
          ip_address?: string | null
          first_seen?: string
          last_seen?: string
        }
        Relationships: []
      }
      ip_reputation: {
        Row: {
          id: string
          ip_address: string
          reputation_score: number
          is_vpn: boolean
          is_proxy: boolean
          is_blacklisted: boolean
          country: string | null
          isp: string | null
          last_checked: string
        }
        Insert: {
          id?: string
          ip_address: string
          reputation_score?: number
          is_vpn?: boolean
          is_proxy?: boolean
          is_blacklisted?: boolean
          country?: string | null
          isp?: string | null
          last_checked?: string
        }
        Update: {
          id?: string
          ip_address?: string
          reputation_score?: number
          is_vpn?: boolean
          is_proxy?: boolean
          is_blacklisted?: boolean
          country?: string | null
          isp?: string | null
          last_checked?: string
        }
        Relationships: []
      }
      blacklisted_items: {
        Row: {
          id: string
          type: 'ip' | 'email' | 'phone'
          value: string
          reason: string | null
          added_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type: 'ip' | 'email' | 'phone'
          value: string
          reason?: string | null
          added_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: 'ip' | 'email' | 'phone'
          value?: string
          reason?: string | null
          added_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      shadow_bans: {
        Row: {
          id: string
          user_id: string
          reason: string | null
          banned_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          reason?: string | null
          banned_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          reason?: string | null
          banned_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      permission_overrides: {
        Row: {
          id: string
          user_id: string
          permission: string
          granted: boolean
          granted_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          permission: string
          granted?: boolean
          granted_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          permission?: string
          granted?: boolean
          granted_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
  }
}
