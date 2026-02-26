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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      certificates: {
        Row: {
          description: string | null
          file_url: string | null
          id: string
          issued_at: string
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          description?: string | null
          file_url?: string | null
          id?: string
          issued_at?: string
          reference_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          description?: string | null
          file_url?: string | null
          id?: string
          issued_at?: string
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          article_id: string | null
          content: string
          created_at: string
          entry_id: string | null
          id: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          article_id?: string | null
          content?: string
          created_at?: string
          entry_id?: string | null
          id?: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          article_id?: string | null
          content?: string
          created_at?: string
          entry_id?: string | null
          id?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "journal_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "competition_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_entries: {
        Row: {
          competition_id: string
          created_at: string
          description: string | null
          id: string
          photos: string[]
          placement: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          description?: string | null
          id?: string
          photos?: string[]
          placement?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          description?: string | null
          id?: string
          photos?: string[]
          placement?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_entries_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_votes: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_votes_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "competition_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          category: string
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          ends_at: string
          entry_fee: number | null
          id: string
          max_entries_per_user: number | null
          max_photos_per_entry: number | null
          payment_details: Json | null
          prize_info: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          ends_at: string
          entry_fee?: number | null
          id?: string
          max_entries_per_user?: number | null
          max_photos_per_entry?: number | null
          payment_details?: Json | null
          prize_info?: string | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string
          entry_fee?: number | null
          id?: string
          max_entries_per_user?: number | null
          max_photos_per_entry?: number | null
          payment_details?: Json | null
          prize_info?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          author_id: string
          category: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          difficulty: string
          id: string
          is_free: boolean
          price: number | null
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          category?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          id?: string
          is_free?: boolean
          price?: number | null
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          id?: string
          is_free?: boolean
          price?: number | null
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gift_announcements: {
        Row: {
          amount: number
          created_at: string
          gift_credit_id: string
          id: string
          is_read: boolean
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          gift_credit_id: string
          id?: string
          is_read?: boolean
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          gift_credit_id?: string
          id?: string
          is_read?: boolean
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_announcements_gift_credit_id_fkey"
            columns: ["gift_credit_id"]
            isOneToOne: false
            referencedRelation: "gift_credits"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_credits: {
        Row: {
          admin_id: string
          amount: number
          auto_apply_future: boolean
          created_at: string
          id: string
          reason: string
          recipients_count: number
          status: string
          target_type: string
          target_value: string | null
        }
        Insert: {
          admin_id: string
          amount: number
          auto_apply_future?: boolean
          created_at?: string
          id?: string
          reason: string
          recipients_count?: number
          status?: string
          target_type: string
          target_value?: string | null
        }
        Update: {
          admin_id?: string
          amount?: number
          auto_apply_future?: boolean
          created_at?: string
          id?: string
          reason?: string
          recipients_count?: number
          status?: string
          target_type?: string
          target_value?: string | null
        }
        Relationships: []
      }
      hero_banners: {
        Row: {
          category: string
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      journal_articles: {
        Row: {
          author_id: string
          body: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          photo_gallery: string[]
          published_at: string | null
          slug: string
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          photo_gallery?: string[]
          published_at?: string | null
          slug: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          photo_gallery?: string[]
          published_at?: string | null
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      judge_scores: {
        Row: {
          created_at: string
          entry_id: string
          feedback: string | null
          id: string
          judge_id: string
          score: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          feedback?: string | null
          id?: string
          judge_id: string
          score: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          feedback?: string | null
          id?: string
          judge_id?: string
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_scores_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "competition_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string
          course_id: string
          created_at: string
          id: string
          image_url: string | null
          sort_order: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content?: string
          course_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_images: {
        Row: {
          category: string
          created_at: string
          id: string
          image_url: string
          is_visible: boolean
          sort_order: number
          title: string
          uploaded_by: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          image_url: string
          is_visible?: boolean
          sort_order?: number
          title: string
          uploaded_by: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string
          is_visible?: boolean
          sort_order?: number
          title?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          facebook_url: string | null
          full_name: string | null
          id: string
          instagram_url: string | null
          is_suspended: boolean
          photography_interests: string[] | null
          portfolio_url: string | null
          suspended_until: string | null
          suspension_reason: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          facebook_url?: string | null
          full_name?: string | null
          id: string
          instagram_url?: string | null
          is_suspended?: boolean
          photography_interests?: string[] | null
          portfolio_url?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          facebook_url?: string | null
          full_name?: string | null
          id?: string
          instagram_url?: string | null
          is_suspended?: boolean
          photography_interests?: string[] | null
          portfolio_url?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      role_applications: {
        Row: {
          admin_message: string | null
          created_at: string
          experience: string | null
          id: string
          portfolio_url: string | null
          reason: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_message?: string | null
          created_at?: string
          experience?: string | null
          id?: string
          portfolio_url?: string | null
          reason?: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_message?: string | null
          created_at?: string
          experience?: string | null
          id?: string
          portfolio_url?: string | null
          reason?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"]
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_note: string | null
          amount: number
          bank_details: Json | null
          created_at: string
          id: string
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          bank_details?: Json | null
          created_at?: string
          id?: string
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          bank_details?: Json | null
          created_at?: string
          id?: string
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_search_users: {
        Args: { search_by?: string; search_query?: string }
        Returns: {
          avatar_url: string
          bio: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_suspended: boolean
          suspended_until: string
          suspension_reason: string
        }[]
      }
      admin_wallet_credit: {
        Args: {
          _admin_id: string
          _amount: number
          _description?: string
          _reference_id?: string
          _reference_type?: string
          _target_user_id: string
          _type: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_certificates: {
        Args: { _course_title?: string; _issued_date?: string; _name?: string }
        Returns: {
          description: string
          id: string
          issued_at: string
          recipient_name: string
          title: string
          type: string
        }[]
      }
      verify_certificate: {
        Args: { _cert_id: string }
        Returns: {
          description: string
          id: string
          issued_at: string
          recipient_name: string
          title: string
          type: string
        }[]
      }
      wallet_transaction: {
        Args: {
          _amount: number
          _description?: string
          _metadata?: Json
          _reference_id?: string
          _reference_type?: string
          _type: string
          _user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "user"
        | "judge"
        | "content_editor"
        | "admin"
        | "registered_photographer"
        | "student"
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
        "user",
        "judge",
        "content_editor",
        "admin",
        "registered_photographer",
        "student",
      ],
    },
  },
} as const
