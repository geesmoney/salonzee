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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          booking_date: string
          created_at: string
          customer_name: string
          customer_phone: string
          end_time: string
          id: string
          notes: string | null
          price_ghs_snapshot: number
          reminder_sent_at: string | null
          review_reminder_sent_at: string | null
          review_token: string | null
          salon_id: string
          service_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          booking_date: string
          created_at?: string
          customer_name: string
          customer_phone: string
          end_time: string
          id?: string
          notes?: string | null
          price_ghs_snapshot?: number
          reminder_sent_at?: string | null
          review_reminder_sent_at?: string | null
          review_token?: string | null
          salon_id: string
          service_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          booking_date?: string
          created_at?: string
          customer_name?: string
          customer_phone?: string
          end_time?: string
          id?: string
          notes?: string | null
          price_ghs_snapshot?: number
          reminder_sent_at?: string | null
          review_reminder_sent_at?: string | null
          review_token?: string | null
          salon_id?: string
          service_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          active: boolean
          agent_phone: string | null
          code: string
          created_at: string
          id: string
          label: string
          salon_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          agent_phone?: string | null
          code: string
          created_at?: string
          id?: string
          label: string
          salon_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          agent_phone?: string | null
          code?: string
          created_at?: string
          id?: string
          label?: string
          salon_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_rewards: {
        Row: {
          awarded_at: string
          code: string
          id: string
          months_awarded: number
          referral_code_id: string
          referred_salon_id: string
        }
        Insert: {
          awarded_at?: string
          code: string
          id?: string
          months_awarded?: number
          referral_code_id: string
          referred_salon_id: string
        }
        Update: {
          awarded_at?: string
          code?: string
          id?: string
          months_awarded?: number
          referral_code_id?: string
          referred_salon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_referred_salon_id_fkey"
            columns: ["referred_salon_id"]
            isOneToOne: true
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          customer_name: string
          id: string
          rating: number
          salon_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          customer_name: string
          id?: string
          rating: number
          salon_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          rating?: number
          salon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_calendar_tokens: {
        Row: {
          created_at: string
          salon_id: string
          token: string
        }
        Insert: {
          created_at?: string
          salon_id: string
          token?: string
        }
        Update: {
          created_at?: string
          salon_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_calendar_tokens_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: true
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_contacts: {
        Row: {
          created_at: string
          email: string
          owner_name: string
          salon_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          owner_name: string
          salon_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          owner_name?: string
          salon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_contacts_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: true
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          position: number
          salon_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          position?: number
          salon_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          position?: number
          salon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_images_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salons: {
        Row: {
          acquisition_source: string | null
          business_category: Database["public"]["Enums"]["business_category"]
          created_at: string
          description: string | null
          id: string
          location_area: string
          location_city: string
          name: string
          operating_hours: Json
          phone: string
          profile_photo_url: string | null
          referred_by_code: string | null
          rejection_reason: string | null
          salon_type: Database["public"]["Enums"]["salon_type"]
          slot_duration_minutes: number
          slug: string | null
          status: Database["public"]["Enums"]["salon_status"]
          updated_at: string
          user_id: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          acquisition_source?: string | null
          business_category?: Database["public"]["Enums"]["business_category"]
          created_at?: string
          description?: string | null
          id?: string
          location_area: string
          location_city: string
          name: string
          operating_hours?: Json
          phone: string
          profile_photo_url?: string | null
          referred_by_code?: string | null
          rejection_reason?: string | null
          salon_type?: Database["public"]["Enums"]["salon_type"]
          slot_duration_minutes?: number
          slug?: string | null
          status?: Database["public"]["Enums"]["salon_status"]
          updated_at?: string
          user_id?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          acquisition_source?: string | null
          business_category?: Database["public"]["Enums"]["business_category"]
          created_at?: string
          description?: string | null
          id?: string
          location_area?: string
          location_city?: string
          name?: string
          operating_hours?: Json
          phone?: string
          profile_photo_url?: string | null
          referred_by_code?: string | null
          rejection_reason?: string | null
          salon_type?: Database["public"]["Enums"]["salon_type"]
          slot_duration_minutes?: number
          slug?: string | null
          status?: Database["public"]["Enums"]["salon_status"]
          updated_at?: string
          user_id?: string | null
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          created_at: string
          duration_minutes: number
          id: string
          name: string
          price_ghs: number
          salon_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          duration_minutes?: number
          id?: string
          name: string
          price_ghs?: number
          salon_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          duration_minutes?: number
          id?: string
          name?: string
          price_ghs?: number
          salon_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_log: {
        Row: {
          booking_id: string | null
          error_message: string | null
          id: string
          payload: Json
          sent_at: string
          status: Database["public"]["Enums"]["sms_status"]
          template: string
          to_phone: string
        }
        Insert: {
          booking_id?: string | null
          error_message?: string | null
          id?: string
          payload?: Json
          sent_at?: string
          status?: Database["public"]["Enums"]["sms_status"]
          template: string
          to_phone: string
        }
        Update: {
          booking_id?: string | null
          error_message?: string | null
          id?: string
          payload?: Json
          sent_at?: string
          status?: Database["public"]["Enums"]["sms_status"]
          template?: string
          to_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_type: Database["public"]["Enums"]["support_sender_type"]
          sender_user_id: string | null
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_type: Database["public"]["Enums"]["support_sender_type"]
          sender_user_id?: string | null
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_type?: Database["public"]["Enums"]["support_sender_type"]
          sender_user_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          booking_id: string | null
          category: Database["public"]["Enums"]["support_ticket_category"]
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          last_message_at: string
          opened_by_user_id: string | null
          salon_id: string | null
          status: Database["public"]["Enums"]["support_ticket_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          category?: Database["public"]["Enums"]["support_ticket_category"]
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          last_message_at?: string
          opened_by_user_id?: string | null
          salon_id?: string | null
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          category?: Database["public"]["Enums"]["support_ticket_category"]
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          last_message_at?: string
          opened_by_user_id?: string | null
          salon_id?: string | null
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
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
      [_ in never]: never
    }
    Functions: {
      get_review_context: { Args: { _token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      submit_review: {
        Args: { _comment: string; _rating: number; _token: string }
        Returns: Json
      }
      validate_referral_code: { Args: { _code: string }; Returns: Json }
      wa_digits: { Args: { _phone: string }; Returns: string }
    }
    Enums: {
      app_role: "platform_admin" | "salon_admin"
      booking_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "no_show"
        | "cancelled"
      business_category:
        | "hair_salon"
        | "barbershop"
        | "braiding"
        | "nail_tech"
        | "makeup"
        | "lashes_brows"
        | "spa"
        | "other"
      salon_status: "pending" | "active" | "suspended"
      salon_type: "male" | "female" | "unisex"
      sms_status: "queued" | "sent" | "failed" | "stubbed"
      support_sender_type: "owner" | "customer" | "admin"
      support_ticket_category:
        | "general"
        | "billing"
        | "booking_issue"
        | "technical"
        | "other"
      support_ticket_status: "open" | "pending" | "resolved" | "closed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["platform_admin", "salon_admin"],
      booking_status: [
        "pending",
        "confirmed",
        "completed",
        "no_show",
        "cancelled",
      ],
      business_category: [
        "hair_salon",
        "barbershop",
        "braiding",
        "nail_tech",
        "makeup",
        "lashes_brows",
        "spa",
        "other",
      ],
      salon_status: ["pending", "active", "suspended"],
      salon_type: ["male", "female", "unisex"],
      sms_status: ["queued", "sent", "failed", "stubbed"],
      support_sender_type: ["owner", "customer", "admin"],
      support_ticket_category: [
        "general",
        "billing",
        "booking_issue",
        "technical",
        "other",
      ],
      support_ticket_status: ["open", "pending", "resolved", "closed"],
    },
  },
} as const
