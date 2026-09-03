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
      artifacts: {
        Row: {
          brand_id: string | null
          content: string | null
          content_json: Json | null
          conversation_id: string | null
          created_at: string
          created_by: string
          eval_score: number | null
          id: string
          kind: string
          metadata: Json
          source_message_id: string | null
          starred: boolean
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          brand_id?: string | null
          content?: string | null
          content_json?: Json | null
          conversation_id?: string | null
          created_at?: string
          created_by: string
          eval_score?: number | null
          id?: string
          kind: string
          metadata?: Json
          source_message_id?: string | null
          starred?: boolean
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          brand_id?: string | null
          content?: string | null
          content_json?: Json | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string
          eval_score?: number | null
          id?: string
          kind?: string
          metadata?: Json
          source_message_id?: string | null
          starred?: boolean
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifacts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifacts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifacts_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          actor_id: string | null
          created_at: string
          event: string
          id: string
          ip_address: unknown
          metadata: Json
          target_id: string | null
          target_table: string | null
          user_agent: string | null
          workspace_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
          workspace_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          audience: string | null
          brand_voice: string | null
          channels: string[] | null
          created_at: string
          created_by: string
          goals: string | null
          id: string
          name: string
          product: string | null
          tone: string | null
          updated_at: string
          website: string | null
          workspace_id: string
        }
        Insert: {
          audience?: string | null
          brand_voice?: string | null
          channels?: string[] | null
          created_at?: string
          created_by: string
          goals?: string | null
          id?: string
          name: string
          product?: string | null
          tone?: string | null
          updated_at?: string
          website?: string | null
          workspace_id: string
        }
        Update: {
          audience?: string | null
          brand_voice?: string | null
          channels?: string[] | null
          created_at?: string
          created_by?: string
          goals?: string | null
          id?: string
          name?: string
          product?: string | null
          tone?: string | null
          updated_at?: string
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          brand_id: string | null
          budget: number | null
          calendar: Json | null
          channels: string[] | null
          created_at: string
          created_by: string
          end_date: string | null
          id: string
          name: string
          objective: string | null
          start_date: string | null
          status: string | null
          strategy: Json | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          brand_id?: string | null
          budget?: number | null
          calendar?: Json | null
          channels?: string[] | null
          created_at?: string
          created_by: string
          end_date?: string | null
          id?: string
          name: string
          objective?: string | null
          start_date?: string | null
          status?: string | null
          strategy?: Json | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          brand_id?: string | null
          budget?: number | null
          calendar?: Json | null
          channels?: string[] | null
          created_at?: string
          created_by?: string
          end_date?: string | null
          id?: string
          name?: string
          objective?: string | null
          start_date?: string | null
          status?: string | null
          strategy?: Json | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      content_runs: {
        Row: {
          asset_url: string | null
          brand_id: string | null
          campaign_id: string | null
          created_at: string
          created_by: string
          error: string | null
          eval_feedback: string | null
          eval_score: number | null
          id: string
          input: Json
          kind: Database["public"]["Enums"]["content_kind"]
          model: string | null
          output: Json | null
          output_text: string | null
          status: Database["public"]["Enums"]["run_status"]
          title: string | null
          tokens_input: number | null
          tokens_output: number | null
          updated_at: string
          user_rating: number | null
          workspace_id: string
        }
        Insert: {
          asset_url?: string | null
          brand_id?: string | null
          campaign_id?: string | null
          created_at?: string
          created_by: string
          error?: string | null
          eval_feedback?: string | null
          eval_score?: number | null
          id?: string
          input?: Json
          kind: Database["public"]["Enums"]["content_kind"]
          model?: string | null
          output?: Json | null
          output_text?: string | null
          status?: Database["public"]["Enums"]["run_status"]
          title?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          updated_at?: string
          user_rating?: number | null
          workspace_id: string
        }
        Update: {
          asset_url?: string | null
          brand_id?: string | null
          campaign_id?: string | null
          created_at?: string
          created_by?: string
          error?: string | null
          eval_feedback?: string | null
          eval_score?: number | null
          id?: string
          input?: Json
          kind?: Database["public"]["Enums"]["content_kind"]
          model?: string | null
          output?: Json | null
          output_text?: string | null
          status?: Database["public"]["Enums"]["run_status"]
          title?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          updated_at?: string
          user_rating?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_runs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_runs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          active_brand_id: string | null
          archived: boolean
          created_at: string
          created_by: string
          id: string
          last_message_at: string
          pinned: boolean
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active_brand_id?: string | null
          archived?: boolean
          created_at?: string
          created_by: string
          id?: string
          last_message_at?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active_brand_id?: string | null
          archived?: boolean
          created_at?: string
          created_by?: string
          id?: string
          last_message_at?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_active_brand_id_fkey"
            columns: ["active_brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json | null
          source_type: string
          source_url: string | null
          title: string | null
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source_type?: string
          source_url?: string | null
          title?: string | null
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source_type?: string
          source_url?: string | null
          title?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_connections: {
        Row: {
          auth_url: string | null
          created_at: string
          id: string
          last_error: string | null
          name: string
          oauth_ciphertext: string | null
          state: string
          tool_count: number
          transport: string
          updated_at: string
          url: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          auth_url?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          name: string
          oauth_ciphertext?: string | null
          state?: string
          tool_count?: number
          transport?: string
          updated_at?: string
          url: string
          user_id: string
          workspace_id: string
        }
        Update: {
          auth_url?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          name?: string
          oauth_ciphertext?: string | null
          state?: string
          tool_count?: number
          transport?: string
          updated_at?: string
          url?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          ai_sdk_message_id: string | null
          conversation_id: string
          cost_usd: number | null
          created_at: string
          eval_notes: Json | null
          eval_score: number | null
          id: string
          input_tokens: number | null
          latency_ms: number | null
          model: string | null
          output_tokens: number | null
          parts: Json
          reasoning_tokens: number | null
          role: string
          workspace_id: string
        }
        Insert: {
          ai_sdk_message_id?: string | null
          conversation_id: string
          cost_usd?: number | null
          created_at?: string
          eval_notes?: Json | null
          eval_score?: number | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number | null
          parts?: Json
          reasoning_tokens?: number | null
          role: string
          workspace_id: string
        }
        Update: {
          ai_sdk_message_id?: string | null
          conversation_id?: string
          cost_usd?: number | null
          created_at?: string
          eval_notes?: Json | null
          eval_score?: number | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number | null
          parts?: Json
          reasoning_tokens?: number | null
          role?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          bucket: string
          count: number
          window_start: string
          workspace_id: string
        }
        Insert: {
          bucket: string
          count?: number
          window_start: string
          workspace_id: string
        }
        Update: {
          bucket?: string
          count?: number
          window_start?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limits_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      report_citations: {
        Row: {
          citing_title: string | null
          citing_url: string
          engine: string
          first_seen_at: string
          id: string
          last_seen_at: string
          project_id: string
          snippet: string | null
          workspace_id: string
        }
        Insert: {
          citing_title?: string | null
          citing_url: string
          engine: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          project_id: string
          snippet?: string | null
          workspace_id: string
        }
        Update: {
          citing_title?: string | null
          citing_url?: string
          engine?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          project_id?: string
          snippet?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_citations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_citations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      research_projects: {
        Row: {
          brand_id: string | null
          citations_checked_at: string | null
          created_at: string
          created_by: string
          depth: string
          goal: string | null
          id: string
          is_public: boolean
          share_slug: string | null
          topic: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          brand_id?: string | null
          citations_checked_at?: string | null
          created_at?: string
          created_by: string
          depth?: string
          goal?: string | null
          id?: string
          is_public?: boolean
          share_slug?: string | null
          topic: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          brand_id?: string | null
          citations_checked_at?: string | null
          created_at?: string
          created_by?: string
          depth?: string
          goal?: string | null
          id?: string
          is_public?: boolean
          share_slug?: string | null
          topic?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_projects_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      research_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          model: string | null
          plan: Json | null
          project_id: string
          report_markdown: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["run_status"]
          summary: string | null
          tokens_input: number | null
          tokens_output: number | null
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          model?: string | null
          plan?: Json | null
          project_id: string
          report_markdown?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["run_status"]
          summary?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          model?: string | null
          plan?: Json | null
          project_id?: string
          report_markdown?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["run_status"]
          summary?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      research_sources: {
        Row: {
          created_at: string
          fetched: boolean | null
          id: string
          relevance: number | null
          run_id: string
          snippet: string | null
          title: string | null
          url: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          fetched?: boolean | null
          id?: string
          relevance?: number | null
          run_id: string
          snippet?: string | null
          title?: string | null
          url: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          fetched?: boolean | null
          id?: string
          relevance?: number | null
          run_id?: string
          snippet?: string | null
          title?: string | null
          url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_sources_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "research_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      research_steps: {
        Row: {
          action: string | null
          agent: string
          created_at: string
          id: string
          result: Json | null
          run_id: string
          step_index: number
          thought: string | null
          workspace_id: string
        }
        Insert: {
          action?: string | null
          agent: string
          created_at?: string
          id?: string
          result?: Json | null
          run_id: string
          step_index: number
          thought?: string | null
          workspace_id: string
        }
        Update: {
          action?: string | null
          agent?: string
          created_at?: string
          id?: string
          result?: Json | null
          run_id?: string
          step_index?: number
          thought?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "research_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_steps_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          project_id: string | null
          sponsor_id: string
          surface: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          project_id?: string | null
          sponsor_id: string
          surface: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          project_id?: string | null
          sponsor_id?: string
          surface?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_events_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          credit_lines: string[]
          cta_label: string
          destination_url: string
          ends_at: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          starts_at: string | null
          tagline: string
          topic_keywords: string[]
          updated_at: string
          weight: number
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          credit_lines?: string[]
          cta_label?: string
          destination_url: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          starts_at?: string | null
          tagline: string
          topic_keywords?: string[]
          updated_at?: string
          weight?: number
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          credit_lines?: string[]
          cta_label?: string
          destination_url?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          starts_at?: string | null
          tagline?: string
          topic_keywords?: string[]
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          metadata: Json
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          metadata?: Json
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          metadata?: Json
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_counters: {
        Row: {
          content_runs: number
          id: string
          period_month: string
          research_runs: number
          tokens_input: number
          tokens_output: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          content_runs?: number
          id?: string
          period_month: string
          research_runs?: number
          tokens_input?: number
          tokens_output?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          content_runs?: number
          id?: string
          period_month?: string
          research_runs?: number
          tokens_input?: number
          tokens_output?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      workspace_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["workspace_role"]
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["workspace_role"]
          token?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
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
          created_by: string
          id: string
          name: string
          plan: Database["public"]["Enums"]["plan_tier"]
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_workspace_invite: { Args: { _token: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_rate_limit: {
        Args: {
          p_bucket: string
          p_window_start: string
          p_workspace_id: string
        }
        Returns: undefined
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      match_documents: {
        Args: {
          _workspace_id: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          similarity: number
          source_url: string
          title: string
        }[]
      }
      peek_workspace_invite: {
        Args: { _token: string }
        Returns: {
          accepted: boolean
          email: string
          expired: boolean
          role: Database["public"]["Enums"]["workspace_role"]
          workspace_id: string
          workspace_name: string
        }[]
      }
      workspace_role_of: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: Database["public"]["Enums"]["workspace_role"]
      }
    }
    Enums: {
      app_role: "admin" | "member"
      content_kind:
        | "blog"
        | "ad_copy"
        | "social_post"
        | "hashtags"
        | "email"
        | "video_script"
        | "image"
        | "strategy"
        | "campaign"
        | "seo"
      plan_tier: "free" | "pro" | "team"
      run_status: "queued" | "running" | "succeeded" | "failed" | "cancelled"
      workspace_role: "owner" | "admin" | "member"
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
      app_role: ["admin", "member"],
      content_kind: [
        "blog",
        "ad_copy",
        "social_post",
        "hashtags",
        "email",
        "video_script",
        "image",
        "strategy",
        "campaign",
        "seo",
      ],
      plan_tier: ["free", "pro", "team"],
      run_status: ["queued", "running", "succeeded", "failed", "cancelled"],
      workspace_role: ["owner", "admin", "member"],
    },
  },
} as const
