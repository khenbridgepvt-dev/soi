export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      application_types: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cases: {
        Row: {
          accepted_at: string | null
          application_type_id: string
          appointment_date: string | null
          client_first_name: string
          client_last_name: string
          completed_at: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          deleted_by: string | null
          fee_agreement: string | null
          id: string
          is_deleted: boolean
          is_internal: boolean
          is_urgent: boolean
          last_date: string | null
          notes: string | null
          reference: string | null
          senior_revision_count: number
          status: Database["public"]["Enums"]["case_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          application_type_id: string
          appointment_date?: string | null
          client_first_name: string
          client_last_name: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deleted_by?: string | null
          fee_agreement?: string | null
          id?: string
          is_deleted?: boolean
          is_internal?: boolean
          is_urgent?: boolean
          last_date?: string | null
          notes?: string | null
          reference?: string | null
          senior_revision_count?: number
          status?: Database["public"]["Enums"]["case_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          application_type_id?: string
          appointment_date?: string | null
          client_first_name?: string
          client_last_name?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
          fee_agreement?: string | null
          id?: string
          is_deleted?: boolean
          is_internal?: boolean
          is_urgent?: boolean
          last_date?: string | null
          notes?: string | null
          reference?: string | null
          senior_revision_count?: number
          status?: Database["public"]["Enums"]["case_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_application_type_id_fkey"
            columns: ["application_type_id"]
            isOneToOne: false
            referencedRelation: "application_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_staff_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
      dependants: {
        Row: {
          case_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          name: string
          relationship: string
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          name: string
          relationship: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          name?: string
          relationship?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dependants_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependants_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependants_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_allowances: {
        Row: {
          accrual_rate_per_month: number
          accrual_start_date: string
          created_at: string
          holiday_total_annual: number
          id: string
          sick_total_annual: number
          staff_id: string
          updated_at: string
        }
        Insert: {
          accrual_rate_per_month?: number
          accrual_start_date: string
          created_at?: string
          holiday_total_annual?: number
          id?: string
          sick_total_annual?: number
          staff_id: string
          updated_at?: string
        }
        Update: {
          accrual_rate_per_month?: number
          accrual_start_date?: string
          created_at?: string
          holiday_total_annual?: number
          id?: string
          sick_total_annual?: number
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_allowances_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_allowances_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "profiles_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          days_count: number
          end_date: string
          excess_handling:
            | Database["public"]["Enums"]["excess_leave_handling"]
            | null
          id: string
          is_over_limit: boolean
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string | null
          rejection_reason: string | null
          staff_id: string
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days_count: number
          end_date: string
          excess_handling?:
            | Database["public"]["Enums"]["excess_leave_handling"]
            | null
          id?: string
          is_over_limit?: boolean
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          rejection_reason?: string | null
          staff_id: string
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          days_count?: number
          end_date?: string
          excess_handling?:
            | Database["public"]["Enums"]["excess_leave_handling"]
            | null
          id?: string
          is_over_limit?: boolean
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          rejection_reason?: string | null
          staff_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles_staff_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          body: string
          case_id: string | null
          created_at: string
          id: string
          is_read: boolean
          is_urgent: boolean
          payload: Json | null
          read_at: string | null
          task_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          body: string
          case_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          is_urgent?: boolean
          payload?: Json | null
          read_at?: string | null
          task_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          body?: string
          case_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          is_urgent?: boolean
          payload?: Json | null
          read_at?: string | null
          task_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles_staff_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          online_status: Database["public"]["Enums"]["online_status"]
          role: Database["public"]["Enums"]["user_role"]
          timezone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          online_status?: Database["public"]["Enums"]["online_status"]
          role?: Database["public"]["Enums"]["user_role"]
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          online_status?: Database["public"]["Enums"]["online_status"]
          role?: Database["public"]["Enums"]["user_role"]
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reference_counters: {
        Row: {
          id: string
          last_sequence: number
          updated_at: string
          year_month: string
        }
        Insert: {
          id?: string
          last_sequence?: number
          updated_at?: string
          year_month: string
        }
        Update: {
          id?: string
          last_sequence?: number
          updated_at?: string
          year_month?: string
        }
        Relationships: []
      }
      staff_timetables: {
        Row: {
          fri_end: string | null
          fri_start: string | null
          id: string
          mon_end: string | null
          mon_start: string | null
          sat_end: string | null
          sat_start: string | null
          staff_id: string
          sun_end: string | null
          sun_start: string | null
          thu_end: string | null
          thu_start: string | null
          tue_end: string | null
          tue_start: string | null
          updated_at: string
          wed_end: string | null
          wed_start: string | null
        }
        Insert: {
          fri_end?: string | null
          fri_start?: string | null
          id?: string
          mon_end?: string | null
          mon_start?: string | null
          sat_end?: string | null
          sat_start?: string | null
          staff_id: string
          sun_end?: string | null
          sun_start?: string | null
          thu_end?: string | null
          thu_start?: string | null
          tue_end?: string | null
          tue_start?: string | null
          updated_at?: string
          wed_end?: string | null
          wed_start?: string | null
        }
        Update: {
          fri_end?: string | null
          fri_start?: string | null
          id?: string
          mon_end?: string | null
          mon_start?: string | null
          sat_end?: string | null
          sat_start?: string | null
          staff_id?: string
          sun_end?: string | null
          sun_start?: string | null
          thu_end?: string | null
          thu_start?: string | null
          tue_end?: string | null
          tue_start?: string | null
          updated_at?: string
          wed_end?: string | null
          wed_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_timetables_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_timetables_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "profiles_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          created_at: string
          date: string
          duration_minutes: number
          end_time: string
          id: string
          is_released: boolean
          released_at: string | null
          staff_id: string
          start_time: string
          task_id: string
        }
        Insert: {
          created_at?: string
          date: string
          duration_minutes: number
          end_time: string
          id?: string
          is_released?: boolean
          released_at?: string | null
          staff_id: string
          start_time: string
          task_id: string
        }
        Update: {
          created_at?: string
          date?: string
          duration_minutes?: number
          end_time?: string
          id?: string
          is_released?: boolean
          released_at?: string | null
          staff_id?: string
          start_time?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles_staff_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          abbreviation: string
          assigned_to: string | null
          blocked_at: string | null
          blocked_reason: string | null
          case_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          is_custom: boolean
          is_deleted: boolean
          is_overdue: boolean
          is_overtime: boolean
          is_urgent: boolean
          name: string
          notes: string | null
          priority_position: number | null
          revision_notes: string | null
          senior_approval:
            | Database["public"]["Enums"]["senior_review_outcome"]
            | null
          sequence: number
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
        }
        Insert: {
          abbreviation: string
          assigned_to?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          case_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_custom?: boolean
          is_deleted?: boolean
          is_overdue?: boolean
          is_overtime?: boolean
          is_urgent?: boolean
          name: string
          notes?: string | null
          priority_position?: number | null
          revision_notes?: string | null
          senior_approval?:
            | Database["public"]["Enums"]["senior_review_outcome"]
            | null
          sequence: number
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
        }
        Update: {
          abbreviation?: string
          assigned_to?: string | null
          blocked_at?: string | null
          blocked_reason?: string | null
          case_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_custom?: boolean
          is_deleted?: boolean
          is_overdue?: boolean
          is_overtime?: boolean
          is_urgent?: boolean
          name?: string
          notes?: string | null
          priority_position?: number | null
          revision_notes?: string | null
          senior_approval?:
            | Database["public"]["Enums"]["senior_review_outcome"]
            | null
          sequence?: number
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles_staff_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles_staff_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles_staff_view"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profiles_staff_view: {
        Row: {
          full_name: string | null
          id: string | null
          online_status: Database["public"]["Enums"]["online_status"] | null
          role: Database["public"]["Enums"]["user_role"] | null
          timezone: string | null
        }
        Insert: {
          full_name?: string | null
          id?: string | null
          online_status?: Database["public"]["Enums"]["online_status"] | null
          role?: Database["public"]["Enums"]["user_role"] | null
          timezone?: string | null
        }
        Update: {
          full_name?: string | null
          id?: string | null
          online_status?: Database["public"]["Enums"]["online_status"] | null
          role?: Database["public"]["Enums"]["user_role"] | null
          timezone?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_lead: { Args: { p_case_id: string }; Returns: Json }
      check_case_completion: { Args: { p_case_id: string }; Returns: boolean }
      check_task_prerequisites: { Args: { p_task_id: string }; Returns: undefined }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      edit_case_reference: {
        Args: { p_case_id: string; p_new_reference: string }
        Returns: Json
      }
      is_active_user: { Args: never; Returns: boolean }
      jwt_role: { Args: never; Returns: string }
      release_assignment_on_block: {
        Args: { p_task_id: string }
        Returns: number
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      staff_assigned_active_case_ids: { Args: never; Returns: string[] }
      update_task_status: {
        Args: {
          p_task_id: string
          p_new_status: Database["public"]["Enums"]["task_status"]
        }
        Returns: Json
      }
      submit_senior_review: {
        Args: {
          p_task_id: string
          p_outcome: Database["public"]["Enums"]["senior_review_outcome"]
          p_revision_notes?: string | null
        }
        Returns: Json
      }
      search_cases: {
        Args: { p_query: string; p_limit?: number }
        Returns: {
          id: string
          reference: string | null
          client_name: string
          status: Database["public"]["Enums"]["case_status"]
          is_urgent: boolean
          assigned_staff: string | null
        }[]
      }
      soft_delete_case: { Args: { p_case_id: string }; Returns: Json }
      restore_archived_record: {
        Args: {
          p_id: string
          p_type: Database["public"]["Enums"]["archive_record_type"]
        }
        Returns: Json
      }
      purge_expired_records: { Args: { p_retention_days?: number }; Returns: Json }
    }
    Enums: {
      archive_record_type: "case" | "task" | "dependant"
      case_status: "lead_pending" | "active" | "rejected" | "completed"
      excess_leave_handling: "paid" | "salary_deduction"
      leave_status: "pending" | "approved" | "rejected"
      leave_type: "holiday" | "sick"
      notification_type:
        | "new_task"
        | "urgent_case"
        | "task_overdue"
        | "task_blocked"
        | "leave_approved"
        | "leave_rejected"
        | "leave_requested"
        | "senior_revision_alert"
        | "du_alert"
      online_status: "online" | "break" | "offline"
      senior_review_outcome: "pending" | "approved" | "revisions_required"
      task_status: "not_started" | "in_progress" | "completed" | "blocked"
      user_role: "admin" | "senior" | "staff"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      case_status: ["lead_pending", "active", "rejected", "completed"],
      excess_leave_handling: ["paid", "salary_deduction"],
      leave_status: ["pending", "approved", "rejected"],
      leave_type: ["holiday", "sick"],
      notification_type: [
        "new_task",
        "urgent_case",
        "task_overdue",
        "task_blocked",
        "leave_approved",
        "leave_rejected",
        "leave_requested",
        "senior_revision_alert",
        "du_alert",
      ],
      online_status: ["online", "break", "offline"],
      senior_review_outcome: ["pending", "approved", "revisions_required"],
      task_status: ["not_started", "in_progress", "completed", "blocked"],
      user_role: ["admin", "senior", "staff"],
    },
  },
} as const

