export type NotificationType =
  | "TEACHER_REPLY"
  | "NEW_NOTICE"
  | "NEW_ANNOUNCEMENT"
  | "NEW_EXAM"
  | "EXAM_SCHEDULE_CHANGE"
  | "EXAM_REMINDER"
  | "EXAM_RESULT"
  | "RESULT_PUBLISHED"
  | "NEW_CLASS"
  | "NEW_CLASS_RECORDING"
  | "NEW_MATERIAL"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "COURSE_ENROLLMENT"
  | "ASSIGNMENT_PUBLISHED"
  | "ASSIGNMENT_DEADLINE"
  | "LIVE_CLASS_STARTING"
  | "CERTIFICATE_ISSUED"
  | "ACHIEVEMENT_UNLOCKED"
  | "RANK_IMPROVED"
  | "STREAK_REMINDER"
  | "MANUAL_BROADCAST";

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export type NotificationAudience =
  | "all_students"
  | "specific_course"
  | "specific_batch"
  | "specific_student"
  | "batch_students"
  | "course_students"
  | "enrolled_students"
  | "teachers"
  | "all_users";

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  name: string;
  trigger: string;
  title: string;
  message: string;
  icon: string; // Lucide icon name
  priority: NotificationPriority;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  status: "active" | "disabled";
  category: "mentorship" | "exams" | "academic" | "announcement" | "financial" | "system";
  defaultActionUrl?: string;
  updatedAt: string;
}

export interface NotificationRuleTiming {
  remind24hBefore: boolean;
  remind1hBefore: boolean;
  remind15mBefore: boolean;
  remindAtStart: boolean;
}

export interface NotificationRule {
  id: string;
  type: NotificationType;
  name: string;
  triggerDesc: string;
  audience: NotificationAudience;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  priority: NotificationPriority;
  status: "active" | "disabled";
  timingRules?: NotificationRuleTiming;
  updatedAt: string;
}

export interface NotificationLog {
  id: string;
  notificationTitle: string;
  notificationMessage: string;
  type: NotificationType;
  trigger: "auto" | "manual";
  recipientId: string;
  recipientName: string;
  recipientAudience: string;
  channel: "in_app" | "push" | "both";
  deliveryStatus: "created" | "queued" | "sent" | "delivered" | "failed" | "read";
  pushStatus: "push_sent" | "push_delivered" | "push_failed" | "not_subscribed" | "disabled";
  priority: NotificationPriority;
  actionUrl?: string;
  sentAt: string;
  readAt?: string;
  errorMessage?: string;
}

export interface NotificationStats {
  totalTypes: number;
  activeRules: number;
  disabledRules: number;
  sentToday: number;
  pushSent: number;
  failedCount: number;
}

export interface NotificationEventVariables {
  student_name?: string;
  teacher_name?: string;
  course_name?: string;
  batch_name?: string;
  exam_name?: string;
  exam_date?: string;
  exam_time?: string;
  time_remaining?: string;
  result_score?: string | number;
  rank?: string | number;
  subject_name?: string;
  topic_name?: string;
  class_name?: string;
  payment_amount?: string | number;
  announcement_title?: string;
  notice_title?: string;
  material_name?: string;
  recording_title?: string;
  target_url?: string;
  [key: string]: any;
}

export interface NotificationEventPayload {
  type: NotificationType;
  recipientId?: string; // For single student
  recipientName?: string;
  courseId?: string;
  batchId?: string;
  variables: NotificationEventVariables;
  customActionUrl?: string;
  overridePriority?: NotificationPriority;
}
