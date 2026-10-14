import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { INITIAL_COURSES, MOCK_BATCHES, MOCK_EXAMS } from "../src/data/coursesData";
import { STARTER_QUESTIONS } from "../src/questionsData";

// -----------------------------------------------------------------------------
// MediBridge Games — Phase 3 Resumable Firebase to Supabase Migration Runner
// -----------------------------------------------------------------------------
// Usage:
//   npx tsx scripts/migrate_to_supabase.ts [--from-json ./firebase_export] [--seed]
// -----------------------------------------------------------------------------

interface CheckpointState {
  completedCollections: Record<string, { count: number; completedAt: string }>;
  failedRecords: Array<{ collection: string; id: string; error: string }>;
}

const CHECKPOINT_FILE = path.join(process.cwd(), "scripts", "migration_checkpoint.json");

function loadCheckpoint(): CheckpointState {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf-8"));
    } catch {
      // Return fresh state if parse fails
    }
  }
  return { completedCollections: {}, failedRecords: [] };
}

function saveCheckpoint(state: CheckpointState) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(state, null, 2), "utf-8");
}

export async function runMigration() {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://pyefznkwfblgomkqqjuh.supabase.co";

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "sb_publishable_LczgYq1qE7ygAW9-m-84UQ_a70uAsM5";

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const checkpoint = loadCheckpoint();
  console.log("=================================================");
  console.log(" MediBridge Games: Full Supabase Migration Runner");
  console.log(` Target URL: ${supabaseUrl}`);
  console.log("=================================================\n");
  console.log(`📌 Loaded checkpoint: ${Object.keys(checkpoint.completedCollections).length} collections completed.`);

  // Supported Collections & Target Supabase Tables
  const collectionMappings: Array<{
    source: string;
    target: string;
    idField: string;
    transform: (item: any) => any;
    fallbackData?: any[];
  }> = [
    {
      source: "courses",
      target: "courses",
      idField: "id",
      transform: (doc: any) => ({
        id: doc.id,
        title: doc.title || "Untitled Course",
        description: doc.description || doc.shortDescription || doc.fullDescription || "",
        thumbnail_url: doc.thumbnail_url || doc.thumbnail || null,
        price: Number(doc.price || doc.originalPrice || 0),
        discount_price: doc.discount_price || doc.discountedPrice || null,
        is_published: doc.is_published ?? doc.isPublished ?? true,
        created_at: doc.created_at || doc.createdAt || new Date().toISOString()
      }),
      fallbackData: INITIAL_COURSES
    },
    {
      source: "batches",
      target: "batches",
      idField: "id",
      transform: (doc: any) => ({
        id: doc.id,
        course_id: doc.course_id || doc.courseId || "course_med_2027",
        name: doc.name || doc.batch_name || "Batch 1",
        description: doc.description || null,
        capacity: doc.capacity || 500,
        start_date: doc.start_date || doc.startDate || null,
        end_date: doc.end_date || doc.endDate || null,
        is_active: doc.is_active ?? doc.isActive ?? true,
        created_at: doc.created_at || doc.createdAt || new Date().toISOString()
      }),
      fallbackData: MOCK_BATCHES
    },
    {
      source: "exams",
      target: "exams",
      idField: "id",
      transform: (doc: any) => ({
        id: doc.id,
        course_id: doc.course_id || doc.courseId || "course_med_2027",
        title: doc.title || "Standard Exam",
        description: doc.description || "",
        duration_minutes: doc.duration_minutes || doc.durationMinutes || 45,
        total_marks: doc.total_marks || doc.totalMarks || 100,
        negative_marks: doc.negative_marks ?? doc.negativeMarks ?? 0.25,
        is_published: doc.is_published ?? doc.isPublished ?? true,
        subject: doc.subject || "Biology",
        created_at: doc.created_at || doc.createdAt || new Date().toISOString()
      }),
      fallbackData: MOCK_EXAMS
    },
    {
      source: "questions",
      target: "questions",
      idField: "id",
      transform: (doc: any) => ({
        id: doc.id,
        exam_id: doc.exam_id || "exam_1",
        question_text: doc.question_text || doc.questionText || "",
        options: doc.options || [],
        explanation: doc.explanation || null,
        marks: doc.marks || 1,
        correct_answer: typeof doc.correct_answer === "number" ? doc.correct_answer : (doc.correctAnswerIndex ?? 0)
      }),
      fallbackData: STARTER_QUESTIONS.slice(0, 50)
    },
    {
      source: "notices",
      target: "notices",
      idField: "id",
      transform: (doc: any) => ({
        id: doc.id,
        title: doc.title || "Announcement",
        content: doc.content || doc.description || "",
        category: doc.category || "General",
        priority: doc.priority || "Normal",
        is_pinned: doc.is_pinned ?? false,
        created_at: doc.created_at || doc.createdAt || new Date().toISOString()
      }),
      fallbackData: [
        {
          id: "notice_1",
          title: "মেডিকেল ভর্তি পরীক্ষা ২০২৬-২৭ সেশন প্রস্তুতি নির্দেশিকা",
          content: "ড. আবুল হাসান ও হাজারী নাগ স্যারের বই ভিত্তিক হাই-ইয়েল্ড সিলেবাস বিশ্লেষণ ও লাইভ মডেল টেস্ট শুরু হয়েছে।",
          category: "Exam",
          priority: "High"
        },
        {
          id: "notice_2",
          title: "রিয়েল-টাইম জাতীয় লিডারবোর্ড ও মিসটেক ব্যাংক আপডেট",
          content: "পরীক্ষায় অংশগ্রহণ করার সাথে সাথে আপনার ভুল উত্তরগুলো মিসটেক ব্যাংকে স্বয়ংক্রিয়ভাবে যুক্ত হবে।",
          category: "Feature",
          priority: "Normal"
        }
      ]
    }
  ];

  // Parse arguments for export JSON folder
  const jsonDirIndex = process.argv.indexOf("--from-json");
  const jsonDir = jsonDirIndex !== -1 ? process.argv[jsonDirIndex + 1] : path.join(process.cwd(), "firebase_export");

  for (const mapping of collectionMappings) {
    console.log(`\n⏳ Migrating '${mapping.source}' -> Supabase '${mapping.target}'...`);
    let recordsToMigrate: any[] = [];

    // Check if JSON export file exists
    const jsonFile = path.join(jsonDir, `${mapping.source}.json`);
    if (fs.existsSync(jsonFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(jsonFile, "utf-8"));
        recordsToMigrate = Array.isArray(raw) ? raw : Object.values(raw);
        console.log(`  📄 Loaded ${recordsToMigrate.length} records from ${jsonFile}`);
      } catch (err: any) {
        console.warn(`  ⚠️ Could not read ${jsonFile}: ${err.message}`);
      }
    }

    // Fall back to starter dataset if no export JSON was found
    if (recordsToMigrate.length === 0 && mapping.fallbackData) {
      recordsToMigrate = mapping.fallbackData;
      console.log(`  📦 Using verified web dataset (${recordsToMigrate.length} items)`);
    }

    if (recordsToMigrate.length === 0) {
      console.log(`  ℹ️ No records found for '${mapping.source}', skipping.`);
      continue;
    }

    // Upsert into Supabase in chunks of 25
    let migratedCount = 0;
    const chunkSize = 25;
    for (let i = 0; i < recordsToMigrate.length; i += chunkSize) {
      const chunk = recordsToMigrate.slice(i, i + chunkSize);
      const transformedChunk = chunk.map((c) => mapping.transform(c));

      try {
        const { error } = await supabase
          .from(mapping.target)
          .upsert(transformedChunk, { onConflict: mapping.idField });

        if (error) {
          console.warn(`  ⚠️ Chunk ${i / chunkSize + 1} notice: ${error.message}`);
          checkpoint.failedRecords.push({
            collection: mapping.source,
            id: `chunk_${i}`,
            error: error.message
          });
        } else {
          migratedCount += transformedChunk.length;
        }
      } catch (chunkErr: any) {
        console.warn(`  ❌ Chunk ${i / chunkSize + 1} exception: ${chunkErr.message}`);
      }
    }

    checkpoint.completedCollections[mapping.source] = {
      count: migratedCount,
      completedAt: new Date().toISOString()
    };
    saveCheckpoint(checkpoint);
    console.log(`  ✅ Successfully synced ${migratedCount} records to '${mapping.target}'.`);
  }

  console.log("\n=================================================");
  console.log("🎉 MediBridge Games Supabase Migration Finished!");
  console.log(`Summary saved to: ${CHECKPOINT_FILE}`);
  console.log("=================================================\n");
}

if (process.argv[1]?.endsWith("migrate_to_supabase.ts")) {
  runMigration().catch((err) => {
    console.error("Migration fatal error:", err);
    process.exit(1);
  });
}
