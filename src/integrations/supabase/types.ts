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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          display_name: string
          id: string
          id_number: string
          phone: string
          role: Database["public"]["Enums"]["admin_role"]
          school_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id?: string
          id_number?: string
          phone?: string
          role?: Database["public"]["Enums"]["admin_role"]
          school_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          id_number?: string
          phone?: string
          role?: Database["public"]["Enums"]["admin_role"]
          school_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          bill_number: string
          category: string
          created_at: string
          date: string
          description: string
          id: string
          person_name: string
          school_id: string
          staff_id: string | null
        }
        Insert: {
          amount?: number
          bill_number?: string
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          person_name?: string
          school_id: string
          staff_id?: string | null
        }
        Update: {
          amount?: number
          bill_number?: string
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          person_name?: string
          school_id?: string
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bill_number: string
          created_at: string
          custom_fee_label: string | null
          date: string
          discount: number
          fee_type: string
          final_amount: number
          id: string
          note: string
          school_id: string
          student_id: string
        }
        Insert: {
          amount?: number
          bill_number?: string
          created_at?: string
          custom_fee_label?: string | null
          date?: string
          discount?: number
          fee_type?: string
          final_amount?: number
          id?: string
          note?: string
          school_id: string
          student_id: string
        }
        Update: {
          amount?: number
          bill_number?: string
          created_at?: string
          custom_fee_label?: string | null
          date?: string
          discount?: number
          fee_type?: string
          final_amount?: number
          id?: string
          note?: string
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string
          created_at: string
          grades: Json
          id: string
          name: string
          phone: string
        }
        Insert: {
          address?: string
          created_at?: string
          grades?: Json
          id?: string
          name: string
          phone?: string
        }
        Update: {
          address?: string
          created_at?: string
          grades?: Json
          id?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          active: boolean
          created_at: string
          custom_role: string | null
          entry_date: string
          exit_date: string | null
          id: string
          id_number: string
          name: string
          phone: string
          role: string
          salary: number
          school_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          custom_role?: string | null
          entry_date?: string
          exit_date?: string | null
          id?: string
          id_number?: string
          name: string
          phone?: string
          role?: string
          salary?: number
          school_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          custom_role?: string | null
          entry_date?: string
          exit_date?: string | null
          id?: string
          id_number?: string
          name?: string
          phone?: string
          role?: string
          salary?: number
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          discount_type: string
          discount_value: number
          entry_date: string
          grade: string
          id: string
          id_number: string
          monthly_fee: number
          name: string
          parent_name: string
          parent_phone: string
          school_id: string
          status: string
        }
        Insert: {
          created_at?: string
          discount_type?: string
          discount_value?: number
          entry_date?: string
          grade?: string
          id?: string
          id_number?: string
          monthly_fee?: number
          name: string
          parent_name?: string
          parent_phone?: string
          school_id: string
          status?: string
        }
        Update: {
          created_at?: string
          discount_type?: string
          discount_value?: number
          entry_date?: string
          grade?: string
          id?: string
          id_number?: string
          monthly_fee?: number
          name?: string
          parent_name?: string
          parent_phone?: string
          school_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["admin_role"]
      }
      get_admin_school_id: { Args: { _user_id: string }; Returns: string }
      owner_exists: { Args: never; Returns: boolean }
    }
    Enums: {
      admin_role: "owner" | "admin"
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
      admin_role: ["owner", "admin"],
    },
  },
} as const
