import { createClient } from "@supabase/supabase-js";
import { INITIAL_COURSES, MOCK_BATCHES, MOCK_EXAMS } from "../src/data/coursesData";
import { STARTER_QUESTIONS } from "../src/questionsData";

// -----------------------------------------------------------------------------
// MediBridge Games — Primary Supabase Data Seeder & Migration Tool
// Seeds all core web datasets directly into Supabase PostgreSQL tables.
// -----------------------------------------------------------------------------

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://pyefznkwfblgomkqqjuh.supabase.co";

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_LczgYq1qE7ygAW9-m-84UQ_a70uAsM5";

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function seedData() {
  console.log("=================================================");
  console.log(" MediBridge Games: Supabase Data Migration & Seeder");
  console.log(` Target URL: ${supabaseUrl}`);
  console.log("=================================================\n");

  let seededCount = 0;

  // 1. Seed Courses
  console.log("📌 1/5 Migrating Courses to Supabase...");
  for (const course of INITIAL_COURSES) {
    try {
      const payload = {
        id: course.id,
        title: course.title,
        description: course.shortDescription || course.fullDescription,
        thumbnail_url: course.thumbnail,
        price: course.originalPrice || 0,
        discount_price: course.discountedPrice || null,
        is_published: true,
        features: course.features || [],
      };

      const { error } = await supabase.from("courses").upsert(payload, { onConflict: "id" });
      if (error) {
        console.warn(`  ⚠️ Course '${course.id}': ${error.message}`);
      } else {
        console.log(`  ✅ Course '${course.title}' synced.`);
        seededCount++;
      }
    } catch (e: any) {
      console.warn(`  ❌ Course error: ${e.message}`);
    }
  }

  // 2. Seed Batches
  console.log("\n📌 2/5 Migrating Batches to Supabase...");
  for (const batch of MOCK_BATCHES) {
    try {
      const b = batch as any;
      const payload = {
        id: b.id,
        course_id: b.courseId,
        name: b.name || b.batchName || b.batch_name || "Medical Batch",
        description: b.description || b.scheduleDetails || "",
        max_students: b.capacity || b.totalStudents || 500,
        start_date: b.startDate || new Date().toISOString(),
        end_date: b.endDate || new Date().toISOString(),
        status: "active",
      };

      const { error } = await supabase.from("batches").upsert(payload, { onConflict: "id" });
      if (error) {
        console.warn(`  ⚠️ Batch '${b.id}': ${error.message}`);
      } else {
        console.log(`  ✅ Batch '${payload.name}' synced.`);
        seededCount++;
      }
    } catch (e: any) {
      console.warn(`  ❌ Batch error: ${e.message}`);
    }
  }

  // 3. Seed Starter Exams
  console.log("\n📌 3/5 Migrating Starter Exams to Supabase...");
  for (const exam of MOCK_EXAMS.slice(0, 10)) {
    try {
      const ex = exam as any;
      const payload = {
        id: ex.id,
        course_id: ex.courseId || "course_med_2027",
        title: ex.title,
        description: ex.description || "",
        duration_minutes: ex.durationMinutes || 45,
        total_marks: ex.totalMarks || 100,
        negative_marks: ex.negativeMarks ?? 0.25,
        is_published: ex.isPublished ?? true,
        subject: ex.subject || "Biology",
      };

      const { error } = await supabase.from("exams").upsert(payload, { onConflict: "id" });
      if (error) {
        console.warn(`  ⚠️ Exam '${ex.id}': ${error.message}`);
      } else {
        console.log(`  ✅ Exam '${ex.title}' synced.`);
        seededCount++;
      }
    } catch (e: any) {
      console.warn(`  ❌ Exam error: ${e.message}`);
    }
  }

  // 4. Seed Questions
  console.log("\n📌 4/5 Migrating Questions Bank to Supabase...");
  const questionsToSeed = STARTER_QUESTIONS.slice(0, 50);
  for (let i = 0; i < questionsToSeed.length; i++) {
    const q = questionsToSeed[i] as any;
    try {
      const payload = {
        id: q.id || `q_starter_${i + 1}`,
        exam_id: "exam_1",
        question_text: q.questionText,
        options: q.options,
        explanation: q.explanation || "",
        marks: 1,
        correct_answer: q.correctAnswerIndex ?? 0,
      };

      const { error } = await supabase.from("questions").upsert(payload, { onConflict: "id" });
      if (!error) {
        seededCount++;
      }
    } catch (e) {}
  }
  console.log(`  ✅ Processed ${questionsToSeed.length} questions for Supabase questions table.`);

  // 5. Seed Notices
  console.log("\n📌 5/5 Migrating Notices to Supabase...");
  const starterNotices = [
    {
      id: "notice_1",
      title: "মেডিকেল ভর্তি পরীক্ষা ২০২৬-২৭ সেশন প্রস্তুতি নির্দেশিকা",
      content: "ড. আবুল হাসান ও হাজারী নাগ স্যারের বই ভিত্তিক হাই-ইয়েল্ড সিলেবাস বিশ্লেষণ ও লাইভ মডেল টেস্ট শুরু হয়েছে।",
      category: "Exam",
      priority: "High",
      created_at: new Date().toISOString(),
    },
    {
      id: "notice_2",
      title: "রিয়েল-টাইম জাতীয় লিডারবোর্ড ও মিসটেক ব্যাংক আপডেট",
      content: "পরীক্ষায় অংশগ্রহণ করার সাথে সাথে আপনার ভুল উত্তরগুলো মিসটেক ব্যাংকে স্বয়ংক্রিয়ভাবে যুক্ত হবে।",
      category: "Feature",
      priority: "Normal",
      created_at: new Date().toISOString(),
    },
  ];

  for (const n of starterNotices) {
    try {
      const { error } = await supabase.from("notices").upsert(n, { onConflict: "id" });
      if (!error) {
        console.log(`  ✅ Notice '${n.title.substring(0, 25)}...' synced.`);
        seededCount++;
      }
    } catch (e) {}
  }

  console.log("\n=================================================");
  console.log(`🎉 Supabase Migration Seeding Completed!`);
  console.log(`Total Records Synced: ${seededCount}`);
  console.log("=================================================");
}

seedData().catch((err) => {
  console.error("Migration seed error:", err);
});
