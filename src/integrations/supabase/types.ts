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
      announcements: {
        Row: {
          audience: Database["public"]["Enums"]["app_role"][] | null
          author_id: string | null
          body: string
          created_at: string
          id: string
          published: boolean
          tenant_id: string
          title: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["app_role"][] | null
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          published?: boolean
          tenant_id: string
          title: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["app_role"][] | null
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          published?: boolean
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          active: boolean
          assigned_by: string | null
          collector_id: string
          created_at: string
          id: string
          reason: string | null
          report_id: string
          tenant_id: string
        }
        Insert: {
          active?: boolean
          assigned_by?: string | null
          collector_id: string
          created_at?: string
          id?: string
          reason?: string | null
          report_id: string
          tenant_id: string
        }
        Update: {
          active?: boolean
          assigned_by?: string | null
          collector_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          report_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: number
          meta: Json | null
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: number
          meta?: Json | null
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: number
          meta?: Json | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      collector_locations: {
        Row: {
          collector_id: string
          created_at: string
          heading: number | null
          id: string
          lat: number
          lng: number
          tenant_id: string
        }
        Insert: {
          collector_id: string
          created_at?: string
          heading?: number | null
          id?: string
          lat: number
          lng: number
          tenant_id: string
        }
        Update: {
          collector_id?: string
          created_at?: string
          heading?: number | null
          id?: string
          lat?: number
          lng?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collector_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      garbage_categories: {
        Row: {
          active: boolean
          color: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "garbage_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email: boolean
          push: boolean
          sms: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email?: boolean
          push?: boolean
          sms?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email?: boolean
          push?: boolean
          sms?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          active: boolean
          body: string
          channel: Database["public"]["Enums"]["channel"]
          id: string
          key: string
          subject: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          body: string
          channel: Database["public"]["Enums"]["channel"]
          id?: string
          key: string
          subject?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string
          channel?: Database["public"]["Enums"]["channel"]
          id?: string
          key?: string
          subject?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          tenant_id: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          tenant_id: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          tenant_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      obstacles: {
        Row: {
          collector_id: string
          created_at: string
          description: string
          id: string
          report_id: string
          tenant_id: string
        }
        Insert: {
          collector_id: string
          created_at?: string
          description: string
          id?: string
          report_id: string
          tenant_id: string
        }
        Update: {
          collector_id?: string
          created_at?: string
          description?: string
          id?: string
          report_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obstacles_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obstacles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      priorities: {
        Row: {
          active: boolean
          color: string
          created_at: string
          id: string
          level: number
          name: string
          sla_minutes: number
          tenant_id: string
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          level: number
          name: string
          sla_minutes?: number
          tenant_id: string
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          level?: number
          name?: string
          sla_minutes?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "priorities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      report_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          report_id: string
          tenant_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          report_id: string
          tenant_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          report_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_comments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      report_events: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["report_status"] | null
          id: string
          note: string | null
          report_id: string
          tenant_id: string
          to_status: Database["public"]["Enums"]["report_status"] | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["report_status"] | null
          id?: string
          note?: string | null
          report_id: string
          tenant_id: string
          to_status?: Database["public"]["Enums"]["report_status"] | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["report_status"] | null
          id?: string
          note?: string | null
          report_id?: string
          tenant_id?: string
          to_status?: Database["public"]["Enums"]["report_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "report_events_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      report_photos: {
        Row: {
          created_at: string
          id: string
          kind: string
          report_id: string
          storage_path: string
          tenant_id: string
          uploader_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          report_id: string
          storage_path: string
          tenant_id: string
          uploader_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          report_id?: string
          storage_path?: string
          tenant_id?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_photos_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_photos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      report_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rater_id: string
          report_id: string
          stars: number
          tenant_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rater_id: string
          report_id: string
          stars: number
          tenant_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rater_id?: string
          report_id?: string
          stars?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_ratings_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_ratings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          accepted_at: string | null
          address: string | null
          assigned_at: string | null
          assigned_collector_id: string | null
          category_id: string | null
          completed_at: string | null
          contact_phone: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          lat: number
          lng: number
          priority_id: string | null
          reporter_id: string
          size: Database["public"]["Enums"]["report_size"]
          sla_deadline: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["report_status"]
          supervisor_id: string | null
          tenant_id: string
          title: string
          updated_at: string
          urgent: boolean
          verified_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          address?: string | null
          assigned_at?: string | null
          assigned_collector_id?: string | null
          category_id?: string | null
          completed_at?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          lat: number
          lng: number
          priority_id?: string | null
          reporter_id: string
          size?: Database["public"]["Enums"]["report_size"]
          sla_deadline?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          supervisor_id?: string | null
          tenant_id: string
          title: string
          updated_at?: string
          urgent?: boolean
          verified_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          address?: string | null
          assigned_at?: string | null
          assigned_collector_id?: string | null
          category_id?: string | null
          completed_at?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          lat?: number
          lng?: number
          priority_id?: string | null
          reporter_id?: string
          size?: Database["public"]["Enums"]["report_size"]
          sla_deadline?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          supervisor_id?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
          urgent?: boolean
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "garbage_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "priorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          tenant_id: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          tenant_id: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          tenant_id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          active: boolean
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          active: boolean
          center_lat: number
          center_lng: number
          created_at: string
          default_zoom: number
          id: string
          logo_path: string | null
          name: string
          settings: Json
          slug: string
          timezone: string
          updated_at: string
          working_hours: Json
        }
        Insert: {
          active?: boolean
          center_lat?: number
          center_lng?: number
          created_at?: string
          default_zoom?: number
          id?: string
          logo_path?: string | null
          name: string
          settings?: Json
          slug: string
          timezone?: string
          updated_at?: string
          working_hours?: Json
        }
        Update: {
          active?: boolean
          center_lat?: number
          center_lng?: number
          created_at?: string
          default_zoom?: number
          id?: string
          logo_path?: string | null
          name?: string
          settings?: Json
          slug?: string
          timezone?: string
          updated_at?: string
          working_hours?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_tenant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant: string
          _uid: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _uid: string }; Returns: boolean }
      is_tenant_admin: {
        Args: { _tenant: string; _uid: string }
        Returns: boolean
      }
      is_tenant_member: {
        Args: { _tenant: string; _uid: string }
        Returns: boolean
      }
      is_tenant_staff: {
        Args: { _tenant: string; _uid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "resident"
        | "collector"
        | "supervisor"
        | "administrator"
        | "super_admin"
      channel: "in_app" | "email" | "sms" | "push"
      report_size: "small" | "medium" | "large" | "extra_large"
      report_status:
        | "submitted"
        | "assigned"
        | "accepted"
        | "travelling"
        | "working"
        | "completed"
        | "verified"
        | "rejected"
        | "cancelled"
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
      app_role: [
        "resident",
        "collector",
        "supervisor",
        "administrator",
        "super_admin",
      ],
      channel: ["in_app", "email", "sms", "push"],
      report_size: ["small", "medium", "large", "extra_large"],
      report_status: [
        "submitted",
        "assigned",
        "accepted",
        "travelling",
        "working",
        "completed",
        "verified",
        "rejected",
        "cancelled",
      ],
    },
  },
} as const
