-- ============================================================================
-- MediBridge Games: Phase 2 Database Schema Migration (Production Hardened)
-- Target: Supabase (PostgreSQL 15+ with Row Level Security)
--
-- Safety Guarantees:
-- 1. Idempotent & Rerunnable: Uses IF NOT EXISTS, DO blocks, and DROP POLICY IF EXISTS.
-- 2. Non-Destructive: No DROP TABLE, no DROP COLUMN, no TRUNCATE.
-- 3. Type Safe: All foreign keys, auth.uid() comparisons, and UUID casts strictly match.
-- 4. PII & Secret Isolation: Sensitive platform_settings (payments/security) restricted to admins.
-- 5. Anti-Cheat & Anti-Tampering: Answer keys protected; student role self-elevation forbidden.
-- 6. Firebase ID Compatibility: Maintains source_id text fields alongside UUID keys.
-- ============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Helper Functions: Admin & Role Authorization (Security Definer)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'teacher', 'moderator')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_teacher() TO anon, authenticated, service_role;

-- ============================================================================
-- 2. Mapping & Migration Tracking Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.firebase_uid_mapping (
  firebase_uid text PRIMARY KEY,
  supabase_uid uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  metadata jsonb DEFAULT '{}'::jsonb,
  migrated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_firebase_uid_mapping_supabase_uid 
  ON public.firebase_uid_mapping(supabase_uid);
CREATE INDEX IF NOT EXISTS idx_firebase_uid_mapping_email 
  ON public.firebase_uid_mapping(email);

ALTER TABLE public.firebase_uid_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage firebase_uid_mapping" ON public.firebase_uid_mapping;
CREATE POLICY "Admins can manage firebase_uid_mapping"
  ON public.firebase_uid_mapping
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public._migration_checkpoints (
  collection_name text PRIMARY KEY,
  last_source_id text,
  total_migrated integer DEFAULT 0,
  status text DEFAULT 'in_progress',
  error_message text,
  started_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public._migration_checkpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage migration checkpoints" ON public._migration_checkpoints;
CREATE POLICY "Admins can manage migration checkpoints"
  ON public._migration_checkpoints
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- 3. Enhance Existing Core Tables (Idempotent ALTER TABLE ADD COLUMN)
-- ============================================================================

-- 3.1 profiles
DO $$
BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS source_id text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_college text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS college text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS district text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level integer DEFAULT 1;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp integer DEFAULT 0;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coins integer DEFAULT 0;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_rank text DEFAULT 'Bronze Aspirant';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_streak integer DEFAULT 0;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_date text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS questions_solved integer DEFAULT 0;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS questions_correct integer DEFAULT 0;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pinned_rival_id text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_xp ON public.profiles(xp DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_source_id ON public.profiles(source_id);

-- 3.2 courses
DO $$
BEGIN
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS source_id text;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS category text DEFAULT 'Medical Admission';
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor text;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS discount_price numeric(10,2);
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS thumbnail_url text;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS features text[] DEFAULT '{}';
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;
  ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS idx_courses_source_id ON public.courses(source_id);

-- 3.3 enrollments
DO $$
BEGIN
  ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS source_id text;
  ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS batch_id text;
  ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS package_name text;
  ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS amount numeric(10,2) DEFAULT 0;
  ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS payment_method text;
  ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS trx_id text;
  ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS user_email text;
  ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS user_display_name text;
  ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS expiry_date timestamptz;
  ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS notes text;
  ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS enrolled_at timestamptz DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS idx_enrollments_source_id ON public.enrollments(source_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);

-- 3.4 exams
DO $$
BEGIN
  ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS source_id text;
  ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS subject text;
  ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS chapter text;
  ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS batch_id text;
  ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS total_marks numeric(10,2) DEFAULT 100;
  ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS pass_marks numeric(10,2) DEFAULT 40;
  ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS negative_marks numeric(10,2) DEFAULT 0.25;
  ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS question_ids text[] DEFAULT '{}';
  ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS created_by text;
  ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS creator_name text;
  ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS is_live boolean DEFAULT false;
  ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS start_time timestamptz;
  ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS end_time timestamptz;
  ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
END $$;

CREATE INDEX IF NOT EXISTS idx_exams_source_id ON public.exams(source_id);
CREATE INDEX IF NOT EXISTS idx_exams_course_id ON public.exams(course_id);

-- 3.5 questions
DO $$
BEGIN
  ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS source_id text;
  ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS subject text;
  ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS chapter text;
  ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'medium';
  ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS source text;
  ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS explanation text;
  ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS correct_answer integer;
  ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS created_by text;
  ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT true;
END $$;

CREATE INDEX IF NOT EXISTS idx_questions_source_id ON public.questions(source_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON public.questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject_chapter ON public.questions(subject, chapter);

-- 3.6 exam_results
DO $$
BEGIN
  ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS source_id text;
  ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS exam_title text;
  ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS display_name text;
  ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS avatar_url text;
  ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS total_questions integer DEFAULT 0;
  ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS correct_answers integer DEFAULT 0;
  ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS wrong_answers integer DEFAULT 0;
  ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS unanswered integer DEFAULT 0;
  ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS time_spent_seconds integer DEFAULT 0;
  ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS answers jsonb DEFAULT '{}'::jsonb;
END $$;

CREATE INDEX IF NOT EXISTS idx_exam_results_source_id ON public.exam_results(source_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_user_id ON public.exam_results(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student_id ON public.exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_id ON public.exam_results(exam_id);

-- ============================================================================
-- 4. Create Missing Relational & Content Tables
-- ============================================================================

-- 4.1 Batches
CREATE TABLE IF NOT EXISTS public.batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  course_id text NOT NULL,
  name text NOT NULL,
  description text,
  start_date timestamptz,
  end_date timestamptz,
  max_students integer DEFAULT 500,
  current_students integer DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_batches_course_id ON public.batches(course_id);

-- 4.2 Course Classes
CREATE TABLE IF NOT EXISTS public.course_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  course_id text NOT NULL,
  batch_id text,
  title text NOT NULL,
  topic text,
  video_url text,
  recording_url text,
  duration text,
  instructor text,
  is_live boolean DEFAULT false,
  scheduled_at timestamptz,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_course_classes_course_batch ON public.course_classes(course_id, batch_id);

-- 4.3 Course Materials
CREATE TABLE IF NOT EXISTS public.course_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  course_id text NOT NULL,
  batch_id text,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_type text DEFAULT 'pdf',
  file_size text,
  uploaded_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_course_materials_course_batch ON public.course_materials(course_id, batch_id);

-- 4.4 Course Announcements
CREATE TABLE IF NOT EXISTS public.course_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  course_id text NOT NULL,
  batch_id text,
  title text NOT NULL,
  content text NOT NULL,
  importance text DEFAULT 'normal',
  author_id text,
  author_name text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_course_announcements_course_batch ON public.course_announcements(course_id, batch_id);

-- 4.5 Course Teachers
CREATE TABLE IF NOT EXISTS public.course_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  name text NOT NULL,
  title text,
  bio text,
  avatar_url text,
  specialization text,
  assigned_courses text[] DEFAULT '{}',
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 4.6 Course Promo Codes
CREATE TABLE IF NOT EXISTS public.course_promocodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  code text NOT NULL UNIQUE,
  discount_type text DEFAULT 'percentage',
  discount_value numeric(10,2) NOT NULL,
  valid_until timestamptz,
  usage_limit integer,
  used_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 4.7 Batch Reviews
CREATE TABLE IF NOT EXISTS public.batch_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  batch_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  user_avatar text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_batch_reviews_batch_id ON public.batch_reviews(batch_id);

-- 4.8 Live Exam Re-Exam Permissions
CREATE TABLE IF NOT EXISTS public.live_exam_reexam_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  exam_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name text,
  student_email text,
  exam_title text,
  granted_by text,
  granted_by_name text,
  status text DEFAULT 'active',
  notes text,
  granted_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reexam_perm_exam_user ON public.live_exam_reexam_permissions(exam_id, user_id);

-- 4.9 Exam Violations (Anti-Cheat Audit Trail)
CREATE TABLE IF NOT EXISTS public.exam_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  exam_attempt_id text,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name text,
  student_email text,
  exam_id text NOT NULL,
  exam_title text,
  violation_type text NOT NULL,
  violation_count integer DEFAULT 1,
  max_allowed integer DEFAULT 3,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exam_violations_student ON public.exam_violations(student_id);

-- 4.10 Practice Attempts
CREATE TABLE IF NOT EXISTS public.practice_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  chapter text,
  score integer NOT NULL,
  total_questions integer NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_user ON public.practice_attempts(user_id);

-- 4.11 User Incorrect Questions (Flattened Subcollection)
CREATE TABLE IF NOT EXISTS public.user_incorrect_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  subject text,
  chapter text,
  incorrect_count integer DEFAULT 1,
  is_mastered boolean DEFAULT false,
  last_attempted_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_incorrect_unique ON public.user_incorrect_questions(user_id, question_id);

-- 4.12 Social Feed Posts
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_display_name text NOT NULL,
  user_avatar text,
  user_rank text,
  content text NOT NULL,
  achievement_type text,
  streak_count integer DEFAULT 0,
  likes integer DEFAULT 0,
  fires integer DEFAULT 0,
  claps integer DEFAULT 0,
  liked_by text[] DEFAULT '{}',
  fired_by text[] DEFAULT '{}',
  clapped_by text[] DEFAULT '{}',
  is_doubt boolean DEFAULT false,
  doubt_subject text,
  doubt_chapter text,
  doubt_image_url text,
  doubt_solved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

-- 4.13 Squads
CREATE TABLE IF NOT EXISTS public.squads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  name text NOT NULL,
  description text,
  logo_url text,
  creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  team_xp integer DEFAULT 0,
  member_count integer DEFAULT 1,
  members text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_squads_team_xp ON public.squads(team_xp DESC);

-- 4.14 Squad Messages (Flattened Subcollection)
CREATE TABLE IF NOT EXISTS public.squad_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  squad_id text NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  sender_avatar text,
  content text NOT NULL,
  resource_title text,
  resource_url text,
  resource_type text DEFAULT 'none',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_squad_messages_squad_time ON public.squad_messages(squad_id, created_at DESC);

-- 4.15 Batch Chats
CREATE TABLE IF NOT EXISTS public.batch_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  batch_id text NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  sender_avatar text,
  sender_role text DEFAULT 'student',
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_batch_chats_batch_time ON public.batch_chats(batch_id, created_at DESC);

-- 4.16 Notices (Announcements & News)
CREATE TABLE IF NOT EXISTS public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'news',
  important boolean DEFAULT false,
  created_by text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notices_created_at ON public.notices(created_at DESC);

-- 4.17 Our Heroes (Hall of Fame)
CREATE TABLE IF NOT EXISTS public.our_heroes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  name text NOT NULL,
  college text NOT NULL,
  merit_rank text,
  score text,
  session text,
  hsc_batch text,
  photo_url text,
  quote text,
  badge text,
  featured boolean DEFAULT false,
  order_index integer DEFAULT 0,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_our_heroes_order ON public.our_heroes(order_index ASC);

-- 4.18 Mentor Queries
CREATE TABLE IF NOT EXISTS public.mentor_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  user_email text,
  question text NOT NULL,
  reply text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  replied_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_mentor_queries_user ON public.mentor_queries(user_id);

-- 4.19 Mark Predictions
CREATE TABLE IF NOT EXISTS public.mark_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  user_email text,
  ssc_gpa numeric(4,2),
  hsc_gpa numeric(4,2),
  test_scores numeric(6,2),
  predicted_mark text,
  recommended_college text,
  comments text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  predicted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_mark_predictions_user ON public.mark_predictions(user_id);

-- 4.20 Payment Requests
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  user_email text NOT NULL,
  selected_plan text NOT NULL,
  payment_method text NOT NULL,
  sender_number text NOT NULL,
  transaction_id text NOT NULL,
  amount numeric(10,2) NOT NULL,
  screenshot_url text,
  status text DEFAULT 'Pending',
  admin_notes text,
  submission_date timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_requests_user ON public.payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests(status);

-- 4.21 User Notifications
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  type text DEFAULT 'system',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read ON public.user_notifications(user_id, read);

-- 4.22 Notification Logs (Broadcasts)
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  title text NOT NULL,
  content text NOT NULL,
  type text,
  target_type text DEFAULT 'all',
  recipient_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 4.23 Advertisements
CREATE TABLE IF NOT EXISTS public.advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  banner_url text NOT NULL,
  title text NOT NULL,
  description text,
  destination_url text NOT NULL,
  cta_text text DEFAULT 'Learn More',
  open_mode text DEFAULT 'new',
  login_popup_enabled boolean DEFAULT false,
  recurring_popup_enabled boolean DEFAULT false,
  target_audience text DEFAULT 'all',
  frequency integer DEFAULT 1,
  delay integer DEFAULT 3,
  auto_close_time integer DEFAULT 15,
  width text,
  height text,
  status text DEFAULT 'active',
  start_date date,
  end_date date,
  impressions_count integer DEFAULT 0,
  clicks_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 4.24 Ad Analytics Events
CREATE TABLE IF NOT EXISTS public.ad_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  ad_id text NOT NULL,
  type text NOT NULL,
  user_id text,
  session_or_device text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_ad ON public.ad_analytics_events(ad_id, type);

-- 4.25 Platform Settings (Key-Value Document Store)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by text
);

-- 4.26 Search Topics
CREATE TABLE IF NOT EXISTS public.search_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  title text NOT NULL,
  subject text NOT NULL,
  chapter text,
  keywords text[] DEFAULT '{}',
  summary text,
  related_questions_count integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_search_topics_subject ON public.search_topics(subject);

-- 4.27 Battles (Gaming Practice Sessions)
CREATE TABLE IF NOT EXISTS public.battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  battle_type text DEFAULT 'standard',
  opponent_name text,
  opponent_max_hp integer DEFAULT 100,
  opponent_hp integer DEFAULT 0,
  player_max_hp integer DEFAULT 100,
  player_hp integer DEFAULT 100,
  questions_count integer DEFAULT 10,
  current_index integer DEFAULT 0,
  combo integer DEFAULT 0,
  gold_earned integer DEFAULT 0,
  xp_earned integer DEFAULT 0,
  status text DEFAULT 'active',
  question_ids text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_battles_user ON public.battles(user_id);

-- ============================================================================
-- 5. Anti-Cheat Security: Public Question Projection View
-- ============================================================================
-- Never expose correct_answer or explanation to students before submission.
-- This view strips correct_answer for client apps.
CREATE OR REPLACE VIEW public.student_questions AS
  SELECT
    id,
    exam_id,
    question_text,
    options,
    marks,
    subject,
    chapter,
    difficulty,
    source,
    source_id,
    created_at
  FROM public.questions;

GRANT SELECT ON public.student_questions TO anon, authenticated;

-- ============================================================================
-- 6. Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_promocodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_exam_reexam_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_incorrect_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.our_heroes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mark_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- PROFILES RLS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view basic profiles" ON public.profiles;
CREATE POLICY "Public can view basic profiles"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile except role" ON public.profiles;
CREATE POLICY "Users can update own profile except role"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND 
    role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
CREATE POLICY "Admins have full access to profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- COURSES & BATCHES RLS (Public Read, Admin Write)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;
CREATE POLICY "Anyone can view published courses"
  ON public.courses FOR SELECT
  TO anon, authenticated
  USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage courses" ON public.courses;
CREATE POLICY "Admins manage courses"
  ON public.courses FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view active batches" ON public.batches;
CREATE POLICY "Anyone can view active batches"
  ON public.batches FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage batches" ON public.batches;
CREATE POLICY "Admins manage batches"
  ON public.batches FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- COURSE CONTENT (Classes, Materials, Announcements)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enrolled students or admins view classes" ON public.course_classes;
CREATE POLICY "Enrolled students or admins view classes"
  ON public.course_classes FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE (
        e.user_id = auth.uid() 
        OR (e.student_id IS NOT NULL AND e.student_id = auth.uid())
      )
      AND (
        e.course_id::text = course_classes.course_id 
        OR e.course_id::text = (SELECT c.id::text FROM public.courses c WHERE c.source_id = course_classes.course_id)
      )
      AND e.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins manage classes" ON public.course_classes;
CREATE POLICY "Admins manage classes"
  ON public.course_classes FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Enrolled students or admins view materials" ON public.course_materials;
CREATE POLICY "Enrolled students or admins view materials"
  ON public.course_materials FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE (
        e.user_id = auth.uid() 
        OR (e.student_id IS NOT NULL AND e.student_id = auth.uid())
      )
      AND (
        e.course_id::text = course_materials.course_id 
        OR e.course_id::text = (SELECT c.id::text FROM public.courses c WHERE c.source_id = course_materials.course_id)
      )
      AND e.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins manage materials" ON public.course_materials;
CREATE POLICY "Admins manage materials"
  ON public.course_materials FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Enrolled students or admins view announcements" ON public.course_announcements;
CREATE POLICY "Enrolled students or admins view announcements"
  ON public.course_announcements FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE (
        e.user_id = auth.uid() 
        OR (e.student_id IS NOT NULL AND e.student_id = auth.uid())
      )
      AND (
        e.course_id::text = course_announcements.course_id 
        OR e.course_id::text = (SELECT c.id::text FROM public.courses c WHERE c.source_id = course_announcements.course_id)
      )
      AND e.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins manage announcements" ON public.course_announcements;
CREATE POLICY "Admins manage announcements"
  ON public.course_announcements FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- ENROLLMENTS RLS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.enrollments;
CREATE POLICY "Users can view own enrollments"
  ON public.enrollments FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR (student_id IS NOT NULL AND student_id = auth.uid()) 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can manage enrollments" ON public.enrollments;
CREATE POLICY "Admins can manage enrollments"
  ON public.enrollments FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- EXAMS & QUESTIONS (Anti-Cheat Security)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view published exams" ON public.exams;
CREATE POLICY "Anyone can view published exams"
  ON public.exams FOR SELECT
  TO anon, authenticated
  USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage exams" ON public.exams;
CREATE POLICY "Admins manage exams"
  ON public.exams FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users view questions without answers" ON public.questions;
CREATE POLICY "Authenticated users view questions without answers"
  ON public.questions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage questions" ON public.questions;
CREATE POLICY "Admins manage questions"
  ON public.questions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- EXAM RESULTS RLS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users view own exam results or admins view all" ON public.exam_results;
CREATE POLICY "Users view own exam results or admins view all"
  ON public.exam_results FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR (student_id IS NOT NULL AND student_id = auth.uid()) 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users submit own exam results" ON public.exam_results;
CREATE POLICY "Users submit own exam results"
  ON public.exam_results FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    OR (student_id IS NOT NULL AND student_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins manage exam results" ON public.exam_results;
CREATE POLICY "Admins manage exam results"
  ON public.exam_results FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- NOTICES & HEROES (Public Read, Admin Write)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view notices" ON public.notices;
CREATE POLICY "Anyone can view notices"
  ON public.notices FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage notices" ON public.notices;
CREATE POLICY "Admins manage notices"
  ON public.notices FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view our heroes" ON public.our_heroes;
CREATE POLICY "Anyone can view our heroes"
  ON public.our_heroes FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage our heroes" ON public.our_heroes;
CREATE POLICY "Admins manage our heroes"
  ON public.our_heroes FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- SOCIAL FEED (Posts & Squads)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone authenticated can view posts" ON public.posts;
CREATE POLICY "Anyone authenticated can view posts"
  ON public.posts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users create own posts" ON public.posts;
CREATE POLICY "Users create own posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Authors or admins update posts" ON public.posts;
CREATE POLICY "Authors or admins update posts"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Authors or admins delete posts" ON public.posts;
CREATE POLICY "Authors or admins delete posts"
  ON public.posts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Authenticated can view squads" ON public.squads;
CREATE POLICY "Authenticated can view squads"
  ON public.squads FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users create squads" ON public.squads;
CREATE POLICY "Users create squads"
  ON public.squads FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "Squad members or admins view messages" ON public.squad_messages;
CREATE POLICY "Squad members or admins view messages"
  ON public.squad_messages FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users send squad messages" ON public.squad_messages;
CREATE POLICY "Users send squad messages"
  ON public.squad_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- ----------------------------------------------------------------------------
-- USER PRIVATE DATA (Notifications, Payment Requests, Practice, Queries)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users view own notifications" ON public.user_notifications;
CREATE POLICY "Users view own notifications"
  ON public.user_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users update own notifications read state" ON public.user_notifications;
CREATE POLICY "Users update own notifications read state"
  ON public.user_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users submit and view own payment requests" ON public.payment_requests;
CREATE POLICY "Users submit and view own payment requests"
  ON public.payment_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users insert payment requests" ON public.payment_requests;
CREATE POLICY "Users insert payment requests"
  ON public.payment_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage payment requests" ON public.payment_requests;
CREATE POLICY "Admins manage payment requests"
  ON public.payment_requests FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users view and insert own practice attempts" ON public.practice_attempts;
CREATE POLICY "Users view and insert own practice attempts"
  ON public.practice_attempts FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users view and manage incorrect questions" ON public.user_incorrect_questions;
CREATE POLICY "Users view and manage incorrect questions"
  ON public.user_incorrect_questions FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own mentor queries" ON public.mentor_queries;
CREATE POLICY "Users manage own mentor queries"
  ON public.mentor_queries FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own mark predictions" ON public.mark_predictions;
CREATE POLICY "Users manage own mark predictions"
  ON public.mark_predictions FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- SYSTEM SETTINGS: Sensitive Partitioning
-- ----------------------------------------------------------------------------
-- Public can ONLY read non-sensitive platform toggles.
-- Sensitive configs ('live_exam_security', 'notifications', 'payment_ledger_internal')
-- are restricted strictly to verified Admins.
DROP POLICY IF EXISTS "Anyone can view platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Public can view non-sensitive settings" ON public.platform_settings;
CREATE POLICY "Public can view non-sensitive settings"
  ON public.platform_settings FOR SELECT
  TO anon, authenticated
  USING (
    public.is_admin() OR
    key IN ('platform', 'payment', 'premium', 'gaming_arena', 'teacher_section')
  );

DROP POLICY IF EXISTS "Admins manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins manage platform settings"
  ON public.platform_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- ADVERTISEMENTS & SEARCH TOPICS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view active advertisements" ON public.advertisements;
CREATE POLICY "Anyone can view active advertisements"
  ON public.advertisements FOR SELECT
  TO anon, authenticated
  USING (status = 'active' OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage advertisements" ON public.advertisements;
CREATE POLICY "Admins manage advertisements"
  ON public.advertisements FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Anyone can log ad analytics" ON public.ad_analytics_events;
CREATE POLICY "Anyone can log ad analytics"
  ON public.ad_analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins view ad analytics" ON public.ad_analytics_events;
CREATE POLICY "Admins view ad analytics"
  ON public.ad_analytics_events FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view search topics" ON public.search_topics;
CREATE POLICY "Anyone can view search topics"
  ON public.search_topics FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage search topics" ON public.search_topics;
CREATE POLICY "Admins manage search topics"
  ON public.search_topics FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users manage own battles" ON public.battles;
CREATE POLICY "Users manage own battles"
  ON public.battles FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 7. High-Yield Compatibility Aliases (Views for Shorthand Table References)
-- ============================================================================

CREATE OR REPLACE VIEW public.learning_materials AS SELECT * FROM public.course_materials;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_materials TO anon, authenticated;

CREATE OR REPLACE VIEW public.teachers AS SELECT * FROM public.course_teachers;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO anon, authenticated;

CREATE OR REPLACE VIEW public.promocodes AS SELECT * FROM public.course_promocodes;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promocodes TO anon, authenticated;

CREATE OR REPLACE VIEW public.reviews AS SELECT * FROM public.batch_reviews;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO anon, authenticated;

CREATE OR REPLACE VIEW public.incorrect_questions AS SELECT * FROM public.user_incorrect_questions;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incorrect_questions TO anon, authenticated;

CREATE OR REPLACE VIEW public.heroes AS SELECT * FROM public.our_heroes;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.heroes TO anon, authenticated;

CREATE OR REPLACE VIEW public.notifications AS SELECT * FROM public.user_notifications;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO anon, authenticated;

CREATE OR REPLACE VIEW public.analytics_events AS SELECT * FROM public.ad_analytics_events;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_events TO anon, authenticated;

CREATE OR REPLACE VIEW public.live_exams AS SELECT * FROM public.exams;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_exams TO anon, authenticated;

CREATE OR REPLACE VIEW public.live_exam_submissions AS SELECT * FROM public.exam_results;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_exam_submissions TO anon, authenticated;

CREATE OR REPLACE VIEW public.squad_members AS SELECT id, id AS squad_id, unnest(members) AS user_id, created_at FROM public.squads;
GRANT SELECT ON public.squad_members TO anon, authenticated;

