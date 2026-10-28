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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agenda_events: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          descricao: string
          id: string
          project_id: string
          titulo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: string
          descricao?: string
          id?: string
          project_id: string
          titulo: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string
          id?: string
          project_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      columns: {
        Row: {
          id: string
          nome: string
          posicao: number
          project_id: string
        }
        Insert: {
          id?: string
          nome: string
          posicao?: number
          project_id: string
        }
        Update: {
          id?: string
          nome?: string
          posicao?: number
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "columns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          created_at: string
          id: string
          task_id: string
          texto: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          task_id: string
          texto: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          task_id?: string
          texto?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fields: {
        Row: {
          id: string
          nome: string
          obrigatorio: boolean
          opcoes: Json
          posicao: number
          project_id: string
          tipo: Database["public"]["Enums"]["field_tipo"]
        }
        Insert: {
          id?: string
          nome: string
          obrigatorio?: boolean
          opcoes?: Json
          posicao?: number
          project_id: string
          tipo?: Database["public"]["Enums"]["field_tipo"]
        }
        Update: {
          id?: string
          nome?: string
          obrigatorio?: boolean
          opcoes?: Json
          posicao?: number
          project_id?: string
          tipo?: Database["public"]["Enums"]["field_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          arquivado: boolean
          capa_url: string | null
          created_at: string
          descricao: string
          id: string
          next_numero: number
          nome: string
          prefixo: string
        }
        Insert: {
          arquivado?: boolean
          capa_url?: string | null
          created_at?: string
          descricao?: string
          id?: string
          next_numero?: number
          nome: string
          prefixo: string
        }
        Update: {
          arquivado?: boolean
          capa_url?: string | null
          created_at?: string
          descricao?: string
          id?: string
          next_numero?: number
          nome?: string
          prefixo?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          cor: string
          id: string
          nome: string
          project_id: string
        }
        Insert: {
          cor?: string
          id?: string
          nome: string
          project_id: string
        }
        Update: {
          cor?: string
          id?: string
          nome?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activity: {
        Row: {
          created_at: string
          de_coluna: string | null
          id: string
          para_coluna: string | null
          task_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          de_coluna?: string | null
          id?: string
          para_coluna?: string | null
          task_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          de_coluna?: string | null
          id?: string
          para_coluna?: string | null
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          task_id: string
          user_id: string
        }
        Insert: {
          task_id: string
          user_id: string
        }
        Update: {
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_custom_values: {
        Row: {
          field_id: string
          task_id: string
          valor: Json | null
        }
        Insert: {
          field_id: string
          task_id: string
          valor?: Json | null
        }
        Update: {
          field_id?: string
          task_id?: string
          valor?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "task_custom_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_custom_values_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_tags: {
        Row: {
          tag_id: string
          task_id: string
        }
        Insert: {
          tag_id: string
          task_id: string
        }
        Update: {
          tag_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tags_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          column_id: string
          created_at: string
          created_by: string | null
          data_entrega: string | null
          data_inicio: string | null
          descricao: string
          id: string
          numero: number
          posicao: number
          prioridade: Database["public"]["Enums"]["task_prioridade"]
          project_id: string
          tipo: Database["public"]["Enums"]["task_tipo"]
          titulo: string
        }
        Insert: {
          column_id: string
          created_at?: string
          created_by?: string | null
          data_entrega?: string | null
          data_inicio?: string | null
          descricao?: string
          id?: string
          numero?: number
          posicao?: number
          prioridade?: Database["public"]["Enums"]["task_prioridade"]
          project_id: string
          tipo?: Database["public"]["Enums"]["task_tipo"]
          titulo: string
        }
        Update: {
          column_id?: string
          created_at?: string
          created_by?: string | null
          data_entrega?: string | null
          data_inicio?: string | null
          descricao?: string
          id?: string
          numero?: number
          posicao?: number
          prioridade?: Database["public"]["Enums"]["task_prioridade"]
          project_id?: string
          tipo?: Database["public"]["Enums"]["task_tipo"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_invite: { Args: never; Returns: boolean }
      is_member: { Args: { _uid: string }; Returns: boolean }
      is_owner: { Args: { _uid: string }; Returns: boolean }
    }
    Enums: {
      field_tipo: "texto" | "numero" | "data" | "lista" | "checkbox" | "link"
      member_role: "owner" | "member"
      task_prioridade: "baixa" | "media" | "alta" | "urgente"
      task_tipo: "bug" | "melhoria" | "feature"
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
      field_tipo: ["texto", "numero", "data", "lista", "checkbox", "link"],
      member_role: ["owner", "member"],
      task_prioridade: ["baixa", "media", "alta", "urgente"],
      task_tipo: ["bug", "melhoria", "feature"],
    },
  },
} as const
