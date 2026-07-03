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
      badges: {
        Row: {
          badge_key: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_key: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      flashcard_sets: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"]
          created_at: string
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty"]
          folder_id: string | null
          id: string
          is_manual: boolean
          is_public: boolean
          share_slug: string | null
          subject: string | null
          title: string
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_group?: Database["public"]["Enums"]["age_group"]
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty"]
          folder_id?: string | null
          id?: string
          is_manual?: boolean
          is_public?: boolean
          share_slug?: string | null
          subject?: string | null
          title: string
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"]
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty"]
          folder_id?: string | null
          id?: string
          is_manual?: boolean
          is_public?: boolean
          share_slug?: string | null
          subject?: string | null
          title?: string
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_sets_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: string
          created_at: string
          due_date: string
          ease: number
          front: string
          id: string
          image_url: string | null
          interval_days: number
          position: number
          review_count: number
          set_id: string
          user_id: string
        }
        Insert: {
          back: string
          created_at?: string
          due_date?: string
          ease?: number
          front: string
          id?: string
          image_url?: string | null
          interval_days?: number
          position?: number
          review_count?: number
          set_id: string
          user_id: string
        }
        Update: {
          back?: string
          created_at?: string
          due_date?: string
          ease?: number
          front?: string
          id?: string
          image_url?: string | null
          interval_days?: number
          position?: number
          review_count?: number
          set_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "flashcard_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"]
          created_at: string
          current_streak: number
          display_name: string | null
          id: string
          last_study_date: string | null
          level: number
          longest_streak: number
          updated_at: string
          xp: number
        }
        Insert: {
          age_group?: Database["public"]["Enums"]["age_group"]
          created_at?: string
          current_streak?: number
          display_name?: string | null
          id: string
          last_study_date?: string | null
          level?: number
          longest_streak?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"]
          created_at?: string
          current_streak?: number
          display_name?: string | null
          id?: string
          last_study_date?: string | null
          level?: number
          longest_streak?: number
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          created_at: string
          id: string
          quiz_id: string
          score: number
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quiz_id: string
          score?: number
          total?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quiz_id?: string
          score?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          age_group: Database["public"]["Enums"]["age_group"]
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          id: string
          questions: Json
          title: string
          topic: string | null
          user_id: string
        }
        Insert: {
          age_group?: Database["public"]["Enums"]["age_group"]
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          id?: string
          questions?: Json
          title: string
          topic?: string | null
          user_id: string
        }
        Update: {
          age_group?: Database["public"]["Enums"]["age_group"]
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          id?: string
          questions?: Json
          title?: string
          topic?: string | null
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          kind: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          kind: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          kind?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      age_group: "kids" | "teens" | "college" | "adults"
      difficulty: "easy" | "medium" | "hard"
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
      age_group: ["kids", "teens", "college", "adults"],
      difficulty: ["easy", "medium", "hard"],
    },
  },
} as const
