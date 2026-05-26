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
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          invite_code: string
          name: string
          region_label: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          invite_code?: string
          name: string
          region_label?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          invite_code?: string
          name?: string
          region_label?: string | null
        }
        Relationships: []
      }
      offers: {
        Row: {
          active: boolean
          area_label: string | null
          created_at: string
          description: string
          group_id: string | null
          id: string
          offer_type: string
          offerer_id: string
        }
        Insert: {
          active?: boolean
          area_label?: string | null
          created_at?: string
          description: string
          group_id?: string | null
          id?: string
          offer_type: string
          offerer_id: string
        }
        Update: {
          active?: boolean
          area_label?: string | null
          created_at?: string
          description?: string
          group_id?: string | null
          id?: string
          offer_type?: string
          offerer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          alias: string
          created_at: string
          id: string
          trusted_contact: string | null
          updated_at: string
        }
        Insert: {
          alias?: string
          created_at?: string
          id: string
          trusted_contact?: string | null
          updated_at?: string
        }
        Update: {
          alias?: string
          created_at?: string
          id?: string
          trusted_contact?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      request_claims: {
        Row: {
          created_at: string
          id: string
          meetup_point: string | null
          meetup_type: string | null
          note: string | null
          request_id: string
          status: string
          updated_at: string
          volunteer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meetup_point?: string | null
          meetup_type?: string | null
          note?: string | null
          request_id: string
          status?: string
          updated_at?: string
          volunteer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meetup_point?: string | null
          meetup_type?: string | null
          note?: string | null
          request_id?: string
          status?: string
          updated_at?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_claims_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          area_label: string | null
          created_at: string
          expires_at: string
          group_id: string | null
          help_type: Database["public"]["Enums"]["help_type"]
          id: string
          lat_coarse: number | null
          lat_exact: number | null
          lng_coarse: number | null
          lng_exact: number | null
          notes: string | null
          requester_id: string
          safety_deadline: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          urgency: Database["public"]["Enums"]["urgency_level"]
        }
        Insert: {
          area_label?: string | null
          created_at?: string
          expires_at?: string
          group_id?: string | null
          help_type: Database["public"]["Enums"]["help_type"]
          id?: string
          lat_coarse?: number | null
          lat_exact?: number | null
          lng_coarse?: number | null
          lng_exact?: number | null
          notes?: string | null
          requester_id: string
          safety_deadline?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
        }
        Update: {
          area_label?: string | null
          created_at?: string
          expires_at?: string
          group_id?: string | null
          help_type?: Database["public"]["Enums"]["help_type"]
          id?: string
          lat_coarse?: number | null
          lat_exact?: number | null
          lng_coarse?: number | null
          lng_exact?: number | null
          notes?: string | null
          requester_id?: string
          safety_deadline?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
        }
        Relationships: [
          {
            foreignKeyName: "requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
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
      is_group_member: {
        Args: { _group: string; _user: string }
        Returns: boolean
      }
      is_request_requester: {
        Args: { _req: string; _user: string }
        Returns: boolean
      }
      join_group_by_code: { Args: { _code: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "coordinator" | "volunteer" | "member"
      help_type:
        | "safe_shelter"
        | "secure_travel"
        | "supplies"
        | "medical"
        | "medical_supplies"
        | "legal"
        | "message_relay"
        | "other"
      request_status:
        | "open"
        | "pending_approval"
        | "claimed"
        | "completed"
        | "cancelled"
        | "expired"
      urgency_level: "low" | "medium" | "high"
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
      app_role: ["admin", "coordinator", "volunteer", "member"],
      help_type: [
        "safe_shelter",
        "secure_travel",
        "supplies",
        "medical",
        "medical_supplies",
        "legal",
        "message_relay",
        "other",
      ],
      request_status: [
        "open",
        "pending_approval",
        "claimed",
        "completed",
        "cancelled",
        "expired",
      ],
      urgency_level: ["low", "medium", "high"],
    },
  },
} as const
