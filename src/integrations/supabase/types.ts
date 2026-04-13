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
      allocation_rules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          rule_name: string
          rule_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          rule_name: string
          rule_value: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          rule_name?: string
          rule_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          table_name: string
          target_user_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          table_name: string
          target_user_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          table_name?: string
          target_user_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      duplication_thresholds: {
        Row: {
          created_at: string
          id: string
          level: string
          max_score: number
          min_score: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: string
          max_score: number
          min_score: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          max_score?: number
          min_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      group_allocations: {
        Row: {
          created_at: string
          group_id: string
          id: string
          match_reason: string | null
          match_score: number | null
          status: string
          supervisor_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          match_reason?: string | null
          match_score?: number | null
          status?: string
          supervisor_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          match_reason?: string | null
          match_score?: number | null
          status?: string
          supervisor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_allocations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "student_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          full_name: string | null
          group_id: string
          id: string
          joined_at: string
          reg_number: string | null
          student_id: string | null
        }
        Insert: {
          full_name?: string | null
          group_id: string
          id?: string
          joined_at?: string
          reg_number?: string | null
          student_id?: string | null
        }
        Update: {
          full_name?: string | null
          group_id?: string
          id?: string
          joined_at?: string
          reg_number?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "student_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_milestones: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          group_id: string
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          group_id: string
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          group_id?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_milestones_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "student_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string
          description: string | null
          group_id: string | null
          id: string
          meeting_date: string
          meeting_link: string | null
          meeting_time: string | null
          status: string
          student_id: string | null
          supervisor_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          meeting_date: string
          meeting_link?: string | null
          meeting_time?: string | null
          status?: string
          student_id?: string | null
          supervisor_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          meeting_date?: string
          meeting_link?: string | null
          meeting_time?: string | null
          status?: string
          student_id?: string | null
          supervisor_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "student_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_updates: {
        Row: {
          created_at: string
          created_by: string
          id: string
          milestone_id: string
          update_text: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          milestone_id: string
          update_text: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          milestone_id?: string
          update_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_updates_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "group_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_allocations: {
        Row: {
          created_at: string
          id: string
          match_reason: string | null
          match_score: number | null
          project_id: string
          status: string
          supervisor_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_reason?: string | null
          match_score?: number | null
          project_id: string
          status?: string
          supervisor_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_reason?: string | null
          match_score?: number | null
          project_id?: string
          status?: string
          supervisor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      phase_templates: {
        Row: {
          created_at: string
          created_by: string
          default_duration_days: number | null
          description: string | null
          id: string
          name: string
          order_index: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          default_duration_days?: number | null
          description?: string | null
          id?: string
          name: string
          order_index?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          default_duration_days?: number | null
          description?: string | null
          id?: string
          name?: string
          order_index?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_projects: number | null
          department: string | null
          email: string
          full_name: string | null
          id: string
          max_projects: number | null
          office_hours: string | null
          phone_number: string | null
          research_areas: string[] | null
          school: string | null
          updated_at: string
          user_id: string
          user_type: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_projects?: number | null
          department?: string | null
          email: string
          full_name?: string | null
          id?: string
          max_projects?: number | null
          office_hours?: string | null
          phone_number?: string | null
          research_areas?: string[] | null
          school?: string | null
          updated_at?: string
          user_id: string
          user_type: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_projects?: number | null
          department?: string | null
          email?: string
          full_name?: string | null
          id?: string
          max_projects?: number | null
          office_hours?: string | null
          phone_number?: string | null
          research_areas?: string[] | null
          school?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      project_documents: {
        Row: {
          created_at: string
          description: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          project_id: string
          uploaded_by: string
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          project_id: string
          uploaded_by: string
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          project_id?: string
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_phases: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          order_index: number
          progress: number
          project_id: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          order_index?: number
          progress?: number
          project_id: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          order_index?: number
          progress?: number
          project_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_revisions: {
        Row: {
          change_notes: string | null
          description: string
          document_url: string | null
          id: string
          project_id: string
          revised_at: string
          revised_by: string
          revision_number: number
          title: string
        }
        Insert: {
          change_notes?: string | null
          description: string
          document_url?: string | null
          id?: string
          project_id: string
          revised_at?: string
          revised_by: string
          revision_number: number
          title: string
        }
        Update: {
          change_notes?: string | null
          description?: string
          document_url?: string | null
          id?: string
          project_id?: string
          revised_at?: string
          revised_by?: string
          revision_number?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_revisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          department: string | null
          description: string
          document_url: string | null
          id: string
          is_duplicate: boolean | null
          keywords: string[] | null
          objectives: string | null
          rejection_reason: string | null
          similarity_score: number | null
          status: string
          student_id: string
          supervisor_id: string | null
          title: string
          updated_at: string
          year: number | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          description: string
          document_url?: string | null
          id?: string
          is_duplicate?: boolean | null
          keywords?: string[] | null
          objectives?: string | null
          rejection_reason?: string | null
          similarity_score?: number | null
          status?: string
          student_id: string
          supervisor_id?: string | null
          title: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          department?: string | null
          description?: string
          document_url?: string | null
          id?: string
          is_duplicate?: boolean | null
          keywords?: string[] | null
          objectives?: string | null
          rejection_reason?: string | null
          similarity_score?: number | null
          status?: string
          student_id?: string
          supervisor_id?: string | null
          title?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      schools: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_groups: {
        Row: {
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          id: string
          name: string
          project_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          name: string
          project_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          name?: string
          project_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          created_at: string
          department: string | null
          id: string
          school: string | null
          student_number: string | null
          updated_at: string
          user_id: string
          year_of_study: number | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          school?: string | null
          student_number?: string | null
          updated_at?: string
          user_id: string
          year_of_study?: number | null
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          school?: string | null
          student_number?: string | null
          updated_at?: string
          user_id?: string
          year_of_study?: number | null
        }
        Relationships: []
      }
      supervisor_feedback: {
        Row: {
          content: string
          created_at: string
          document_id: string | null
          feedback_type: string
          id: string
          phase_id: string | null
          project_id: string
          rating: number | null
          supervisor_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          document_id?: string | null
          feedback_type?: string
          id?: string
          phase_id?: string | null
          project_id: string
          rating?: number | null
          supervisor_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          document_id?: string | null
          feedback_type?: string
          id?: string
          phase_id?: string | null
          project_id?: string
          rating?: number | null
          supervisor_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_feedback_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "project_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_feedback_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "project_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisor_feedback_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisors: {
        Row: {
          created_at: string
          current_projects: number | null
          department: string | null
          id: string
          max_projects: number | null
          office_location: string | null
          research_areas: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_projects?: number | null
          department?: string | null
          id?: string
          max_projects?: number | null
          office_location?: string | null
          research_areas?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_projects?: number | null
          department?: string | null
          id?: string
          max_projects?: number | null
          office_location?: string | null
          research_areas?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
    }
    Views: {
      supervisor_directory: {
        Row: {
          created_at: string | null
          current_projects: number | null
          department: string | null
          full_name: string | null
          id: string | null
          max_projects: number | null
          research_areas: string[] | null
          school: string | null
          updated_at: string | null
          user_id: string | null
          user_type: string | null
        }
        Insert: {
          created_at?: string | null
          current_projects?: number | null
          department?: string | null
          full_name?: string | null
          id?: string | null
          max_projects?: number | null
          research_areas?: string[] | null
          school?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_type?: string | null
        }
        Update: {
          created_at?: string | null
          current_projects?: number | null
          department?: string | null
          full_name?: string | null
          id?: string | null
          max_projects?: number | null
          research_areas?: string[] | null
          school?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_super: { Args: { _user_id: string }; Returns: boolean }
      is_supervisor: { Args: { _user_id: string }; Returns: boolean }
      user_created_group: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      user_owns_group: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "student" | "supervisor" | "super_admin"
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
      app_role: ["admin", "moderator", "student", "supervisor", "super_admin"],
    },
  },
} as const
