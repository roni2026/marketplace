export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'appealed';

export type DatabaseV2Social = {
  public: {
    Tables: {
      message_reactions: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          user_id?: string;
          emoji?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      message_attachments: {
        Row: {
          id: string;
          message_id: string;
          file_url: string;
          file_type: string;
          file_name: string;
          file_size: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          file_url: string;
          file_type: string;
          file_name: string;
          file_size?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          file_url?: string;
          file_type?: string;
          file_name?: string;
          file_size?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      quick_replies: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      auto_responses: {
        Row: {
          id: string;
          user_id: string;
          keyword: string;
          response: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          keyword: string;
          response: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          keyword?: string;
          response?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      conversation_archive: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          archived_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          archived_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          archived_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          ad_id: string | null;
          reviewer_id: string;
          seller_id: string;
          rating: number;
          title: string | null;
          body: string | null;
          images: string[];
          videos: string[];
          is_verified_purchase: boolean;
          helpful_count: number;
          status: ReviewStatus;
          appeal_reason: string | null;
          moderated_by: string | null;
          moderated_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ad_id?: string | null;
          reviewer_id: string;
          seller_id: string;
          rating: number;
          title?: string | null;
          body?: string | null;
          images?: string[];
          videos?: string[];
          is_verified_purchase?: boolean;
          helpful_count?: number;
          status?: ReviewStatus;
          appeal_reason?: string | null;
          moderated_by?: string | null;
          moderated_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ad_id?: string | null;
          reviewer_id?: string;
          seller_id?: string;
          rating?: number;
          title?: string | null;
          body?: string | null;
          images?: string[];
          videos?: string[];
          is_verified_purchase?: boolean;
          helpful_count?: number;
          status?: ReviewStatus;
          appeal_reason?: string | null;
          moderated_by?: string | null;
          moderated_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      review_replies: {
        Row: {
          id: string;
          review_id: string;
          user_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          user_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          review_id?: string;
          user_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      review_helpful: {
        Row: {
          id: string;
          review_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          review_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      seller_analytics: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          views: number;
          inquiries: number;
          offers: number;
          conversions: number;
          revenue: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date?: string;
          views?: number;
          inquiries?: number;
          offers?: number;
          conversions?: number;
          revenue?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          views?: number;
          inquiries?: number;
          offers?: number;
          conversions?: number;
          revenue?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      seller_followers: {
        Row: {
          id: string;
          seller_id: string;
          follower_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          follower_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          follower_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      product_comparisons: {
        Row: {
          id: string;
          user_id: string;
          ad_ids: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ad_ids: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ad_ids?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      recently_sold: {
        Row: {
          id: string;
          ad_id: string | null;
          sold_at: string;
          sold_price: number | null;
        };
        Insert: {
          id?: string;
          ad_id?: string | null;
          sold_at?: string;
          sold_price?: number | null;
        };
        Update: {
          id?: string;
          ad_id?: string | null;
          sold_at?: string;
          sold_price?: number | null;
        };
        Relationships: [];
      };
      price_drops: {
        Row: {
          id: string;
          ad_id: string;
          old_price: number;
          new_price: number;
          dropped_at: string;
        };
        Insert: {
          id?: string;
          ad_id: string;
          old_price: number;
          new_price: number;
          dropped_at?: string;
        };
        Update: {
          id?: string;
          ad_id?: string;
          old_price?: number;
          new_price?: number;
          dropped_at?: string;
        };
        Relationships: [];
      };
      recommendations: {
        Row: {
          id: string;
          user_id: string;
          ad_id: string;
          score: number;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ad_id: string;
          score?: number;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ad_id?: string;
          score?: number;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      saved_carts: {
        Row: {
          id: string;
          user_id: string;
          ad_ids: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ad_ids?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ad_ids?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      buying_reminders: {
        Row: {
          id: string;
          user_id: string;
          ad_id: string;
          reminder_date: string;
          notified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ad_id: string;
          reminder_date: string;
          notified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ad_id?: string;
          reminder_date?: string;
          notified?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      review_status: ReviewStatus;
    };
  };
};

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
