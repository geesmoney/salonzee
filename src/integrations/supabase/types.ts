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
      salons: {
        Row: {
          created_at: string
          description: string | null
          email: string
          id: string
          location_area: string
          location_city: string
          name: string
          operating_hours: Json
          owner_name: string
          phone: string
          profile_photo_url: string | null
          salon_type: Database["public"]["Enums"]["salon_type"]
          slot_duration_minutes: number
          slug: string | null
          status: Database["public"]["Enums"]["salon_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          email: string
          id?: string
          location_area: string
          location_city: string
          name: string
          operating_hours?: Json
          owner_name: string
          phone: string
          profile_photo_url?: string | null
          salon_type?: Database["public"]["Enums"]["salon_type"]
          slot_duration_minutes?: number
          slug?: string | null
          status?: Database["public"]["Enums"]["salon_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          email?: string
          id?: string
          location_area?: string
          location_city?: string
          name?: string
          operating_hours?: Json
          owner_name?: string
          phone?: string
          profile_photo_url?: string | null
          salon_type?: Database["public"]["Enums"]["salon_type"]
          slot_duration_minutes?: number
          slug?: string | null
          status?: Database["public"]["Enums"]["salon_status"]
          updated_at?: string
          user_id?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "platform_admin" | "salon_admin"
      booking_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "no_show"
        | "cancelled"
      salon_status: "pending" | "active" | "suspended"
      salon_type: "male" | "female" | "unisex"
      sms_status: "queued" | "sent" | "failed" | "stubbed"
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
      app_role: ["platform_admin", "salon_admin"],
      booking_status: [
        "pending",
        "confirmed",
        "completed",
        "no_show",
        "cancelled",
      ],
      salon_status: ["pending", "active", "suspended"],
      salon_type: ["male", "female", "unisex"],
      sms_status: ["queued", "sent", "failed", "stubbed"],
    },
  },
} as const
