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
      certificates: {
        Row: {
          auth_code: string
          brand: string | null
          claim_token: string
          claimed_at: string | null
          colorway: string | null
          condition: string
          created_at: string
          current_owner: string | null
          id: string
          image_url: string | null
          is_published: boolean
          notes: string | null
          owner_masked: string | null
          owner_user_id: string | null
          product_name: string
          purchase_date: string | null
          shopify_line_item_id: string | null
          shopify_order_id: string | null
          shopify_order_name: string | null
          size: string | null
          updated_at: string
          verified_date: string
        }
        Insert: {
          auth_code: string
          brand?: string | null
          claim_token?: string
          claimed_at?: string | null
          colorway?: string | null
          condition?: string
          created_at?: string
          current_owner?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          notes?: string | null
          owner_masked?: string | null
          owner_user_id?: string | null
          product_name: string
          purchase_date?: string | null
          shopify_line_item_id?: string | null
          shopify_order_id?: string | null
          shopify_order_name?: string | null
          size?: string | null
          updated_at?: string
          verified_date?: string
        }
        Update: {
          auth_code?: string
          brand?: string | null
          claim_token?: string
          claimed_at?: string | null
          colorway?: string | null
          condition?: string
          created_at?: string
          current_owner?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          notes?: string | null
          owner_masked?: string | null
          owner_user_id?: string | null
          product_name?: string
          purchase_date?: string | null
          shopify_line_item_id?: string | null
          shopify_order_id?: string | null
          shopify_order_name?: string | null
          size?: string | null
          updated_at?: string
          verified_date?: string
        }
        Relationships: []
      }
      ownership_history: {
        Row: {
          certificate_id: string
          created_at: string
          id: string
          kind: string
          note: string | null
          owner_handle: string
          owner_user_id: string | null
          transferred_at: string
        }
        Insert: {
          certificate_id: string
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          owner_handle: string
          owner_user_id?: string | null
          transferred_at?: string
        }
        Update: {
          certificate_id?: string
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          owner_handle?: string
          owner_user_id?: string | null
          transferred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ownership_history_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      shopify_orders: {
        Row: {
          created_at: string
          customer_email: string | null
          id: string
          order_name: string | null
          payload: Json
          processed_at: string | null
          shopify_order_id: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          id?: string
          order_name?: string | null
          payload?: Json
          processed_at?: string | null
          shopify_order_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          id?: string
          order_name?: string | null
          payload?: Json
          processed_at?: string | null
          shopify_order_id?: string
        }
        Relationships: []
      }
      transfer_requests: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          attempts: number
          certificate_id: string
          code_hash: string
          created_at: string
          expires_at: string
          from_user_id: string | null
          id: string
          status: string
          to_email: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          attempts?: number
          certificate_id: string
          code_hash: string
          created_at?: string
          expires_at?: string
          from_user_id?: string | null
          id?: string
          status?: string
          to_email: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          attempts?: number
          certificate_id?: string
          code_hash?: string
          created_at?: string
          expires_at?: string
          from_user_id?: string | null
          id?: string
          status?: string
          to_email?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_requests_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
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
      get_claim_token: { Args: { _certificate_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
