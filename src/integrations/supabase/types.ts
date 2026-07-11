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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ad_images: {
        Row: {
          ad_id: string
          created_at: string
          id: string
          image_url: string
          sort_order: number | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          id?: string
          image_url: string
          sort_order?: number | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          id?: string
          image_url?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_images_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_stats: {
        Row: {
          ad_id: string
          created_at: string
          favorites: number | null
          id: string
          messages: number | null
          offers: number | null
          shares: number | null
          stat_date: string
          views: number | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          favorites?: number | null
          id?: string
          messages?: number | null
          offers?: number | null
          shares?: number | null
          stat_date?: string
          views?: number | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          favorites?: number | null
          id?: string
          messages?: number | null
          offers?: number | null
          shares?: number | null
          stat_date?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_stats_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          area: string | null
          boosted_until: string | null
          category_id: string
          condition: Database["public"]["Enums"]["item_condition"]
          created_at: string
          description: string | null
          district: string
          division: string
          expires_at: string | null
          favorites_count: number | null
          id: string
          is_boosted: boolean | null
          is_featured: boolean | null
          is_premium: boolean | null
          is_urgent: boolean | null
          offers_count: number | null
          premium_until: string | null
          price: number | null
          price_type: Database["public"]["Enums"]["price_type"]
          rejection_message: string | null
          rejection_reason_code: string | null
          scheduled_at: string | null
          shares_count: number | null
          slug: string
          status: Database["public"]["Enums"]["ad_status"]
          subcategory_id: string | null
          title: string
          updated_at: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          area?: string | null
          boosted_until?: string | null
          category_id: string
          condition?: Database["public"]["Enums"]["item_condition"]
          created_at?: string
          description?: string | null
          district: string
          division: string
          expires_at?: string | null
          favorites_count?: number | null
          id?: string
          is_boosted?: boolean | null
          is_featured?: boolean | null
          is_premium?: boolean | null
          is_urgent?: boolean | null
          offers_count?: number | null
          premium_until?: string | null
          price?: number | null
          price_type?: Database["public"]["Enums"]["price_type"]
          rejection_message?: string | null
          rejection_reason_code?: string | null
          scheduled_at?: string | null
          shares_count?: number | null
          slug: string
          status?: Database["public"]["Enums"]["ad_status"]
          subcategory_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          area?: string | null
          boosted_until?: string | null
          category_id?: string
          condition?: Database["public"]["Enums"]["item_condition"]
          created_at?: string
          description?: string | null
          district?: string
          division?: string
          expires_at?: string | null
          favorites_count?: number | null
          id?: string
          is_boosted?: boolean | null
          is_featured?: boolean | null
          is_premium?: boolean | null
          is_urgent?: boolean | null
          offers_count?: number | null
          premium_until?: string | null
          price?: number | null
          price_type?: Database["public"]["Enums"]["price_type"]
          rejection_message?: string | null
          rejection_reason_code?: string | null
          scheduled_at?: string | null
          shares_count?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["ad_status"]
          subcategory_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          meta_description: string | null
          meta_title: string | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          ad_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          ad_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          ad_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          ad_id: string | null
          body: string
          created_at: string
          id: string
          is_read: boolean | null
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          ad_id?: string | null
          body: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          ad_id?: string | null
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          ad_id: string
          amount: number
          buyer_id: string
          created_at: string
          expires_at: string | null
          id: string
          message: string | null
          seller_id: string
          status: Database["public"]["Enums"]["offer_status"]
          updated_at: string
        }
        Insert: {
          ad_id: string
          amount: number
          buyer_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Update: {
          ad_id?: string
          amount?: number
          buyer_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          area: string | null
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          district: string | null
          division: string | null
          full_name: string | null
          id: string
          is_blocked: boolean | null
          is_suspended: boolean | null
          is_verified: boolean | null
          last_login_at: string | null
          last_login_ip: string | null
          phone_number: string | null
          suspended_at: string | null
          suspended_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string | null
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          district?: string | null
          division?: string | null
          full_name?: string | null
          id?: string
          is_blocked?: boolean | null
          is_suspended?: boolean | null
          is_verified?: boolean | null
          last_login_at?: string | null
          last_login_ip?: string | null
          phone_number?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string | null
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          district?: string | null
          division?: string | null
          full_name?: string | null
          id?: string
          is_blocked?: boolean | null
          is_suspended?: boolean | null
          is_verified?: boolean | null
          last_login_at?: string | null
          last_login_ip?: string | null
          phone_number?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          ad_id: string
          admin_notes: string | null
          created_at: string
          id: string
          is_resolved: boolean | null
          reason: string
          reason_code: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_id: string
          admin_notes?: string | null
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          reason: string
          reason_code?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_id?: string
          admin_notes?: string | null
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          reason?: string
          reason_code?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          category_id: string | null
          condition: Database["public"]["Enums"]["item_condition"] | null
          created_at: string
          district: string | null
          division: string | null
          filters: Json | null
          id: string
          last_notified_at: string | null
          max_price: number | null
          min_price: number | null
          name: string
          notify_on_match: boolean | null
          query: string | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          condition?: Database["public"]["Enums"]["item_condition"] | null
          created_at?: string
          district?: string | null
          division?: string | null
          filters?: Json | null
          id?: string
          last_notified_at?: string | null
          max_price?: number | null
          min_price?: number | null
          name: string
          notify_on_match?: boolean | null
          query?: string | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          condition?: Database["public"]["Enums"]["item_condition"] | null
          created_at?: string
          district?: string | null
          division?: string | null
          filters?: Json | null
          id?: string
          last_notified_at?: string | null
          max_price?: number | null
          min_price?: number | null
          name?: string
          notify_on_match?: boolean | null
          query?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_staff: boolean | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_staff?: boolean | null
          ticket_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_staff?: boolean | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolution: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_sessions: {
        Row: {
          created_at: string
          device_info: Json | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_activity_at: string
          session_token: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity_at?: string
          session_token?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity_at?: string
          session_token?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: {
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: {
        Args: {
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      ad_status: "pending" | "approved" | "rejected" | "sold" | "expired" | "draft" | "boosted" | "premium"
      app_role: "super_admin" | "admin" | "moderator" | "customer_support" | "seller" | "buyer"
      item_condition: "new" | "used"
      price_type: "fixed" | "negotiable" | "free"
      report_status: "pending" | "reviewing" | "resolved" | "dismissed"
      ticket_status: "open" | "in_progress" | "waiting_on_user" | "resolved" | "closed"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      notification_type: "ad_approved" | "ad_rejected" | "new_message" | "new_offer" | "offer_accepted" | "offer_rejected" | "ad_expiring" | "report_update" | "system" | "ticket_update"
      offer_status: "pending" | "accepted" | "rejected" | "expired"
      audit_action: "create" | "update" | "delete" | "login" | "logout" | "login_failed" | "approve" | "reject" | "suspend" | "unsuspend" | "verify" | "export" | "bulk_action" | "settings_change"
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
      ad_status: ["pending", "approved", "rejected", "sold", "expired", "draft", "boosted", "premium"],
      app_role: ["super_admin", "admin", "moderator", "customer_support", "seller", "buyer"],
      item_condition: ["new", "used"],
      price_type: ["fixed", "negotiable", "free"],
      report_status: ["pending", "reviewing", "resolved", "dismissed"],
      ticket_status: ["open", "in_progress", "waiting_on_user", "resolved", "closed"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      notification_type: ["ad_approved", "ad_rejected", "new_message", "new_offer", "offer_accepted", "offer_rejected", "ad_expiring", "report_update", "system", "ticket_update"],
      offer_status: ["pending", "accepted", "rejected", "expired"],
      audit_action: ["create", "update", "delete", "login", "logout", "login_failed", "approve", "reject", "suspend", "unsuspend", "verify", "export", "bulk_action", "settings_change"],
    },
  },
} as const
