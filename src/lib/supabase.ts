import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// Reads from Vite environment variables with fallback to the configured project credentials
const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  'https://pyefznkwfblgomkqqjuh.supabase.co';

const supabasePublishableKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  'sb_publishable_LczgYq1qE7ygAW9-m-84UQ_a70uAsM5';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Database record interfaces matching the Supabase schema
export interface SupabaseProfile {
  id: string;
  full_name?: string | null;
  name?: string | null; // fallback alias
  email?: string | null;
  role: 'student' | 'admin';
  phone?: string | null;
  phone_number?: string | null;
  target_college?: string | null;
  college?: string | null;
  district?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseCourse {
  id: string;
  title: string;
  description?: string | null;
  instructor?: string | null;
  price?: number;
  discount_price?: number | null;
  thumbnail_url?: string | null;
  is_published: boolean;
  features?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: 'active' | 'completed' | 'cancelled';
  enrolled_at?: string;
}

export interface SupabaseExam {
  id: string;
  course_id?: string | null;
  title: string;
  description?: string | null;
  subject?: string | null;
  duration_minutes: number;
  total_marks: number;
  negative_marks?: number;
  is_published: boolean;
  start_time?: string | null;
  end_time?: string | null;
  created_at?: string;
}

export interface SupabaseQuestion {
  id: string;
  exam_id: string;
  question_text: string;
  options: string[];
  explanation?: string | null;
  marks?: number;
  // Note: correct_answer is protected server-side and omitted in student views
  correct_answer?: number;
}

export interface SupabaseExamResult {
  id: string;
  exam_id: string;
  user_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  unanswered: number;
  time_spent_seconds?: number;
  submitted_at?: string;
}
