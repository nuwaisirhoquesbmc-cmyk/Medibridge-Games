import { Course, CourseDemoClass, CourseDemoExam } from "../types/courseTypes";
import { Question } from "../types";

/**
 * Checks if Demo Class is enabled by Admin and has valid content
 */
export function isDemoClassEnabled(_course?: Course | null): boolean {
  // Course demo classes removed per user instruction
  return false;
}

/**
 * Checks if Demo Exam is enabled by Admin and has valid questions or settings
 */
export function isDemoExamEnabled(course?: Course | null): boolean {
  if (!course) return false;
  // If explicitly disabled by admin, return false
  if (course.demoExamEnabled === false) return false;
  // If explicitly enabled or has attached demo exam / questions
  const hasContent = Boolean(
    course.demoExam ||
    (course.demoExamQuestions && course.demoExamQuestions.length > 0) ||
    course.demoExamTitle
  );
  return Boolean(course.demoExamEnabled || hasContent);
}

/**
 * Standard default medical demo questions for course mock tests
 */
export const DEFAULT_DEMO_EXAM_QUESTIONS: Question[] = [
  {
    id: "demo_q1_bio",
    questionText: "কোষপ্রাচীরের প্রধান গাঠনিক উপাদান নিচের কোনটি?",
    options: ["সেলুলোজ", "গ্লাইকোজেন", "কাইটিন", "পেপটিডোগ্লাইকান"],
    correctAnswerIndex: 0,
    explanation: "উদ্ভিদ কোষের কোষপ্রাচীরের প্রধান উপাদান সেলুলোজ (Cellulose), যা বিটা-ডি-গ্লুকোজের পলিমার। ছত্রাকের কোষপ্রাচীর কাইটিন এবং ব্যাকটেরিয়ার পেপটিডোগ্লাইকান দ্বারা গঠিত।",
    subject: "Biology",
    chapter: "কোষ ও এর গঠন",
    topic: "কোষপ্রাচীর",
    difficulty: "Easy"
  },
  {
    id: "demo_q2_bio",
    questionText: "কোষের প্রোটিন তৈরির কারখানা (Protein Factory) বলা হয় কাকে?",
    options: ["মাইটোকন্ড্রিয়া", "রাইবোজোম", "লাইসোজোম", "গলগি বস্তু"],
    correctAnswerIndex: 1,
    explanation: "রাইবোজোম এমআরএনএ (mRNA) থেকে প্রোটিন সংশ্লেষণ করে বলে একে কোষের 'প্রোটিন কারখানা' বলা হয়।",
    subject: "Biology",
    chapter: "কোষ ও এর গঠন",
    topic: "রাইবোজোম",
    difficulty: "Easy"
  },
  {
    id: "demo_q3_chem",
    questionText: "একটি পরমাণুর ৩য় শক্তিস্তরে (n=3) সর্বোচ্চ কতটি ইলেকট্রন থাকতে পারে?",
    options: ["৮টি", "১৮টি", "৩২টি", "২টি"],
    correctAnswerIndex: 1,
    explanation: "বোর সূত্রানুসারে n-তম কক্ষপথে সর্বোচ্চ ইলেকট্রন সংখ্যা = 2n²। ৩য় স্তরের জন্য 2*(3)² = 18 টি ইলেকট্রন।",
    subject: "Chemistry",
    chapter: "গুণগত রসায়ন",
    topic: "কোয়ান্টাম সংখ্যা ও বোর তত্ত্ব",
    difficulty: "Medium"
  },
  {
    id: "demo_q4_phys",
    questionText: "দুটি সমমানের ভেক্টরের লব্ধির মান যেকোনো একটি ভেক্টরের সমান হলে মধ্যবর্তী কোণ কত?",
    options: ["0°", "90°", "120°", "180°"],
    correctAnswerIndex: 2,
    explanation: "যদি P = Q এবং R = P হয়, তবে R² = P² + Q² + 2PQ cosθ সূত্র থেকে cosθ = -1/2 পাওয়া যায়, অর্থাৎ θ = 120°।",
    subject: "Physics",
    chapter: "ভেক্টর",
    topic: "ভেক্টর যোজন ও লব্ধি",
    difficulty: "Medium"
  },
  {
    id: "demo_q5_gk",
    questionText: "মুক্তিযুদ্ধের সময় সমগ্র বাংলাদেশকে কয়টি সামরিক সেক্টরে বিভক্ত করা হয়েছিল?",
    options: ["৮টি", "১০টি", "১১টি", "৬৪টি"],
    correctAnswerIndex: 2,
    explanation: "১৯৭১ সালের মুক্তিযুদ্ধে যুদ্ধ পরিচালনার সুবিধার্থে সমগ্র বাংলাদেশকে ১১টি সেক্টর এবং ৬৪টি সাব-সেক্টরে বিভক্ত করা হয়েছিল।",
    subject: "GK",
    chapter: "বাংলাদেশের মুক্তিযুদ্ধ",
    topic: "সেক্টর ও সেক্টর কমান্ডার",
    difficulty: "Easy"
  },
  {
    id: "demo_q6_eng",
    questionText: "Choose the correct spelling:",
    options: ["Hemorrhage", "Hemorhage", "Hemmorhage", "Haemorhage"],
    correctAnswerIndex: 0,
    explanation: "সঠিক মেডিকেল বানান হলো 'Hemorrhage' (বা British বানানে 'Haemorrhage') যার অর্থ রক্তক্ষরণ।",
    subject: "English",
    chapter: "Spelling & Vocabulary",
    topic: "Medical Terms",
    difficulty: "Hard"
  }
];

/**
 * Returns structured CourseDemoExam object for a given course
 */
export function getCourseDemoExam(course: Course): CourseDemoExam {
  if (course.demoExam && course.demoExam.questions && course.demoExam.questions.length > 0) {
    return course.demoExam;
  }

  const questions = (course.demoExamQuestions && course.demoExamQuestions.length > 0)
    ? course.demoExamQuestions
    : DEFAULT_DEMO_EXAM_QUESTIONS;

  return {
    id: `demo_exam_${course.id}`,
    courseId: course.id,
    title: course.demoExamTitle || `${course.title} - ফ্রি ডেমো টেস্ট ও স্পেশাল মডেল এক্সাম`,
    subject: course.demoExamSubject || course.subjects?.[0] || "Medical Combined",
    durationMinutes: course.demoExamDurationMinutes || 10,
    totalQuestions: course.demoExamTotalQuestions || questions.length,
    passMarks: course.demoExamPassMarks || Math.ceil(questions.length * 0.4),
    negativeMarking: course.demoExamNegativeMarking ?? 0.25,
    description: "মেডিকেল ভর্তি পরীক্ষার স্ট্যান্ডার্ড টাইম লিমিট ও নেগেটিভ মার্কিং সহ একটি কমপ্লিট ফ্রি ডেমো মডেল টেস্ট। পরীক্ষা শেষে সাথে সাথে রেজাল্ট, জাতীয় র‍্যাংক প্রিভিউ ও বিস্তারিত ব্যাখ্যা দেখতে পারবেন।",
    instructions: [
      "প্রতিটি সঠিক উত্তরের জন্য পাবেন ১.০০ নম্বর।",
      "প্রতিটি ভুল উত্তরের জন্য কাটা যাবে ০.২৫ নম্বর (নেগেটিভ মার্কিং)।",
      "পরীক্ষা চলাকালীন ট্যাব পরিবর্তন বা উইন্ডো মিনিমাইজ করলে অ্যালার্ট আসবে।",
      "নির্দিষ্ট সময়ের মধ্যে পরীক্ষা সাবমিট করতে হবে।"
    ],
    questions,
    isPublished: true
  };
}
