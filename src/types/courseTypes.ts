import { Question } from "../types";

export interface CourseRoutineItem {
  id: string;
  dayOrDate: string;
  time: string;
  type: "class" | "exam" | "revision" | "doubt_solve" | "model_test";
  title: string;
  subject: string;
  teacherName?: string;
  linkUrl?: string;
  roomOrBatch?: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  thumbnail: string;
  banner: string;
  instructorName: string;
  instructorTitle: string;
  instructorAvatar: string;
  duration: string;
  totalExams: number;
  totalClasses: number;
  totalMaterials: number;
  subjects: string[];
  syllabus: {
    subject: string;
    chapters: {
      chapterTitle: string;
      topics: string[];
    }[];
  }[];
  syllabusPdfUrl?: string;
  syllabusSummary?: string;
  features: string[];
  benefits: string[];
  examInfo: string;
  classInfo: string;
  routineSummary?: string;
  routinePdfUrl?: string;
  routineImageUrl?: string;
  routineItems?: CourseRoutineItem[];
  reviews: {
    id: string;
    studentName: string;
    rating: number;
    comment: string;
    date: string;
  }[];
  faq: {
    question: string;
    answer: string;
  }[];
  originalPrice: number;
  discountedPrice: number;
  defaultBatchId: string;
  totalEnrolled?: number;
  aspectRatio?: "16:9" | "4:3" | "3:4" | "1:1";
  teachers?: CourseTeacher[];
  showOnLandingPage?: boolean;
  isFeatured?: boolean;
  demoClassEnabled?: boolean;
  demoVideoUrl?: string;
  demoVideoTitle?: string;
  demoVideoDuration?: string;
  demoVideoSubject?: string;
  demoPdfUrl?: string;
  demoClasses?: CourseDemoClass[];
  demoExamEnabled?: boolean;
  demoExam?: CourseDemoExam;
  demoExamTitle?: string;
  demoExamSubject?: string;
  demoExamDurationMinutes?: number;
  demoExamTotalQuestions?: number;
  demoExamPassMarks?: number;
  demoExamNegativeMarking?: number;
  demoExamQuestions?: Question[];
  createdAt: string;
  updatedAt?: string;
}

export interface CourseDemoExam {
  id: string;
  courseId: string;
  title: string;
  subject: string;
  durationMinutes: number;
  totalQuestions: number;
  passMarks: number;
  negativeMarking?: number;
  description?: string;
  instructions?: string[];
  questions: Question[];
  isPublished?: boolean;
  createdAt?: string;
}

export interface CourseDemoClass {
  id: string;
  courseId: string;
  title: string;
  subject: string;
  instructor: string;
  instructorTitle?: string;
  instructorCollege?: string;
  instructorAvatar?: string;
  youtubeUrl: string;
  duration?: string;
  description?: string;
  topics?: string[];
  lecturePdfUrl?: string;
  isFree?: boolean;
  viewCount?: number;
  featured?: boolean;
  createdAt?: string;
}

export interface CourseTeacher {
  id: string;
  name: string;
  title: string;
  medicalCollege?: string;
  avatar: string;
  subject: string;
  bio?: string;
  phone?: string;
  email?: string;
  assignedCourseIds?: string[];
  isLead?: boolean;
  createdAt?: string;
}

export interface Batch {
  id: string;
  courseId: string;
  batchName: string;
  name?: string;
  batchSlug: string;
  teacherIds: string[];
  totalStudents: number;
  price: number;
  originalPrice: number;
  discountedPrice: number;
  startDate: string;
  endDate: string;
  accessUntil: string;
  scheduleDetails: string;
  createdAt: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  courseId: string;
  batchId: string;
  courseSlug: string;
  batchSlug: string;
  courseTitle: string;
  batchName: string;
  status: "active" | "expired" | "cancelled";
  enrolledAt: string;
  expiresAt: string;
  progressPct: number;
  lastAccessedAt: string;
  completedExams: string[];
  completedClasses: string[];
  viewedMaterials: string[];
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  courseId: string;
  batchId: string;
  courseTitle: string;
  batchName: string;
  amount: number;
  originalAmount: number;
  discountAmount: number;
  couponCode?: string;
  paymentMethod: "bkash" | "nagad" | "card";
  transactionId: string;
  senderNumber: string;
  status: "pending" | "paid" | "failed" | "cancelled" | "refunded";
  createdAt: string;
  verifiedAt?: string;
}

export interface CourseClass {
  id: string;
  courseId: string;
  batchId: string;
  title: string;
  description: string;
  instructor: string;
  isLive: boolean;
  platform?: "youtube" | "google_meet" | "dual" | "zoom" | "other";
  liveUrl?: string;
  youtubeLiveUrl?: string;
  googleMeetUrl?: string;
  meetingCode?: string;
  recordingUrl?: string;
  date: string;
  time?: string;
  durationMinutes: number;
  subject: string;
  chapter: string;
  materialsUrl?: string;
  status?: "live_now" | "upcoming" | "ended";
  createdAt: string;
}

export interface CourseMaterial {
  id: string;
  courseId: string;
  batchId: string;
  title: string;
  type: "pdf" | "note" | "lecture_sheet" | "question_bank" | "revision";
  fileUrl: string;
  fileSize?: string;
  subject: string;
  chapter: string;
  createdAt: string;
}

export interface CourseAnnouncement {
  id: string;
  courseId: string;
  batchId?: string;
  title: string;
  content: string;
  authorName: string;
  authorRole: string;
  authorAvatar?: string;
  priority: "high" | "normal";
  isPinned?: boolean;
  tag?: string;
  linkUrl?: string;
  linkText?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LiveExamSecuritySettings {
  tabSwitchDetection: boolean;
  maxAllowedViolations: number;
  autoSubmitOnMaxViolations: boolean;
  warningMessageBn?: string;
  warningMessageEn?: string;
  violationMessageBn?: string;
  violationMessageEn?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ExamViolationRecord {
  id: string;
  exam_attempt_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  exam_id: string;
  exam_title: string;
  violation_type: "TAB_SWITCH" | "WINDOW_BLUR" | "PAGE_HIDDEN" | "APP_BACKGROUND" | string;
  violation_count: number;
  max_allowed: number;
  timestamp: string;
  device_info?: string;
}

export interface CourseExam {
  id: string;
  courseId: string;
  batchId: string;
  title: string;
  subject: string;
  chapter?: string;
  durationMinutes: number;
  totalQuestions: number;
  passMarks: number;
  questions: Question[];
  startTime: string;
  endTime: string;
  isPublished: boolean;
  isLive?: boolean;
  status?: "live_now" | "upcoming" | "ended";
  isMeritPublished?: boolean;
  meritPublishedAt?: string;
  isPracticeExam?: boolean;
  securitySettings?: Partial<LiveExamSecuritySettings>;
  createdAt: string;
}

export interface CourseExamAttempt {
  id: string;
  userId: string;
  userDisplayName: string;
  userAvatar?: string;
  courseId: string;
  batchId: string;
  examId: string;
  examTitle: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  accuracyPct: number;
  rank?: number;
  percentile?: number;
  answers: Record<string, number>; // questionId -> selectedIndex
  submittedAt: string;
  tabSwitchCount?: number;
  autoSubmittedDueToCheating?: boolean;
  violations?: ExamViolationRecord[];
}

export interface MistakeBankItem {
  id: string;
  userId: string;
  courseId: string;
  batchId: string;
  questionId: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  userWrongIndex: number;
  explanation: string;
  subject: string;
  chapter: string;
  topic?: string;
  timestamp: string;
  reviewed: boolean;
}

export interface LiveExamReExamPermission {
  id: string; // reexam_${examId}_${userId}
  examId: string;
  examTitle: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  grantedBy: string;
  grantedAt: string;
  status: "active" | "used" | "revoked";
  reason?: string;
  attemptsAllowed?: number;
}

export interface CouponUsageLog {
  userId: string;
  userEmail?: string;
  userName?: string;
  courseId: string;
  courseTitle: string;
  batchId?: string;
  batchName?: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  transactionId?: string;
  usedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: "fixed" | "percentage";
  discountValue: number;
  minOrderAmount: number;
  expiryDate: string;
  usageCount: number;
  maxUsage: number;
  isActive: boolean;
  applicableScope?: "all" | "specific";
  applicableCourseIds?: string[];
  applicableCourseTitles?: string[];
  usageLogs?: CouponUsageLog[];
  totalDiscountGiven?: number;
  description?: string;
  createdAt?: string | any;
  updatedAt?: string | any;
}

export interface CoursePaymentSettings {
  bkashNumber: string;
  bkashType: "personal" | "merchant" | "agent";
  bkashInstructionBn?: string;
  bkashInstructionEn?: string;
  isBkashEnabled: boolean;

  nagadNumber: string;
  nagadType: "personal" | "merchant" | "agent";
  nagadInstructionBn?: string;
  nagadInstructionEn?: string;
  isNagadEnabled: boolean;

  rocketNumber: string;
  rocketType: "personal" | "merchant";
  rocketInstructionBn?: string;
  rocketInstructionEn?: string;
  isRocketEnabled: boolean;

  upayNumber?: string;
  isUpayEnabled?: boolean;

  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  bankRoutingNumber?: string;
  isBankEnabled?: boolean;

  generalProcessStepsBn?: string[];
  generalProcessStepsEn?: string[];
  helplinePhone?: string;
  helplineWhatsapp?: string;
  helplineEmail?: string;
  facebookPageName?: string;
  facebookPageUrl?: string;
  paymentNoticeBn?: string;
  paymentNoticeEn?: string;
  updatedAt?: string | any;
}

export type CourseEnrollment = Enrollment;
export type CourseMistake = MistakeBankItem;

export interface BatchChatMessage {
  id: string;
  courseId: string;
  batchId: string;
  userId: string;
  userName: string;
  userRole: "student" | "teacher" | "admin" | "mentor";
  userAvatar?: string;
  questionTitle?: string;
  text: string;
  subjectTag?: string;
  isUrgent?: boolean;
  isAnswered?: boolean;
  teacherAnswer?: {
    teacherId: string;
    teacherName: string;
    teacherAvatar?: string;
    answerText: string;
    answeredAt: string;
  };
  replies?: {
    id: string;
    userId: string;
    userName: string;
    userRole: string;
    text: string;
    createdAt: string;
  }[];
  helpfulCount?: number;
  upvotedUserIds?: string[];
  createdAt: string;
}

