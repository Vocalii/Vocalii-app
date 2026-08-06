import { createClient } from '@supabase/supabase-js';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          role: string | null;
          experience_level: string | null;
          goals: string[];
          symptoms: string[];
          desired_voice_traits: string[];
          voice_statement: string | null;
          voice_barrier: string | null;
          voice_identity: string | null;
          onboarding_complete: boolean;
          baseline_score: number | null;
          baseline_stability_pct: number | null;
          baseline_resonance_score: number | null;
          baseline_clarity_pct: number | null;
          baseline_loudness_db: number | null;
          baseline_pitch_hz: number | null;
          baseline_pitch_range_hz: number | null;
          baseline_set_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          first_name?: string;
          last_name?: string;
          role?: string | null;
          experience_level?: string | null;
          goals?: string[];
          symptoms?: string[];
          desired_voice_traits?: string[];
          voice_statement?: string | null;
          voice_barrier?: string | null;
          voice_identity?: string | null;
          onboarding_complete?: boolean;
          baseline_score?: number | null;
          baseline_stability_pct?: number | null;
          baseline_resonance_score?: number | null;
          baseline_clarity_pct?: number | null;
          baseline_loudness_db?: number | null;
          baseline_pitch_hz?: number | null;
          baseline_pitch_range_hz?: number | null;
          baseline_set_at?: string | null;
          updated_at?: string;
        };
        Update: {
          first_name?: string;
          last_name?: string;
          role?: string | null;
          experience_level?: string | null;
          goals?: string[];
          symptoms?: string[];
          desired_voice_traits?: string[];
          voice_statement?: string | null;
          voice_barrier?: string | null;
          voice_identity?: string | null;
          onboarding_complete?: boolean;
          baseline_score?: number | null;
          baseline_stability_pct?: number | null;
          baseline_resonance_score?: number | null;
          baseline_clarity_pct?: number | null;
          baseline_loudness_db?: number | null;
          baseline_pitch_hz?: number | null;
          baseline_pitch_range_hz?: number | null;
          baseline_set_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      habit_pairs: {
        Row: {
          id: string;
          user_id: string;
          daily_habit: string;
          vocal_habit: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          daily_habit: string;
          vocal_habit: string;
          sort_order?: number;
        };
        Update: {
          daily_habit?: string;
          vocal_habit?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      daily_checkins: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          vocal_effort: number;
          voice_confidence: number | null;
          voice_demand_level: number | null;
          symptoms: string[];
          notes: string;
          support_area: string;
          selected_ritual_ids: string[];
          ritual_insight: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          date: string;
          vocal_effort: number;
          voice_confidence?: number | null;
          voice_demand_level?: number | null;
          symptoms?: string[];
          notes?: string;
          support_area: string;
          selected_ritual_ids?: string[];
          ritual_insight?: string;
        };
        Update: {
          vocal_effort?: number;
          voice_confidence?: number | null;
          voice_demand_level?: number | null;
          symptoms?: string[];
          notes?: string;
          support_area?: string;
          selected_ritual_ids?: string[];
          ritual_insight?: string;
        };
        Relationships: [];
      };
      ritual_completions: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          ritual_id: string;
          feeling_rating: number | null;
          difficulty_rating: number | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          date: string;
          ritual_id: string;
          feeling_rating?: number | null;
          difficulty_rating?: number | null;
        };
        Update: {
          ritual_id?: string;
          feeling_rating?: number | null;
          difficulty_rating?: number | null;
        };
        Relationships: [];
      };
      vocal_reports: {
        Row: {
          id: string;
          user_id: string;
          name: string | null;
          ritual_name: string;
          category: string;
          date: string;
          duration: string;
          fatigue_level: number;
          feelings: string[];
          notes: string;
          insight: string;
          pitch_hz: number | null;
          pitch_range_hz: number | null;
          resonance_score: number | null;
          clarity_pct: number | null;
          loudness_db: number | null;
          stability_pct: number | null;
          is_favourite: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          name?: string | null;
          ritual_name: string;
          category: string;
          date: string;
          duration: string;
          fatigue_level: number;
          feelings?: string[];
          notes?: string;
          insight?: string;
          pitch_hz?: number | null;
          pitch_range_hz?: number | null;
          resonance_score?: number | null;
          clarity_pct?: number | null;
          loudness_db?: number | null;
          stability_pct?: number | null;
          is_favourite?: boolean;
        };
        Update: {
          name?: string | null;
          ritual_name?: string;
          category?: string;
          date?: string;
          duration?: string;
          fatigue_level?: number;
          feelings?: string[];
          notes?: string;
          insight?: string;
          pitch_hz?: number | null;
          pitch_range_hz?: number | null;
          resonance_score?: number | null;
          clarity_pct?: number | null;
          loudness_db?: number | null;
          stability_pct?: number | null;
          is_favourite?: boolean;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          date: string;
          time: string | null;
          location: string | null;
          prep_days_before: number | null;
          tailored_ritual_ids: string[];
          ai_insight: string | null;
          chat_transcript: { role: 'user' | 'assistant'; content: string }[];
          created_at: string;
        };
        Insert: {
          user_id: string;
          title: string;
          date: string;
          time?: string | null;
          location?: string | null;
          prep_days_before?: number | null;
          tailored_ritual_ids?: string[];
          ai_insight?: string | null;
          chat_transcript?: { role: 'user' | 'assistant'; content: string }[];
        };
        Update: {
          title?: string;
          date?: string;
          time?: string | null;
          location?: string | null;
          prep_days_before?: number | null;
          tailored_ritual_ids?: string[];
          ai_insight?: string | null;
          chat_transcript?: { role: 'user' | 'assistant'; content: string }[];
        };
        Relationships: [];
      };
      habit_completions: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          daily_habit: string;
          vocal_habit: string;
          completed: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          date: string;
          daily_habit: string;
          vocal_habit: string;
          completed: boolean;
        };
        Update: {
          completed?: boolean;
        };
        Relationships: [];
      };
      goal_progress_snapshots: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          goal: string;
          status: string;
          rule_version: string;
          primary_value: number | null;
          primary_value_prior: number | null;
          observations_count: number | null;
          safety_triggered: boolean;
          details: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          user_id: string;
          date: string;
          goal: string;
          status: string;
          rule_version: string;
          primary_value?: number | null;
          primary_value_prior?: number | null;
          observations_count?: number | null;
          safety_triggered?: boolean;
          details?: Record<string, unknown>;
        };
        Update: {
          status?: string;
          rule_version?: string;
          primary_value?: number | null;
          primary_value_prior?: number | null;
          observations_count?: number | null;
          safety_triggered?: boolean;
          details?: Record<string, unknown>;
        };
        Relationships: [];
      };
      weekly_checkins: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          goal_id: string;
          goal_question_1: number | null;
          goal_question_2: number | null;
          trait: string;
          trait_question_1: number | null;
          trait_question_2: number | null;
          voice_confidence: number | null;
          reflection: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          week_start: string;
          goal_id: string;
          goal_question_1?: number | null;
          goal_question_2?: number | null;
          trait: string;
          trait_question_1?: number | null;
          trait_question_2?: number | null;
          voice_confidence?: number | null;
          reflection?: string | null;
        };
        Update: {
          goal_question_1?: number | null;
          goal_question_2?: number | null;
          trait_question_1?: number | null;
          trait_question_2?: number | null;
          voice_confidence?: number | null;
          reflection?: string | null;
        };
        Relationships: [];
      };
      weekly_report_insights: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          overview: string;
          what_improved: string;
          needs_attention: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          week_start: string;
          overview: string;
          what_improved: string;
          needs_attention: string;
        };
        Update: {
          overview?: string;
          what_improved?: string;
          needs_attention?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
