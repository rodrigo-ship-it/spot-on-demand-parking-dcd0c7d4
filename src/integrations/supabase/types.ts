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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown | null
          target_resource: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          target_resource?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          target_resource?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          checkout_location_verified: boolean | null
          checkout_photo_verified: boolean | null
          checkout_timestamp_verified: boolean | null
          checkout_verification_method: string | null
          completed_by_system: boolean | null
          created_at: string
          display_date: string | null
          display_duration_text: string | null
          display_end_time: string | null
          display_start_time: string | null
          end_time: string
          id: string
          owner_payout_amount: number | null
          payment_intent_id: string | null
          platform_fee_amount: number | null
          qr_code_used: boolean | null
          renter_id: string
          spot_id: string
          start_time: string
          status: string
          stripe_transfer_id: string | null
          total_amount: number
          updated_at: string
          verification_score: number | null
        }
        Insert: {
          checkout_location_verified?: boolean | null
          checkout_photo_verified?: boolean | null
          checkout_timestamp_verified?: boolean | null
          checkout_verification_method?: string | null
          completed_by_system?: boolean | null
          created_at?: string
          display_date?: string | null
          display_duration_text?: string | null
          display_end_time?: string | null
          display_start_time?: string | null
          end_time: string
          id?: string
          owner_payout_amount?: number | null
          payment_intent_id?: string | null
          platform_fee_amount?: number | null
          qr_code_used?: boolean | null
          renter_id: string
          spot_id: string
          start_time: string
          status?: string
          stripe_transfer_id?: string | null
          total_amount: number
          updated_at?: string
          verification_score?: number | null
        }
        Update: {
          checkout_location_verified?: boolean | null
          checkout_photo_verified?: boolean | null
          checkout_timestamp_verified?: boolean | null
          checkout_verification_method?: string | null
          completed_by_system?: boolean | null
          created_at?: string
          display_date?: string | null
          display_duration_text?: string | null
          display_end_time?: string | null
          display_start_time?: string | null
          end_time?: string
          id?: string
          owner_payout_amount?: number | null
          payment_intent_id?: string | null
          platform_fee_amount?: number | null
          qr_code_used?: boolean | null
          renter_id?: string
          spot_id?: string
          start_time?: string
          status?: string
          stripe_transfer_id?: string | null
          total_amount?: number
          updated_at?: string
          verification_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "owner_analytics"
            referencedColumns: ["spot_id"]
          },
          {
            foreignKeyName: "bookings_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "parking_spots"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          booking_id: string
          caller_id: string
          created_at: string | null
          ended_at: string | null
          expires_at: string | null
          id: string
          proxy_number: string | null
          recipient_id: string
          status: string | null
          twilio_session_id: string | null
        }
        Insert: {
          booking_id: string
          caller_id: string
          created_at?: string | null
          ended_at?: string | null
          expires_at?: string | null
          id?: string
          proxy_number?: string | null
          recipient_id: string
          status?: string | null
          twilio_session_id?: string | null
        }
        Update: {
          booking_id?: string
          caller_id?: string
          created_at?: string | null
          ended_at?: string | null
          expires_at?: string | null
          id?: string
          proxy_number?: string | null
          recipient_id?: string
          status?: string | null
          twilio_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_call_sessions_booking"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          assignee_id: string | null
          auto_resolved: boolean | null
          booking_id: string
          created_at: string
          description: string | null
          dispute_type: string
          id: string
          photo_url: string
          reporter_id: string
          resolution: string | null
          resolution_notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          auto_resolved?: boolean | null
          booking_id: string
          created_at?: string
          description?: string | null
          dispute_type: string
          id?: string
          photo_url: string
          reporter_id: string
          resolution?: string | null
          resolution_notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          auto_resolved?: boolean | null
          booking_id?: string
          created_at?: string
          description?: string | null
          dispute_type?: string
          id?: string
          photo_url?: string
          reporter_id?: string
          resolution?: string | null
          resolution_notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      extensions: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          rate_per_hour: number
          requested_hours: number
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          rate_per_hour: number
          requested_hours: number
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          rate_per_hour?: number
          requested_hours?: number
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extensions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          category: string
          content: string
          created_at: string
          helpful_votes: number | null
          id: string
          is_published: boolean | null
          keywords: string[] | null
          subcategory: string | null
          title: string
          unhelpful_votes: number | null
          updated_at: string
          views: number | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          helpful_votes?: number | null
          id?: string
          is_published?: boolean | null
          keywords?: string[] | null
          subcategory?: string | null
          title: string
          unhelpful_votes?: number | null
          updated_at?: string
          views?: number | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          helpful_votes?: number | null
          id?: string
          is_published?: boolean | null
          keywords?: string[] | null
          subcategory?: string | null
          title?: string
          unhelpful_votes?: number | null
          updated_at?: string
          views?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          booking_id: string
          content: string
          created_at: string | null
          id: string
          message_type: string | null
          read_at: string | null
          recipient_id: string
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          booking_id: string
          content: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          read_at?: string | null
          recipient_id: string
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          booking_id?: string
          content?: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_messages_booking"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          booking_updates: boolean
          created_at: string
          id: string
          payment_alerts: boolean
          promotions: boolean
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_updates?: boolean
          created_at?: string
          id?: string
          payment_alerts?: boolean
          promotions?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_updates?: boolean
          created_at?: string
          id?: string
          payment_alerts?: boolean
          promotions?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      parking_spots: {
        Row: {
          access_instructions: string | null
          access_requirements: string | null
          address: string
          amenities: string[] | null
          availability_schedule: Json | null
          available_spots: number | null
          created_at: string
          daily_price: number | null
          description: string | null
          id: string
          images: string[] | null
          is_active: boolean
          latitude: number | null
          longitude: number | null
          one_time_price: number | null
          owner_id: string
          price_per_hour: number | null
          pricing_type: string
          rating: number | null
          spot_type: string
          title: string
          total_reviews: number | null
          total_spots: number | null
          updated_at: string
        }
        Insert: {
          access_instructions?: string | null
          access_requirements?: string | null
          address: string
          amenities?: string[] | null
          availability_schedule?: Json | null
          available_spots?: number | null
          created_at?: string
          daily_price?: number | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          one_time_price?: number | null
          owner_id: string
          price_per_hour?: number | null
          pricing_type?: string
          rating?: number | null
          spot_type: string
          title: string
          total_reviews?: number | null
          total_spots?: number | null
          updated_at?: string
        }
        Update: {
          access_instructions?: string | null
          access_requirements?: string | null
          address?: string
          amenities?: string[] | null
          availability_schedule?: Json | null
          available_spots?: number | null
          created_at?: string
          daily_price?: number | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          one_time_price?: number | null
          owner_id?: string
          price_per_hour?: number | null
          pricing_type?: string
          rating?: number | null
          spot_type?: string
          title?: string
          total_reviews?: number | null
          total_spots?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          cardholder_name: string | null
          created_at: string
          expiry_month: number | null
          expiry_year: number | null
          id: string
          is_default: boolean
          last_four: string
          stripe_payment_method_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cardholder_name?: string | null
          created_at?: string
          expiry_month?: number | null
          expiry_year?: number | null
          id?: string
          is_default?: boolean
          last_four: string
          stripe_payment_method_id?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cardholder_name?: string | null
          created_at?: string
          expiry_month?: number | null
          expiry_year?: number | null
          id?: string
          is_default?: boolean
          last_four?: string
          stripe_payment_method_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_settings: {
        Row: {
          account_holder_name: string | null
          account_number_last_four: string | null
          account_type: string | null
          bank_name: string | null
          created_at: string
          id: string
          is_verified: boolean
          onboarding_completed: boolean | null
          payouts_enabled: boolean | null
          routing_number: string | null
          stripe_account_id: string | null
          stripe_connect_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number_last_four?: string | null
          account_type?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          onboarding_completed?: boolean | null
          payouts_enabled?: boolean | null
          routing_number?: string | null
          stripe_account_id?: string | null
          stripe_connect_account_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder_name?: string | null
          account_number_last_four?: string | null
          account_type?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          onboarding_completed?: boolean | null
          payouts_enabled?: boolean | null
          routing_number?: string | null
          stripe_account_id?: string | null
          stripe_connect_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      penalties: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          description: string
          id: string
          penalty_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          description: string
          id?: string
          penalty_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          description?: string
          id?: string
          penalty_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "penalties_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      penalty_credits: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          credit_type: string
          description: string
          expires_at: string | null
          forgiven_reason: string | null
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          credit_type?: string
          description: string
          expires_at?: string | null
          forgiven_reason?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          credit_type?: string
          description?: string
          expires_at?: string | null
          forgiven_reason?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "penalty_credits_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          address: string | null
          category: string
          created_at: string
          id: string
          latitude: number
          longitude: number
          name: string
          subcategory: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          category: string
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          name: string
          subcategory?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: string
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          subcategory?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          failed_checkouts: number | null
          full_name: string | null
          id: string
          last_violation_at: string | null
          phone: string | null
          successful_checkouts: number | null
          total_penalty_credits: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          failed_checkouts?: number | null
          full_name?: string | null
          id?: string
          last_violation_at?: string | null
          phone?: string | null
          successful_checkouts?: number | null
          total_penalty_credits?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          failed_checkouts?: number | null
          full_name?: string | null
          id?: string
          last_violation_at?: string | null
          phone?: string | null
          successful_checkouts?: number | null
          total_penalty_credits?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          admin_notes: string | null
          amount: number
          booking_id: string
          created_at: string
          id: string
          processed_at: string | null
          reason: string
          status: string
          stripe_refund_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          booking_id: string
          created_at?: string
          id?: string
          processed_at?: string | null
          reason: string
          status?: string
          stripe_refund_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          processed_at?: string | null
          reason?: string
          status?: string
          stripe_refund_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          id: string
          photo_url: string | null
          rating: number
          reviewed_id: string
          reviewer_id: string
          updated_at: string
          user_type: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          id?: string
          photo_url?: string | null
          rating: number
          reviewed_id: string
          reviewer_id: string
          updated_at?: string
          user_type: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          photo_url?: string | null
          rating?: number
          reviewed_id?: string
          reviewer_id?: string
          updated_at?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assignee_id: string | null
          category: string
          created_at: string
          id: string
          message: string
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assignee_id?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          ticket_number?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assignee_id?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_default: boolean
          license_plate: string
          make: string
          model: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          license_plate: string
          make: string
          model: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          license_plate?: string
          make?: string
          model?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      verification_attempts: {
        Row: {
          attempt_type: string
          booking_id: string
          created_at: string
          failure_reason: string | null
          id: string
          success: boolean | null
          user_id: string
          verification_data: Json | null
        }
        Insert: {
          attempt_type: string
          booking_id: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          success?: boolean | null
          user_id: string
          verification_data?: Json | null
        }
        Update: {
          attempt_type?: string
          booking_id?: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          success?: boolean | null
          user_id?: string
          verification_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_attempts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      daily_analytics: {
        Row: {
          avg_booking_value: number | null
          date: string | null
          spots_used: number | null
          total_bookings: number | null
          total_revenue: number | null
          unique_renters: number | null
        }
        Relationships: []
      }
      owner_analytics: {
        Row: {
          address: string | null
          avg_booking_value: number | null
          current_month_bookings: number | null
          current_month_earnings: number | null
          last_month_bookings: number | null
          last_month_earnings: number | null
          owner_id: string | null
          spot_id: string | null
          title: string | null
          total_bookings: number | null
          total_earnings: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      auto_resolve_disputes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      current_user_has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      get_safe_profile_info: {
        Args: { profile_user_id: string }
        Returns: {
          avatar_url: string
          full_name: string
        }[]
      }
      get_unread_message_count: {
        Args: { booking_id_param: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_v2: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          p_action: string
          p_details?: Json
          p_target_resource?: string
          p_target_user_id?: string
        }
        Returns: string
      }
      log_security_event: {
        Args: { p_event_data?: Json; p_event_type: string; p_user_id?: string }
        Returns: string
      }
      log_security_event_enhanced: {
        Args: {
          p_event_data?: Json
          p_event_type: string
          p_severity?: string
          p_user_id?: string
        }
        Returns: string
      }
      manual_charge_penalty: {
        Args: { penalty_credit_id_param: string }
        Returns: Json
      }
      manual_charge_penalty_v2: {
        Args: { penalty_credit_id_param: string }
        Returns: Json
      }
      manual_check_late_checkouts: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      manual_check_late_checkouts_v2: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      mark_message_as_read: {
        Args: { message_id: string }
        Returns: undefined
      }
      refresh_analytics_views: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      user_involved_in_booking: {
        Args: { booking_id_param: string }
        Returns: boolean
      }
      user_owns_spot: {
        Args: { spot_id_param: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
