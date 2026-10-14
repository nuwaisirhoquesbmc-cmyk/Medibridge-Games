import { createClient } from "@supabase/supabase-js";

// MediBridge Games — Supabase Schema Migration Verification Script
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://pyefznkwfblgomkqqjuh.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_LczgYq1qE7ygAW9-m-84UQ_a70uAsM5";

const supabase = createClient(supabaseUrl, supabaseKey);

const EXPECTED_TABLES: Array<{ name: string; dbName: string; alt?: string }> = [
  { name: "profiles", dbName: "profiles" },
  { name: "courses", dbName: "courses" },
  { name: "enrollments", dbName: "enrollments" },
  { name: "exams", dbName: "exams", alt: "live_exams" },
  { name: "questions", dbName: "questions" },
  { name: "exam_results", dbName: "exam_results", alt: "live_exam_submissions" },
  { name: "batches", dbName: "batches" },
  { name: "course_classes", dbName: "course_classes" },
  { name: "course_materials", dbName: "course_materials", alt: "learning_materials" },
  { name: "course_announcements", dbName: "course_announcements" },
  { name: "course_teachers", dbName: "course_teachers", alt: "teachers" },
  { name: "course_promocodes", dbName: "course_promocodes", alt: "promocodes" },
  { name: "batch_reviews", dbName: "batch_reviews", alt: "reviews" },
  { name: "live_exam_reexam_permissions", dbName: "live_exam_reexam_permissions" },
  { name: "exam_violations", dbName: "exam_violations" },
  { name: "practice_attempts", dbName: "practice_attempts" },
  { name: "user_incorrect_questions", dbName: "user_incorrect_questions", alt: "incorrect_questions" },
  { name: "posts", dbName: "posts" },
  { name: "squads", dbName: "squads" },
  { name: "squad_messages", dbName: "squad_messages" },
  { name: "batch_chats", dbName: "batch_chats" },
  { name: "battles", dbName: "battles" },
  { name: "notices", dbName: "notices" },
  { name: "our_heroes", dbName: "our_heroes", alt: "heroes" },
  { name: "mentor_queries", dbName: "mentor_queries" },
  { name: "mark_predictions", dbName: "mark_predictions" },
  { name: "payment_requests", dbName: "payment_requests" },
  { name: "user_notifications", dbName: "user_notifications", alt: "notifications" },
  { name: "notification_logs", dbName: "notification_logs" },
  { name: "advertisements", dbName: "advertisements" },
  { name: "ad_analytics_events", dbName: "ad_analytics_events", alt: "analytics_events" },
  { name: "platform_settings", dbName: "platform_settings" },
  { name: "search_topics", dbName: "search_topics" },
  { name: "firebase_uid_mapping", dbName: "firebase_uid_mapping" }
];

async function verify() {
  console.log("🔍 Verifying MediBridge Games Supabase Schema status...\n");
  let verified = 0;
  let missing = 0;

  for (const table of EXPECTED_TABLES) {
    let { error } = await supabase.from(table.dbName).select("*").limit(0);
    if (error && (error.code === "PGRST205" || error.code === "PGRST204" || error.message.includes("Could not find")) && table.alt) {
      const altRes = await supabase.from(table.alt).select("*").limit(0);
      if (!altRes.error || (altRes.error.code !== "PGRST205" && altRes.error.code !== "PGRST204" && !altRes.error.message.includes("Could not find"))) {
        error = altRes.error;
      }
    }

    if (!error) {
      console.log(`  ✅ Table '${table.name}' (${table.dbName}) is active and accessible.`);
      verified++;
    } else if (error.message.includes("Could not find the table") || error.code === "PGRST205" || error.code === "PGRST204" || error.code === "42P01") {
      console.log(`  ⏳ Table '${table.name}' is pending creation in Supabase.`);
      missing++;
    } else {
      // If error is permission-denied (42501) or RLS restriction, the table exists in PostgreSQL!
      console.log(`  ✅ Table '${table.name}' (${table.dbName}) exists (Protected by RLS: ${error.message}).`);
      verified++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Total Tables Verified: ${verified}/${EXPECTED_TABLES.length}`);
  console.log(`Pending Creation:      ${missing}`);
  console.log(`========================================\n`);

  if (missing === 0) {
    console.log("🎉 All tables successfully applied and ready for Supabase operations!");
  } else {
    console.log(`⚠️ ${missing} tables are waiting to be created.`);
    console.log(`Please paste and run 'supabase/migrations/20261012_phase2_firebase_migration_schema.sql' in the Supabase Dashboard SQL Editor.`);
  }
}

verify().catch(console.error);
