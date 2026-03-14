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
      activity_logs: {
        Row: {
          action_category: string
          action_type: string
          created_at: string
          description: string | null
          id: string
          ip_address: string | null
          is_archived: boolean
          metadata: Json | null
          page_path: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_category?: string
          action_type: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          is_archived?: boolean
          metadata?: Json | null
          page_path?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_category?: string
          action_type?: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          is_archived?: boolean
          metadata?: Json | null
          page_path?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ad_impressions: {
        Row: {
          ad_source: string
          country: string | null
          created_at: string
          device: string
          event_type: string
          id: string
          placement: string
          slot_id: string
        }
        Insert: {
          ad_source?: string
          country?: string | null
          created_at?: string
          device?: string
          event_type?: string
          id?: string
          placement: string
          slot_id: string
        }
        Update: {
          ad_source?: string
          country?: string | null
          created_at?: string
          device?: string
          event_type?: string
          id?: string
          placement?: string
          slot_id?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      bank_details: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          bank_name: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      certificate_testimonials: {
        Row: {
          certificate_id: string
          created_at: string
          id: string
          is_visible: boolean
          photo_url: string | null
          sort_order: number
          testimonial: string
          updated_at: string
          user_id: string
        }
        Insert: {
          certificate_id: string
          created_at?: string
          id?: string
          is_visible?: boolean
          photo_url?: string | null
          sort_order?: number
          testimonial: string
          updated_at?: string
          user_id: string
        }
        Update: {
          certificate_id?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          photo_url?: string | null
          sort_order?: number
          testimonial?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_testimonials_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          description: string | null
          featured_order: number
          featured_quote: string | null
          file_url: string | null
          id: string
          is_featured: boolean
          issued_at: string
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          description?: string | null
          featured_order?: number
          featured_quote?: string | null
          file_url?: string | null
          id?: string
          is_featured?: boolean
          issued_at?: string
          reference_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          description?: string | null
          featured_order?: number
          featured_quote?: string | null
          file_url?: string | null
          id?: string
          is_featured?: boolean
          issued_at?: string
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      comment_reports: {
        Row: {
          admin_action: string | null
          comment_id: string
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_action?: string | null
          comment_id: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id: string
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_action?: string | null
          comment_id?: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "image_comments"
            referencedColumns: ["id"]
          },
        ]
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
          ai_detection_result: Json | null
          competition_id: string
          created_at: string
          description: string | null
          exif_data: Json | null
          id: string
          is_ai_generated: boolean
          is_pinned: boolean
          is_trending: boolean
          photos: string[]
          placement: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          ai_detection_result?: Json | null
          competition_id: string
          created_at?: string
          description?: string | null
          exif_data?: Json | null
          id?: string
          is_ai_generated?: boolean
          is_pinned?: boolean
          is_trending?: boolean
          photos?: string[]
          placement?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          ai_detection_result?: Json | null
          competition_id?: string
          created_at?: string
          description?: string | null
          exif_data?: Json | null
          id?: string
          is_ai_generated?: boolean
          is_pinned?: boolean
          is_trending?: boolean
          photos?: string[]
          placement?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          view_count?: number
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
      competition_judges: {
        Row: {
          assigned_at: string
          assigned_by: string
          competition_id: string
          id: string
          judge_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          competition_id: string
          id?: string
          judge_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          competition_id?: string
          id?: string
          judge_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_judges_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_judging_tags: {
        Row: {
          competition_id: string
          id: string
          tag_id: string
        }
        Insert: {
          competition_id: string
          id?: string
          tag_id: string
        }
        Update: {
          competition_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_judging_tags_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_judging_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "judging_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_payment_details: {
        Row: {
          bank_details: string | null
          competition_id: string
          created_at: string
          id: string
          paypal_email: string | null
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          bank_details?: string | null
          competition_id: string
          created_at?: string
          id?: string
          paypal_email?: string | null
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          bank_details?: string | null
          competition_id?: string
          created_at?: string
          id?: string
          paypal_email?: string | null
          updated_at?: string
          upi_id?: string | null
        }
        Relationships: []
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
          ai_images_allowed: boolean
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
          prize_info: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_images_allowed?: boolean
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
          prize_info?: string | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_images_allowed?: boolean
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
          is_featured: boolean
          is_free: boolean
          labels: string[]
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
          is_featured?: boolean
          is_free?: boolean
          labels?: string[]
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
          is_featured?: boolean
          is_free?: boolean
          labels?: string[]
          price?: number | null
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string
          body_text: string
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          subject: string
          template_key: string
          updated_at: string
          updated_by: string | null
          variables: string[]
        }
        Insert: {
          body_html?: string
          body_text?: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          subject?: string
          template_key: string
          updated_at?: string
          updated_by?: string | null
          variables?: string[]
        }
        Update: {
          body_html?: string
          body_text?: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          template_key?: string
          updated_at?: string
          updated_by?: string | null
          variables?: string[]
        }
        Relationships: []
      }
      featured_artists: {
        Row: {
          artist_avatar_url: string | null
          artist_bio: string | null
          artist_name: string | null
          body: string
          cover_image_url: string | null
          created_at: string
          created_by: string
          excerpt: string | null
          id: string
          is_active: boolean
          photo_gallery: string[]
          published_at: string | null
          slug: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          artist_avatar_url?: string | null
          artist_bio?: string | null
          artist_name?: string | null
          body?: string
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          excerpt?: string | null
          id?: string
          is_active?: boolean
          photo_gallery?: string[]
          published_at?: string | null
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          artist_avatar_url?: string | null
          artist_bio?: string | null
          artist_name?: string | null
          body?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          excerpt?: string | null
          id?: string
          is_active?: boolean
          photo_gallery?: string[]
          published_at?: string | null
          slug?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      gift_announcements: {
        Row: {
          amount: number
          created_at: string
          expires_at: string | null
          gift_credit_id: string
          id: string
          is_expired: boolean
          is_read: boolean
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          expires_at?: string | null
          gift_credit_id: string
          id?: string
          is_expired?: boolean
          is_read?: boolean
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          expires_at?: string | null
          gift_credit_id?: string
          id?: string
          is_expired?: boolean
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
          expires_at: string | null
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
          expires_at?: string | null
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
          expires_at?: string | null
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
      image_comments: {
        Row: {
          content: string
          created_at: string
          flag_reason: string | null
          id: string
          image_id: string
          image_type: string
          is_admin_seed: boolean
          is_flagged: boolean
          is_pinned: boolean
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          flag_reason?: string | null
          id?: string
          image_id: string
          image_type: string
          is_admin_seed?: boolean
          is_flagged?: boolean
          is_pinned?: boolean
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          flag_reason?: string | null
          id?: string
          image_id?: string
          image_type?: string
          is_admin_seed?: boolean
          is_flagged?: boolean
          is_pinned?: boolean
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "image_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      image_reactions: {
        Row: {
          created_at: string
          id: string
          image_id: string
          image_type: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_id: string
          image_type: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_id?: string
          image_type?: string
          reaction_type?: string
          user_id?: string
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
          is_featured: boolean
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
          is_featured?: boolean
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
          is_featured?: boolean
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
      judge_comments: {
        Row: {
          comment: string
          created_at: string
          entry_id: string
          id: string
          judge_id: string
          round_id: string | null
          updated_at: string
        }
        Insert: {
          comment: string
          created_at?: string
          entry_id: string
          id?: string
          judge_id: string
          round_id?: string | null
          updated_at?: string
        }
        Update: {
          comment?: string
          created_at?: string
          entry_id?: string
          id?: string
          judge_id?: string
          round_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_comments_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "competition_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_comments_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "judging_rounds"
            referencedColumns: ["id"]
          },
        ]
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
      judge_tag_assignments: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          judge_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          judge_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          judge_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_tag_assignments_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "competition_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "judging_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      judging_rounds: {
        Row: {
          competition_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          round_number: number
          status: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          round_number?: number
          status?: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          round_number?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "judging_rounds_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      judging_tags: {
        Row: {
          color: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
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
      photo_of_the_day: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          featured_date: string
          id: string
          image_url: string
          is_active: boolean
          photographer_id: string | null
          photographer_name: string | null
          source_entry_id: string | null
          source_type: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          featured_date?: string
          id?: string
          image_url: string
          is_active?: boolean
          photographer_id?: string | null
          photographer_name?: string | null
          source_entry_id?: string | null
          source_type?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          featured_date?: string
          id?: string
          image_url?: string
          is_active?: boolean
          photographer_id?: string | null
          photographer_name?: string | null
          source_entry_id?: string | null
          source_type?: string
          title?: string
        }
        Relationships: []
      }
      portfolio_images: {
        Row: {
          category: string
          created_at: string
          id: string
          image_url: string
          is_pinned: boolean
          is_trending: boolean
          is_visible: boolean
          sort_order: number
          title: string
          uploaded_by: string
          view_count: number
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          image_url: string
          is_pinned?: boolean
          is_trending?: boolean
          is_visible?: boolean
          sort_order?: number
          title: string
          uploaded_by: string
          view_count?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string
          is_pinned?: boolean
          is_trending?: boolean
          is_visible?: boolean
          sort_order?: number
          title?: string
          uploaded_by?: string
          view_count?: number
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          image_urls: string[]
          privacy: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          image_urls?: string[]
          privacy?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          image_urls?: string[]
          privacy?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          cover_position: number
          cover_url: string | null
          created_at: string
          facebook_url: string | null
          full_name: string | null
          id: string
          instagram_url: string | null
          is_suspended: boolean
          national_id_url: string | null
          phone: string | null
          photography_interests: string[] | null
          portfolio_url: string | null
          postal_code: string | null
          preferred_language: string
          privacy_settings: Json
          state: string | null
          suspended_until: string | null
          suspension_reason: string | null
          twitter_url: string | null
          updated_at: string
          website_url: string | null
          whatsapp: string | null
          youtube_url: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          cover_position?: number
          cover_url?: string | null
          created_at?: string
          facebook_url?: string | null
          full_name?: string | null
          id: string
          instagram_url?: string | null
          is_suspended?: boolean
          national_id_url?: string | null
          phone?: string | null
          photography_interests?: string[] | null
          portfolio_url?: string | null
          postal_code?: string | null
          preferred_language?: string
          privacy_settings?: Json
          state?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
          whatsapp?: string | null
          youtube_url?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          cover_position?: number
          cover_url?: string | null
          created_at?: string
          facebook_url?: string | null
          full_name?: string | null
          id?: string
          instagram_url?: string | null
          is_suspended?: boolean
          national_id_url?: string | null
          phone?: string | null
          photography_interests?: string[] | null
          portfolio_url?: string | null
          postal_code?: string | null
          preferred_language?: string
          privacy_settings?: Json
          state?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
          whatsapp?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_code_id: string
          referred_id: string
          referrer_id: string
          reward_amount: number | null
          rewarded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code_id: string
          referred_id: string
          referrer_id: string
          reward_amount?: number | null
          rewarded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code_id?: string
          referred_id?: string
          referrer_id?: string
          reward_amount?: number | null
          rewarded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
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
      scheduled_boosts: {
        Row: {
          applied_amount: number
          created_at: string
          created_by: string
          ends_at: string | null
          id: string
          image_id: string
          image_type: string
          increment_per_hour: number
          reaction_type: string
          starts_at: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          applied_amount?: number
          created_at?: string
          created_by: string
          ends_at?: string | null
          id?: string
          image_id: string
          image_type: string
          increment_per_hour?: number
          reaction_type?: string
          starts_at?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          applied_amount?: number
          created_at?: string
          created_by?: string
          ends_at?: string | null
          id?: string
          image_id?: string
          image_type?: string
          increment_per_hour?: number
          reaction_type?: string
          starts_at?: string
          status?: string
          total_amount?: number
          updated_at?: string
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
      support_tickets: {
        Row: {
          created_at: string
          id: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_replies: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          created_at: string
          id: string
          is_admin: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_admin?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_admin?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          assigned_at: string
          assigned_by: string
          badge_type: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          badge_type: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          badge_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
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
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string | null
          facebook_url: string | null
          full_name: string | null
          id: string | null
          instagram_url: string | null
          is_suspended: boolean | null
          photography_interests: string[] | null
          portfolio_url: string | null
          preferred_language: string | null
          privacy_settings: Json | null
          twitter_url: string | null
          updated_at: string | null
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          facebook_url?: string | null
          full_name?: string | null
          id?: string | null
          instagram_url?: string | null
          is_suspended?: boolean | null
          photography_interests?: string[] | null
          portfolio_url?: string | null
          preferred_language?: string | null
          privacy_settings?: Json | null
          twitter_url?: string | null
          updated_at?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          facebook_url?: string | null
          full_name?: string | null
          id?: string | null
          instagram_url?: string | null
          is_suspended?: boolean | null
          photography_interests?: string[] | null
          portfolio_url?: string | null
          preferred_language?: string | null
          privacy_settings?: Json | null
          twitter_url?: string | null
          updated_at?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
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
      admin_wallet_credit:
        | {
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
        | {
            Args: {
              _admin_id: string
              _amount: number
              _description?: string
              _metadata?: Json
              _reference_id?: string
              _reference_type?: string
              _target_user_id: string
              _type: string
            }
            Returns: string
          }
      are_friends: {
        Args: { _user_a: string; _user_b: string }
        Returns: boolean
      }
      can_view_post: {
        Args: { _post_user_id: string; _privacy: string; _viewer_id: string }
        Returns: boolean
      }
      friend_count: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_referral_reward:
        | {
            Args: { _activity_type: string; _referred_user_id: string }
            Returns: undefined
          }
        | {
            Args: {
              _activity_type: string
              _referred_user_id: string
              _txn_amount?: number
            }
            Returns: undefined
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
