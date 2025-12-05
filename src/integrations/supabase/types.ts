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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      channel_rate_items: {
        Row: {
          country: string
          created_at: string | null
          currency: string | null
          eta: string | null
          id: number
          price: number
          sheet_id: number | null
          weight_from: number
          weight_to: number
          zone: string | null
        }
        Insert: {
          country: string
          created_at?: string | null
          currency?: string | null
          eta?: string | null
          id?: number
          price: number
          sheet_id?: number | null
          weight_from: number
          weight_to: number
          zone?: string | null
        }
        Update: {
          country?: string
          created_at?: string | null
          currency?: string | null
          eta?: string | null
          id?: number
          price?: number
          sheet_id?: number | null
          weight_from?: number
          weight_to?: number
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_rate_items_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "channel_rate_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_rate_sheets: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          approved_at: string | null
          approved_by: string | null
          batch_id: number | null
          channel_id: number | null
          created_at: string | null
          effective_date: string
          file_name: string | null
          id: number
          rejection_reason: string | null
          status: string | null
          updated_at: string | null
          uploaded_by: string | null
          version_code: string
        }
        Insert: {
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          batch_id?: number | null
          channel_id?: number | null
          created_at?: string | null
          effective_date: string
          file_name?: string | null
          id?: number
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          version_code: string
        }
        Update: {
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          batch_id?: number | null
          channel_id?: number | null
          created_at?: string | null
          effective_date?: string
          file_name?: string | null
          id?: number
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          version_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_rate_sheets_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "vendor_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_rate_sheets_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "shipping_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      effective_versions: {
        Row: {
          batch_id: number | null
          channel_id: number | null
          created_at: string | null
          effective_date: string
          id: number
          is_active: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          version_code: string
        }
        Insert: {
          batch_id?: number | null
          channel_id?: number | null
          created_at?: string | null
          effective_date: string
          id?: number
          is_active?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          version_code: string
        }
        Update: {
          batch_id?: number | null
          channel_id?: number | null
          created_at?: string | null
          effective_date?: string
          id?: number
          is_active?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          version_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "effective_versions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "vendor_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "effective_versions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "shipping_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_channels: {
        Row: {
          channel_code: string
          conditional_rules: Json | null
          created_at: string | null
          currency: string | null
          dimension_limit_notes: string | null
          id: number
          max_height: number | null
          max_length: number | null
          max_single_side: number | null
          max_weight: number | null
          max_width: number | null
          name: string
          region: string | null
          service_type: string | null
          updated_at: string | null
          vendor_id: number | null
          volume_weight_divisor: number | null
        }
        Insert: {
          channel_code: string
          conditional_rules?: Json | null
          created_at?: string | null
          currency?: string | null
          dimension_limit_notes?: string | null
          id?: number
          max_height?: number | null
          max_length?: number | null
          max_single_side?: number | null
          max_weight?: number | null
          max_width?: number | null
          name: string
          region?: string | null
          service_type?: string | null
          updated_at?: string | null
          vendor_id?: number | null
          volume_weight_divisor?: number | null
        }
        Update: {
          channel_code?: string
          conditional_rules?: Json | null
          created_at?: string | null
          currency?: string | null
          dimension_limit_notes?: string | null
          id?: number
          max_height?: number | null
          max_length?: number | null
          max_single_side?: number | null
          max_weight?: number | null
          max_width?: number | null
          name?: string
          region?: string | null
          service_type?: string | null
          updated_at?: string | null
          vendor_id?: number | null
          volume_weight_divisor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_channels_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_batches: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          approved_at: string | null
          approved_by: string | null
          batch_code: string | null
          effective_date: string | null
          file_name: string
          id: number
          notes: string | null
          rejection_reason: string | null
          total_channels: number | null
          uploaded_at: string | null
          uploaded_by: string | null
          vendor_id: number | null
        }
        Insert: {
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          batch_code?: string | null
          effective_date?: string | null
          file_name: string
          id?: number
          notes?: string | null
          rejection_reason?: string | null
          total_channels?: number | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          vendor_id?: number | null
        }
        Update: {
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          batch_code?: string | null
          effective_date?: string | null
          file_name?: string
          id?: number
          notes?: string | null
          rejection_reason?: string | null
          total_channels?: number | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          vendor_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_batches_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          code: string
          contact_info: string | null
          created_at: string | null
          id: number
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          contact_info?: string | null
          created_at?: string | null
          id?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          contact_info?: string | null
          created_at?: string | null
          id?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_version_code: { Args: { p_channel_id: number }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "rate_supervisor" | "user"
      approval_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "rate_supervisor", "user"],
      approval_status: ["pending", "approved", "rejected"],
    },
  },
} as const
