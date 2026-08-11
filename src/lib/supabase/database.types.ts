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
    PostgrestVersion: "14.15"
  }
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
      board_functions: {
        Row: {
          board_id: string
          deleted_at: string | null
          id: string
          name: string
          position: string
        }
        Insert: {
          board_id: string
          deleted_at?: string | null
          id?: string
          name: string
          position: string
        }
        Update: {
          board_id?: string
          deleted_at?: string | null
          id?: string
          name?: string
          position?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_functions_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      board_member_functions: {
        Row: {
          board_id: string
          function_id: string
          user_id: string
        }
        Insert: {
          board_id: string
          function_id: string
          user_id: string
        }
        Update: {
          board_id?: string
          function_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_member_functions_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_member_functions_board_id_user_id_fkey"
            columns: ["board_id", "user_id"]
            isOneToOne: false
            referencedRelation: "board_members"
            referencedColumns: ["board_id", "user_id"]
          },
          {
            foreignKeyName: "board_member_functions_function_id_board_id_fkey"
            columns: ["function_id", "board_id"]
            isOneToOne: false
            referencedRelation: "board_functions"
            referencedColumns: ["id", "board_id"]
          },
          {
            foreignKeyName: "board_member_functions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      board_members: {
        Row: {
          board_id: string
          created_at: string
          role: Database["public"]["Enums"]["board_role"]
          user_id: string
        }
        Insert: {
          board_id: string
          created_at?: string
          role?: Database["public"]["Enums"]["board_role"]
          user_id: string
        }
        Update: {
          board_id?: string
          created_at?: string
          role?: Database["public"]["Enums"]["board_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_members_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          position: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          position: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          position?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cell_values: {
        Row: {
          board_id: string
          column_id: string
          item_id: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          board_id: string
          column_id: string
          item_id: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          board_id?: string
          column_id?: string
          item_id?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "cell_values_column_id_board_id_fkey"
            columns: ["column_id", "board_id"]
            isOneToOne: false
            referencedRelation: "columns"
            referencedColumns: ["id", "board_id"]
          },
          {
            foreignKeyName: "cell_values_item_id_board_id_fkey"
            columns: ["item_id", "board_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id", "board_id"]
          },
          {
            foreignKeyName: "cell_values_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          board_id: string
          deleted_at: string | null
          id: string
          name: string
          position: string
        }
        Insert: {
          board_id: string
          deleted_at?: string | null
          id?: string
          name: string
          position: string
        }
        Update: {
          board_id?: string
          deleted_at?: string | null
          id?: string
          name?: string
          position?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      column_labels: {
        Row: {
          board_id: string
          color: string
          column_id: string
          id: string
          is_done: boolean
          is_not_applicable: boolean
          points: number | null
          position: string
          progress: number
          title: string
        }
        Insert: {
          board_id: string
          color: string
          column_id: string
          id?: string
          is_done?: boolean
          is_not_applicable?: boolean
          points?: number | null
          position: string
          progress?: number
          title: string
        }
        Update: {
          board_id?: string
          color?: string
          column_id?: string
          id?: string
          is_done?: boolean
          is_not_applicable?: boolean
          points?: number | null
          position?: string
          progress?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "column_labels_column_id_board_id_fkey"
            columns: ["column_id", "board_id"]
            isOneToOne: false
            referencedRelation: "columns"
            referencedColumns: ["id", "board_id"]
          },
        ]
      }
      columns: {
        Row: {
          board_id: string
          deleted_at: string | null
          id: string
          position: string
          settings: Json
          title: string
          type: Database["public"]["Enums"]["column_type"]
        }
        Insert: {
          board_id: string
          deleted_at?: string | null
          id?: string
          position: string
          settings?: Json
          title: string
          type: Database["public"]["Enums"]["column_type"]
        }
        Update: {
          board_id?: string
          deleted_at?: string | null
          id?: string
          position?: string
          settings?: Json
          title?: string
          type?: Database["public"]["Enums"]["column_type"]
        }
        Relationships: [
          {
            foreignKeyName: "columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          board_id: string
          chapter_id: string | null
          color: string | null
          deleted_at: string | null
          id: string
          name: string
          position: string
        }
        Insert: {
          board_id: string
          chapter_id?: string | null
          color?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          position: string
        }
        Update: {
          board_id?: string
          chapter_id?: string | null
          color?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          position?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_chapter_id_board_id_fkey"
            columns: ["chapter_id", "board_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id", "board_id"]
          },
        ]
      }
      items: {
        Row: {
          board_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          group_id: string
          id: string
          name: string
          position: string
          updated_at: string
        }
        Insert: {
          board_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          group_id: string
          id?: string
          name: string
          position: string
          updated_at?: string
        }
        Update: {
          board_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          group_id?: string
          id?: string
          name?: string
          position?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_group_id_board_id_fkey"
            columns: ["group_id", "board_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id", "board_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_site_admin: boolean
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_site_admin?: boolean
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_site_admin?: boolean
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      board_role: "admin" | "medlem" | "leser"
      column_type:
        | "status"
        | "person"
        | "date"
        | "text"
        | "number"
        | "link"
        | "label"
      workspace_role: "admin" | "medlem"
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
      board_role: ["admin", "medlem", "leser"],
      column_type: [
        "status",
        "person",
        "date",
        "text",
        "number",
        "link",
        "label",
      ],
      workspace_role: ["admin", "medlem"],
    },
  },
} as const
