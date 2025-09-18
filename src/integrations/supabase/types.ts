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
          auto_extend_enabled: boolean | null
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
          end_time_utc: string | null
          id: string
          owner_payout_amount: number | null
          payment_intent_id: string | null
          platform_fee_amount: number | null
          qr_code_used: boolean | null
          renter_id: string
          spot_id: string
          start_time: string
          start_time_utc: string | null
          status: string
          stripe_transfer_id: string | null
          total_amount: number
          updated_at: string
          verification_score: number | null
        }
        Insert: {
          auto_extend_enabled?: boolean | null
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
          end_time_utc?: string | null
          id?: string
          owner_payout_amount?: number | null
          payment_intent_id?: string | null
          platform_fee_amount?: number | null
          qr_code_used?: boolean | null
          renter_id: string
          spot_id: string
          start_time: string
          start_time_utc?: string | null
          status?: string
          stripe_transfer_id?: string | null
          total_amount: number
          updated_at?: string
          verification_score?: number | null
        }
        Update: {
          auto_extend_enabled?: boolean | null
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
          end_time_utc?: string | null
          id?: string
          owner_payout_amount?: number | null
          payment_intent_id?: string | null
          platform_fee_amount?: number | null
          qr_code_used?: boolean | null
          renter_id?: string
          spot_id?: string
          start_time?: string
          start_time_utc?: string | null
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
          {
            foreignKeyName: "bookings_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "public_parking_spots"
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
          approved_at: string | null
          booking_id: string
          created_at: string
          id: string
          new_end_time: string | null
          rate_per_hour: number
          requested_hours: number
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          booking_id: string
          created_at?: string
          id?: string
          new_end_time?: string | null
          rate_per_hour: number
          requested_hours: number
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          new_end_time?: string | null
          rate_per_hour?: number
          requested_hours?: number
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
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
          monthly_price: number | null
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
          monthly_price?: number | null
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
          monthly_price?: number | null
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
      premium_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
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
      public_parking_spots: {
        Row: {
          address: string | null
          amenities: string[] | null
          available_spots: number | null
          created_at: string | null
          daily_price: number | null
          description: string | null
          id: string | null
          images: string[] | null
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          monthly_price: number | null
          one_time_price: number | null
          price_per_hour: number | null
          pricing_type: string | null
          rating: number | null
          spot_type: string | null
          title: string | null
          total_reviews: number | null
          total_spots: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          available_spots?: number | null
          created_at?: string | null
          daily_price?: number | null
          description?: string | null
          id?: string | null
          images?: string[] | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          monthly_price?: number | null
          one_time_price?: number | null
          price_per_hour?: number | null
          pricing_type?: string | null
          rating?: number | null
          spot_type?: string | null
          title?: string | null
          total_reviews?: number | null
          total_spots?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          available_spots?: number | null
          created_at?: string | null
          daily_price?: number | null
          description?: string | null
          id?: string | null
          images?: string[] | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          monthly_price?: number | null
          one_time_price?: number | null
          price_per_hour?: number | null
          pricing_type?: string | null
          rating?: number | null
          spot_type?: string | null
          title?: string | null
          total_reviews?: number | null
          total_spots?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_data_retention_policies: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      auto_resolve_disputes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      check_booking_overlap: {
        Args: {
          p_end_time: string
          p_exclude_booking_id?: string
          p_spot_id: string
          p_start_time: string
        }
        Returns: boolean
      }
      check_rate_limit_parking_access: {
        Args: { p_ip_address?: unknown; p_user_id?: string }
        Returns: boolean
      }
      current_user_has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      detect_scraping_patterns: {
        Args: Record<PropertyKey, never>
        Returns: {
          first_request: string
          ip_address: unknown
          last_request: string
          request_count: number
          risk_score: number
        }[]
      }
      format_booking_time_display: {
        Args: {
          end_time_param: string
          pricing_type_param: string
          start_time_param: string
        }
        Returns: {
          display_date: string
          display_duration_text: string
          display_end_time: string
          display_start_time: string
        }[]
      }
      get_available_time_slots: {
        Args: {
          p_date: string
          p_duration_hours?: number
          p_spot_id: string
          p_timezone?: string
        }
        Returns: string
      }
      get_booking_owner_info: {
        Args: { booking_id_param: string }
        Returns: {
          owner_id: string
          owner_name: string
          owner_phone: string
        }[]
      }
      get_booking_spot_details: {
        Args: { booking_id_param: string; spot_id_param: string }
        Returns: {
          address: string
          daily_price: number
          id: string
          monthly_price: number
          owner_id: string
          price_per_hour: number
          pricing_type: string
          title: string
        }[]
      }
      get_display_name_for_booking: {
        Args: { booking_id_param: string; target_user_id: string }
        Returns: string
      }
      get_masked_banking_info: {
        Args: { p_user_id: string }
        Returns: {
          account_last_four: string
          account_type: string
          bank_name: string
          id: string
          is_verified: boolean
          onboarding_completed: boolean
          payouts_enabled: boolean
        }[]
      }
      get_masked_vehicle_data: {
        Args: { p_user_id: string }
        Returns: {
          color: string
          created_at: string
          id: string
          is_default: boolean
          license_plate_masked: string
          make: string
          model: string
          year: number
        }[]
      }
      get_minimal_public_profile: {
        Args: { user_id_param: string }
        Returns: {
          display_name: string
        }[]
      }
      get_platform_fee_rate: {
        Args: { user_id_param: string }
        Returns: number
      }
      get_potential_scraping_activity: {
        Args: Record<PropertyKey, never>
        Returns: {
          first_request: string
          ip_address: unknown
          last_request: string
          request_count: number
          risk_level: string
          user_id: string
        }[]
      }
      get_premium_status_for_owners: {
        Args: { owner_ids: string[] }
        Returns: {
          is_premium: boolean
          user_id: string
        }[]
      }
      get_public_parking_spot_info: {
        Args: { spot_id_param: string }
        Returns: {
          address: string
          amenities: string[]
          available_spots: number
          daily_price: number
          description: string
          id: string
          images: string[]
          latitude: number
          longitude: number
          monthly_price: number
          one_time_price: number
          price_per_hour: number
          pricing_type: string
          rating: number
          spot_type: string
          title: string
          total_reviews: number
          total_spots: number
        }[]
      }
      get_public_profile_data: {
        Args: { user_id_param: string }
        Returns: {
          avatar_url: string
          full_name: string
        }[]
      }
      get_public_spot_listings: {
        Args: Record<PropertyKey, never>
        Returns: {
          address: string
          amenities: string[]
          available_spots: number
          created_at: string
          daily_price: number
          description: string
          id: string
          images: string[]
          is_active: boolean
          latitude: number
          longitude: number
          monthly_price: number
          one_time_price: number
          price_per_hour: number
          pricing_type: string
          rating: number
          spot_type: string
          title: string
          total_reviews: number
          total_spots: number
          updated_at: string
        }[]
      }
      get_safe_parking_spot_data: {
        Args: { spot_id_param: string }
        Returns: {
          address: string
          amenities: string[]
          available_spots: number
          daily_price: number
          description: string
          id: string
          images: string[]
          latitude: number
          longitude: number
          monthly_price: number
          one_time_price: number
          price_per_hour: number
          pricing_type: string
          rating: number
          spot_type: string
          title: string
          total_reviews: number
          total_spots: number
        }[]
      }
      get_safe_profile_for_booking: {
        Args: { booking_id_param: string }
        Returns: {
          avatar_url: string
          full_name: string
        }[]
      }
      get_safe_profile_info: {
        Args: { profile_user_id: string }
        Returns: {
          avatar_url: string
          full_name: string
        }[]
      }
      get_secure_parking_listings: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          address: string
          amenities: string[]
          available_spots: number
          created_at: string
          daily_price: number
          description: string
          id: string
          images: string[]
          is_active: boolean
          latitude: number
          longitude: number
          monthly_price: number
          one_time_price: number
          price_per_hour: number
          pricing_type: string
          rating: number
          spot_type: string
          title: string
          total_reviews: number
          total_spots: number
        }[]
      }
      get_secure_parking_spot_detail: {
        Args: { spot_id_param: string }
        Returns: {
          access_instructions: string
          address: string
          amenities: string[]
          available_spots: number
          daily_price: number
          description: string
          id: string
          images: string[]
          latitude: number
          longitude: number
          monthly_price: number
          one_time_price: number
          price_per_hour: number
          pricing_type: string
          rating: number
          spot_type: string
          title: string
          total_reviews: number
          total_spots: number
        }[]
      }
      get_secure_payout_settings: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          onboarding_completed: boolean
          payouts_enabled: boolean
          stripe_connect_account_id: string
          user_id: string
        }[]
      }
      get_session_payment_intent: {
        Args: { session_id_param: string }
        Returns: string
      }
      get_spot_owner_for_booking: {
        Args: { booking_id_param: string; spot_id_param: string }
        Returns: {
          owner_id: string
        }[]
      }
      get_spot_owner_for_involved_users: {
        Args: { spot_id_param: string }
        Returns: {
          owner_id: string
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
      is_premium_lister: {
        Args: { lister_user_id: string }
        Returns: boolean
      }
      is_spot_owner_premium: {
        Args: { spot_owner_id: string }
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
      log_admin_banking_access: {
        Args: {
          p_action: string
          p_payout_setting_id: string
          p_reason?: string
        }
        Returns: undefined
      }
      log_api_access: {
        Args: {
          endpoint_name: string
          ip_address_param?: unknown
          user_id_param?: string
        }
        Returns: undefined
      }
      log_data_access: {
        Args: { operation: string; record_count?: number; table_name: string }
        Returns: undefined
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
      log_sensitive_data_access: {
        Args: {
          p_operation: string
          p_record_id?: string
          p_table_name: string
          p_user_id?: string
        }
        Returns: undefined
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
      mask_license_plate: {
        Args: { plate_text: string }
        Returns: string
      }
      refresh_analytics_views: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      test_slot_availability: {
        Args: { p_date: string; p_slot_time: string; p_spot_id: string }
        Returns: Json
      }
      user_involved_in_booking: {
        Args: { booking_id_param: string }
        Returns: boolean
      }
      user_owns_spot: {
        Args: { spot_id_param: string }
        Returns: boolean
      }
      validate_enhanced_financial_access: {
        Args: {
          p_resource_id: string
          p_resource_type: string
          p_user_id: string
        }
        Returns: boolean
      }
      validate_financial_access: {
        Args: {
          p_resource_id: string
          p_resource_type: string
          p_user_id: string
        }
        Returns: boolean
      }
      validate_sensitive_data_access: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      validate_stripe_account_ownership: {
        Args: { account_id: string; user_id_param: string }
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
