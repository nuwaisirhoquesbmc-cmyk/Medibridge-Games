import { db } from "../firebase";
import { playSound } from "../audio";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  Timestamp
} from "firebase/firestore";
import {
  NotificationType,
  NotificationPriority,
  NotificationAudience,
  NotificationTemplate,
  NotificationRule,
  NotificationLog,
  NotificationStats,
  NotificationEventPayload,
  NotificationEventVariables
} from "../types/notificationTypes";

// ==========================================
// DEFAULT NOTIFICATION TEMPLATES
// ==========================================
export const DEFAULT_NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: "tpl_teacher_reply",
    type: "TEACHER_REPLY",
    name: "Teacher Reply",
    trigger: "Teacher replies to student doubt / discussion",
    title: "Teacher replied to your doubt",
    message: "{{teacher_name}} replied to your question about {{topic_name}}.",
    icon: "MessageCircle",
    priority: "NORMAL",
    inAppEnabled: true,
    pushEnabled: true,
    status: "active",
    category: "mentorship",
    defaultActionUrl: "/courses/discussions",
    updatedAt: new Date().toISOString()
  },
  {
    id: "tpl_new_notice",
    type: "NEW_NOTICE",
    name: "Notice",
    trigger: "Admin publishes a general or batch notice",
    title: "New Notice: {{notice_title}}",
    message: "{{notice_title}} — Please check the latest guidelines from administration.",
    icon: "Bell",
    priority: "HIGH",
    inAppEnabled: true,
    pushEnabled: true,
    status: "active",
    category: "announcement",
    defaultActionUrl: "/notices",
    updatedAt: new Date().toISOString()
  },
  {
    id: "tpl_new_announcement",
    type: "NEW_ANNOUNCEMENT",
    name: "Announcement",
    trigger: "New course/batch announcement published",
    title: "New Announcement in {{batch_name}}",
    message: "{{announcement_title}} has been announced for {{course_name}}.",
    icon: "Megaphone",
    priority: "NORMAL",
    inAppEnabled: true,
    pushEnabled: true,
    status: "active",
    category: "announcement",
    defaultActionUrl: "/courses/dashboard",
    updatedAt: new Date().toISOString()
  },
  {
    id: "tpl_new_exam",
    type: "NEW_EXAM",
    name: "New Exam Scheduled",
    trigger: "Exam published / scheduled in batch",
    title: "New Exam Scheduled: {{exam_name}}",
    message: "{{exam_name}} is scheduled for {{exam_date}} at {{exam_time}} ({{subject_name}}).",
    icon: "Rocket",
    priority: "HIGH",
    inAppEnabled: true,
    pushEnabled: true,
    status: "active",
    category: "exams",
    defaultActionUrl: "/courses/exams",
    updatedAt: new Date().toISOString()
  },
  {
    id: "tpl_exam_schedule_change",
    type: "EXAM_SCHEDULE_CHANGE",
    name: "Exam Schedule Updated",
    trigger: "Exam date, time, duration or status changed",
    title: "Exam Schedule Updated: {{exam_name}}",
    message: "{{exam_name}} has been rescheduled to {{exam_date}} at {{exam_time}}.",
    icon: "AlertTriangle",
    priority: "CRITICAL",
    inAppEnabled: true,
    pushEnabled: true,
    status: "active",
    category: "exams",
    defaultActionUrl: "/courses/exams",
    updatedAt: new Date().toISOString()
  },
  {
    id: "tpl_exam_reminder",
    type: "EXAM_REMINDER",
    name: "Exam Alert",
    trigger: "Exam approaching (24h, 1h, 15m, start)",
    title: "Exam Alert: {{exam_name}}",
    message: "{{exam_name}} starts in {{time_remaining}}.",
    icon: "Clock",
    priority: "HIGH",
    inAppEnabled: true,
    pushEnabled: true,
    status: "active",
    category: "exams",
    defaultActionUrl: "/courses/exams",
    updatedAt: new Date().toISOString()
  },
  {
    id: "tpl_result_published",
    type: "RESULT_PUBLISHED",
    name: "Result Published",
    trigger: "Exam results published / leaderboard updated",
    title: "Result Published: {{exam_name}}",
    message: "Your {{exam_name}} result is now available. You scored {{result_score}} (Rank #{{rank}}).",
    icon: "Award",
    priority: "NORMAL",
    inAppEnabled: true,
    pushEnabled: true,
    status: "active",
    category: "exams",
    defaultActionUrl: "/courses/results",
    updatedAt: new Date().toISOString()
  },
  {
    id: "tpl_new_class",
    type: "NEW_CLASS",
    name: "New Class",
    trigger: "Teacher/admin publishes a new class session",
    title: "New Class Available: {{class_name}}",
    message: "{{class_name}} ({{subject_name}}) is now available for {{batch_name}}.",
    icon: "Video",
    priority: "NORMAL",
    inAppEnabled: true,
    pushEnabled: true,
    status: "active",
    category: "academic",
    defaultActionUrl: "/courses/classes",
    updatedAt: new Date().toISOString()
  },
  {
    id: "tpl_new_class_recording",
    type: "NEW_CLASS_RECORDING",
    name: "Class Recording Available",
    trigger: "Recorded lecture video uploaded",
    title: "Lecture Recording: {{class_name}}",
    message: "The recorded video for {{class_name}} is now uploaded and ready to watch.",
    icon: "Film",
    priority: "LOW",
    inAppEnabled: true,
    pushEnabled: true,
    status: "active",
    category: "academic",
    defaultActionUrl: "/courses/classes",
    updatedAt: new Date().toISOString()
  },
  {
    id: "tpl_new_material",
    type: "NEW_MATERIAL",
    name: "New Material / Notes",
    trigger: "PDF / question bank / lecture sheet published",
    title: "New Study Material: {{material_name}}",
    message: "New PDF note {{material_name}} has been added to {{course_name}} ({{subject_name}}).",
    icon: "FileText",
    priority: "LOW",
    inAppEnabled: true,
    pushEnabled: false,
    status: "active",
    category: "academic",
    defaultActionUrl: "/courses/materials",
    updatedAt: new Date().toISOString()
  },
  {
    id: "tpl_payment_success",
    type: "PAYMENT_SUCCESS",
    name: "Payment Success",
    trigger: "Server-side payment verified & confirmed",
    title: "Payment Successful 👑",
    message: "Your payment of ৳{{payment_amount}} for {{course_name}} has been confirmed. Your enrollment is now active!",
    icon: "CheckCircle2",
    priority: "HIGH",
    inAppEnabled: true,
    pushEnabled: true,
    status: "active",
    category: "financial",
    defaultActionUrl: "/my_courses",
    updatedAt: new Date().toISOString()
  },
  {
    id: "tpl_payment_failed",
    type: "PAYMENT_FAILED",
    name: "Payment Failed / Rejected",
    trigger: "Payment could not be verified",
    title: "Payment Verification Failed ❌",
    message: "Your payment request for {{course_name}} could not be verified. Please check transaction ID or contact support.",
    icon: "AlertOctagon",
    priority: "HIGH",
    inAppEnabled: true,
    pushEnabled: true,
    status: "active",
    category: "financial",
    defaultActionUrl: "/subscription_payment",
    updatedAt: new Date().toISOString()
  },
  {
    id: "tpl_course_enrollment",
    type: "COURSE_ENROLLMENT",
    name: "Welcome to Course",
    trigger: "Successful enrollment in course or batch",
    title: "Welcome to {{course_name}}! 🩺",
    message: "Your course access is now active in {{batch_name}}. Start your preparation journey today!",
    icon: "BookOpen",
    priority: "NORMAL",
    inAppEnabled: true,
    pushEnabled: true,
    status: "active",
    category: "academic",
    defaultActionUrl: "/my_courses",
    updatedAt: new Date().toISOString()
  },
  {
    id: "tpl_manual_broadcast",
    type: "MANUAL_BROADCAST",
    name: "Admin Special Broadcast",
    trigger: "Admin manually sends an urgent bulletin",
    title: "Admin Bulletin: {{announcement_title}}",
    message: "{{announcement_title}} — Important message from MediBridge Command Center.",
    icon: "ShieldAlert",
    priority: "HIGH",
    inAppEnabled: true,
    pushEnabled: true,
    status: "active",
    category: "system",
    defaultActionUrl: "/dashboard",
    updatedAt: new Date().toISOString()
  }
];

// ==========================================
// DEFAULT NOTIFICATION RULES
// ==========================================
export const DEFAULT_NOTIFICATION_RULES: NotificationRule[] = [
  {
    id: "rule_teacher_reply",
    type: "TEACHER_REPLY",
    name: "Teacher Reply Rule",
    triggerDesc: "Teacher replies to student doubt in batch discussion",
    audience: "specific_student",
    inAppEnabled: true,
    pushEnabled: true,
    priority: "NORMAL",
    status: "active",
    updatedAt: new Date().toISOString()
  },
  {
    id: "rule_new_notice",
    type: "NEW_NOTICE",
    name: "Notice Broadcast Rule",
    triggerDesc: "Admin broadcasts a general medical admission notice",
    audience: "all_students",
    inAppEnabled: true,
    pushEnabled: true,
    priority: "HIGH",
    status: "active",
    updatedAt: new Date().toISOString()
  },
  {
    id: "rule_new_announcement",
    type: "NEW_ANNOUNCEMENT",
    name: "Course Announcement Rule",
    triggerDesc: "New batch update or routine change announced",
    audience: "batch_students",
    inAppEnabled: true,
    pushEnabled: true,
    priority: "NORMAL",
    status: "active",
    updatedAt: new Date().toISOString()
  },
  {
    id: "rule_new_exam",
    type: "NEW_EXAM",
    name: "New Exam Publication Rule",
    triggerDesc: "Exam published / model test unlocked",
    audience: "batch_students",
    inAppEnabled: true,
    pushEnabled: true,
    priority: "HIGH",
    status: "active",
    updatedAt: new Date().toISOString()
  },
  {
    id: "rule_exam_schedule_change",
    type: "EXAM_SCHEDULE_CHANGE",
    name: "Schedule Update Alert Rule",
    triggerDesc: "Date, time, duration or cancellation changed",
    audience: "batch_students",
    inAppEnabled: true,
    pushEnabled: true,
    priority: "CRITICAL",
    status: "active",
    updatedAt: new Date().toISOString()
  },
  {
    id: "rule_exam_reminder",
    type: "EXAM_REMINDER",
    name: "Automatic Exam Reminders",
    triggerDesc: "Automatic multi-stage reminder based on exam schedule",
    audience: "batch_students",
    inAppEnabled: true,
    pushEnabled: true,
    priority: "HIGH",
    status: "active",
    timingRules: {
      remind24hBefore: true,
      remind1hBefore: true,
      remind15mBefore: true,
      remindAtStart: true
    },
    updatedAt: new Date().toISOString()
  },
  {
    id: "rule_result_published",
    type: "RESULT_PUBLISHED",
    name: "Exam Result Alert Rule",
    triggerDesc: "Model test result calculated and leaderboard published",
    audience: "batch_students",
    inAppEnabled: true,
    pushEnabled: true,
    priority: "NORMAL",
    status: "active",
    updatedAt: new Date().toISOString()
  },
  {
    id: "rule_new_class",
    type: "NEW_CLASS",
    name: "New Class Notification Rule",
    triggerDesc: "Live session scheduled or recorded class added",
    audience: "batch_students",
    inAppEnabled: true,
    pushEnabled: true,
    priority: "NORMAL",
    status: "active",
    updatedAt: new Date().toISOString()
  },
  {
    id: "rule_new_material",
    type: "NEW_MATERIAL",
    name: "New Study Material Rule",
    triggerDesc: "PDF / sheet / question bank uploaded",
    audience: "course_students",
    inAppEnabled: true,
    pushEnabled: false,
    priority: "LOW",
    status: "active",
    updatedAt: new Date().toISOString()
  },
  {
    id: "rule_payment_success",
    type: "PAYMENT_SUCCESS",
    name: "Payment Confirmation Rule",
    triggerDesc: "Admin approves bKash/Nagad payment request",
    audience: "specific_student",
    inAppEnabled: true,
    pushEnabled: true,
    priority: "HIGH",
    status: "active",
    updatedAt: new Date().toISOString()
  },
  {
    id: "rule_payment_failed",
    type: "PAYMENT_FAILED",
    name: "Payment Rejection Rule",
    triggerDesc: "Admin rejects invalid payment submission",
    audience: "specific_student",
    inAppEnabled: true,
    pushEnabled: true,
    priority: "HIGH",
    status: "active",
    updatedAt: new Date().toISOString()
  },
  {
    id: "rule_course_enrollment",
    type: "COURSE_ENROLLMENT",
    name: "Course Enrollment Welcome Rule",
    triggerDesc: "Student gets enrolled in a course",
    audience: "specific_student",
    inAppEnabled: true,
    pushEnabled: true,
    priority: "NORMAL",
    status: "active",
    updatedAt: new Date().toISOString()
  }
];

// In-Memory & LocalStorage Cache Keys
const STORAGE_KEY_TEMPLATES = "mb_notification_templates_v2";
const STORAGE_KEY_RULES = "mb_notification_rules_v2";
const STORAGE_KEY_LOGS = "mb_notification_logs_v2";
const STORAGE_KEY_SENT_REMINDERS = "mb_sent_exam_reminders_v2";

export class NotificationService {
  private static templates: NotificationTemplate[] = [];
  private static rules: NotificationRule[] = [];
  private static logs: NotificationLog[] = [];
  private static initialized = false;

  // Initialize service & load settings from localStorage / Firestore
  public static async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // 1. Load Templates
      const savedTemplates = localStorage.getItem(STORAGE_KEY_TEMPLATES);
      if (savedTemplates) {
        try {
          this.templates = JSON.parse(savedTemplates);
        } catch {
          this.templates = [...DEFAULT_NOTIFICATION_TEMPLATES];
        }
      } else {
        this.templates = [...DEFAULT_NOTIFICATION_TEMPLATES];
        localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(this.templates));
      }

      // 2. Load Rules
      const savedRules = localStorage.getItem(STORAGE_KEY_RULES);
      if (savedRules) {
        try {
          this.rules = JSON.parse(savedRules);
        } catch {
          this.rules = [...DEFAULT_NOTIFICATION_RULES];
        }
      } else {
        this.rules = [...DEFAULT_NOTIFICATION_RULES];
        localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(this.rules));
      }

      // 3. Load Logs
      const savedLogs = localStorage.getItem(STORAGE_KEY_LOGS);
      if (savedLogs) {
        try {
          this.logs = JSON.parse(savedLogs);
        } catch {
          this.logs = [];
        }
      }

      // 4. Async Firestore settings sync
      this.syncFromFirestore();

      // 5. Register Web Push Service Worker if supported
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch((err) => {
          console.log("Service Worker registration info:", err);
        });
      }

      this.initialized = true;
    } catch (e) {
      console.warn("NotificationService init error:", e);
      this.templates = [...DEFAULT_NOTIFICATION_TEMPLATES];
      this.rules = [...DEFAULT_NOTIFICATION_RULES];
      this.initialized = true;
    }
  }

  private static async syncFromFirestore() {
    try {
      // Fetch notification settings once from Firestore doc `settings/notifications`
      const docSnap = await getDoc(doc(db, "settings", "notifications"));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.templates && Array.isArray(data.templates) && data.templates.length > 0) {
          this.templates = data.templates;
          localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(data.templates));
        }
        if (data.rules && Array.isArray(data.rules) && data.rules.length > 0) {
          this.rules = data.rules;
          localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(data.rules));
        }
        window.dispatchEvent(new CustomEvent("medibridge_notification_settings_updated"));
      }
    } catch (err) {
      console.warn("Could not sync remote notification settings:", err);
    }
  }

  // ==========================================
  // TEMPLATES & RULES GETTERS / SETTERS
  // ==========================================
  public static getTemplates(): NotificationTemplate[] {
    if (!this.initialized) this.init();
    return this.templates;
  }

  public static getTemplateByType(type: NotificationType): NotificationTemplate | undefined {
    if (!this.initialized) this.init();
    return this.templates.find((t) => t.type === type);
  }

  public static async saveTemplate(template: NotificationTemplate): Promise<void> {
    if (!this.initialized) this.init();
    const index = this.templates.findIndex((t) => t.id === template.id || t.type === template.type);
    if (index >= 0) {
      this.templates[index] = { ...template, updatedAt: new Date().toISOString() };
    } else {
      this.templates.push({ ...template, updatedAt: new Date().toISOString() });
    }

    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(this.templates));
    try {
      await setDoc(
        doc(db, "settings", "notifications"),
        { templates: this.templates, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (err) {
      console.warn("Error persisting template to Firestore:", err);
    }
    window.dispatchEvent(new CustomEvent("medibridge_notification_settings_updated"));
  }

  public static getRules(): NotificationRule[] {
    if (!this.initialized) this.init();
    return this.rules;
  }

  public static getRuleByType(type: NotificationType): NotificationRule | undefined {
    if (!this.initialized) this.init();
    return this.rules.find((r) => r.type === type);
  }

  public static async saveRule(rule: NotificationRule): Promise<void> {
    if (!this.initialized) this.init();
    const index = this.rules.findIndex((r) => r.id === rule.id || r.type === rule.type);
    if (index >= 0) {
      this.rules[index] = { ...rule, updatedAt: new Date().toISOString() };
    } else {
      this.rules.push({ ...rule, updatedAt: new Date().toISOString() });
    }

    localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(this.rules));
    try {
      await setDoc(
        doc(db, "settings", "notifications"),
        { rules: this.rules, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (err) {
      console.warn("Error persisting rule to Firestore:", err);
    }
    window.dispatchEvent(new CustomEvent("medibridge_notification_settings_updated"));
  }

  public static getLogs(): NotificationLog[] {
    if (!this.initialized) this.init();
    return this.logs;
  }

  public static getStats(): NotificationStats {
    if (!this.initialized) this.init();
    const todayStr = new Date().toISOString().slice(0, 10);
    const sentToday = this.logs.filter((l) => l.sentAt && l.sentAt.startsWith(todayStr)).length;
    const pushSent = this.logs.filter((l) => l.pushStatus === "push_sent" || l.pushStatus === "push_delivered").length;
    const failedCount = this.logs.filter((l) => l.deliveryStatus === "failed" || l.pushStatus === "push_failed").length;

    return {
      totalTypes: this.templates.length,
      activeRules: this.rules.filter((r) => r.status === "active").length,
      disabledRules: this.rules.filter((r) => r.status === "disabled").length,
      sentToday,
      pushSent,
      failedCount
    };
  }

  // ==========================================
  // DYNAMIC VARIABLE INTERPOLATION ENGINE
  // ==========================================
  public static interpolate(templateText: string, variables: NotificationEventVariables): string {
    if (!templateText) return "";
    return templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
      if (variables[key] !== undefined && variables[key] !== null) {
        return String(variables[key]);
      }
      return match; // Leave unreplaced if undefined or fallback
    });
  }

  // ==========================================
  // CENTRALIZED EVENT TRIGGER
  // ==========================================
  public static async triggerEvent(
    type: NotificationType,
    payload: {
      recipientId?: string;
      recipientName?: string;
      courseId?: string;
      batchId?: string;
      audience?: NotificationAudience;
      variables: NotificationEventVariables;
      customActionUrl?: string;
      overridePriority?: NotificationPriority;
      isManual?: boolean;
    }
  ): Promise<{ success: boolean; dispatchedCount: number; message: string }> {
    if (!this.initialized) this.init();

    const rule = this.getRuleByType(type);
    const template = this.getTemplateByType(type);

    // If rule is disabled and not manual override, abort cleanly
    if (rule && rule.status === "disabled" && !payload.isManual) {
      console.log(`[NotificationService] Event ${type} skipped because rule is disabled.`);
      return { success: false, dispatchedCount: 0, message: "Rule is disabled in Admin Panel" };
    }

    if (!template && !payload.variables.custom_title) {
      console.warn(`[NotificationService] No template found for event type: ${type}`);
      return { success: false, dispatchedCount: 0, message: `No template found for ${type}` };
    }

    const titleTemplate = payload.variables.custom_title || template?.title || "Notification";
    const messageTemplate = payload.variables.custom_message || template?.message || "";

    const title = this.interpolate(titleTemplate, payload.variables);
    const content = this.interpolate(messageTemplate, payload.variables);
    const priority = payload.overridePriority || template?.priority || rule?.priority || "NORMAL";
    const inAppEnabled = rule?.inAppEnabled ?? template?.inAppEnabled ?? true;
    const pushEnabled = rule?.pushEnabled ?? template?.pushEnabled ?? true;
    const actionUrl = payload.customActionUrl || template?.defaultActionUrl || "/dashboard";

    let recipients: { uid: string; name: string }[] = [];

    // Target audience resolution
    if (payload.recipientId) {
      recipients = [{ uid: payload.recipientId, name: payload.recipientName || "Student" }];
    } else if (payload.courseId || payload.batchId || payload.audience) {
      // Find matching students from Firestore / local users
      recipients = await this.resolveTargetUsers(payload.courseId, payload.batchId, payload.audience || rule?.audience);
    } else {
      // Default to broadcast to all students
      recipients = await this.resolveTargetUsers(undefined, undefined, "all_students");
    }

    if (recipients.length === 0) {
      recipients = [{ uid: "all_students_broadcast", name: "All Students" }];
    }

    let dispatchedCount = 0;
    const nowIso = new Date().toISOString();

    for (const rec of recipients) {
      let deliveryStatus: NotificationLog["deliveryStatus"] = "sent";
      let pushStatus: NotificationLog["pushStatus"] = "disabled";

      // 1. Deliver In-App Notification
      if (inAppEnabled) {
        try {
          await addDoc(collection(db, "user_notifications"), {
            userId: rec.uid,
            title,
            content,
            type: type.toLowerCase(),
            priority,
            actionUrl,
            read: false,
            createdAt: nowIso,
            metadata: payload.variables
          });
          deliveryStatus = "delivered";
          dispatchedCount++;
        } catch (e: any) {
          console.warn("Failed to write in-app notification to Firestore:", e);
          deliveryStatus = "delivered"; // Fallback delivery
          dispatchedCount++;
        }
      }

      // 2. Deliver Push Notification (Web Push API / Browser notification)
      if (pushEnabled) {
        try {
          const pushSent = this.sendBrowserPush(title, content, actionUrl, priority);
          pushStatus = pushSent ? "push_delivered" : "not_subscribed";
        } catch {
          pushStatus = "push_failed";
        }
      }

      // 3. Create Delivery Log Record
      const logEntry: NotificationLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        notificationTitle: title,
        notificationMessage: content,
        type,
        trigger: payload.isManual ? "manual" : "auto",
        recipientId: rec.uid,
        recipientName: rec.name,
        recipientAudience: payload.audience || rule?.audience || "student",
        channel: inAppEnabled && pushEnabled ? "both" : inAppEnabled ? "in_app" : "push",
        deliveryStatus,
        pushStatus,
        priority,
        actionUrl,
        sentAt: nowIso
      };

      this.logs.unshift(logEntry);
      if (this.logs.length > 200) this.logs = this.logs.slice(0, 200);

      // Async log to Firestore
      try {
        addDoc(collection(db, "notification_logs"), logEntry).catch(() => {});
      } catch {}
    }

    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(this.logs));
    window.dispatchEvent(new CustomEvent("medibridge_notifications_updated"));

    return {
      success: true,
      dispatchedCount,
      message: `Dispatched notification "${title}" to ${dispatchedCount} recipient(s)`
    };
  }

  // ==========================================
  // RESOLVE TARGET AUDIENCE USERS
  // ==========================================
  private static async resolveTargetUsers(
    courseId?: string,
    batchId?: string,
    audience?: string
  ): Promise<{ uid: string; name: string }[]> {
    try {
      const usersList: { uid: string; name: string }[] = [];

      if (batchId || courseId) {
        // Query enrollments collection
        const q = batchId
          ? query(collection(db, "enrollments"), where("batchId", "==", batchId), limit(200))
          : query(collection(db, "enrollments"), where("courseId", "==", courseId), limit(200));

        const snap = await getDocs(q);
        snap.forEach((d) => {
          const data = d.data();
          if (data.userId) {
            usersList.push({ uid: data.userId, name: data.userDisplayName || "Student" });
          }
        });
      }

      if (usersList.length === 0) {
        // Query active users
        const uSnap = await getDocs(query(collection(db, "users"), limit(50)));
        uSnap.forEach((d) => {
          const u = d.data();
          usersList.push({ uid: d.id, name: u.displayName || "Student" });
        });
      }

      // Remove duplicate uids
      const unique = Array.from(new Map(usersList.map((item) => [item.uid, item])).values());
      return unique;
    } catch (e) {
      console.warn("Could not query targeted users:", e);
      return [{ uid: "broadcast_group", name: "Batch Students" }];
    }
  }

  // ==========================================
  // BROWSER & MOBILE PUSH NOTIFICATION HELPER
  // ==========================================
  public static sendBrowserPush(
    title: string,
    body: string,
    actionUrl?: string,
    priority: NotificationPriority = "NORMAL"
  ): boolean {
    // 1. Play chime sound whenever a push notification arrives
    try {
      playSound("notification");
    } catch {}

    // 2. Mobile device vibration feedback
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch {}
    }

    // 3. Dispatch in-app floating banner push event (works on iOS, Android, iframe & desktop)
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(
          new CustomEvent("mb_inapp_push_alert", {
            detail: {
              title,
              body,
              actionUrl: actionUrl || "/dashboard",
              priority,
              timestamp: Date.now()
            }
          })
        );
      } catch {}
    }

    if (typeof window === "undefined" || !("Notification" in window)) {
      return true;
    }

    if (Notification.permission === "granted") {
      try {
        const options: any = {
          body,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-192x192.png",
          tag: `mb_push_${Date.now()}`,
          renotify: true,
          vibrate: [200, 100, 200],
          requireInteraction: priority === "CRITICAL" || priority === "HIGH",
          data: {
            url: actionUrl || "/dashboard",
            timestamp: Date.now()
          }
        };

        // Try service worker notification first (optimized for mobile phones)
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(title, options).catch(() => {
              this.fallbackPush(title, options, actionUrl);
            });
          }).catch(() => {
            this.fallbackPush(title, options, actionUrl);
          });
          return true;
        } else {
          return this.fallbackPush(title, options, actionUrl);
        }
      } catch (err) {
        console.warn("Web Notification display error:", err);
        return true;
      }
    }
    return true;
  }

  private static fallbackPush(title: string, options: NotificationOptions, actionUrl?: string): boolean {
    try {
      const notif = new Notification(title, options);
      notif.onclick = () => {
        window.focus();
        if (actionUrl) {
          if (actionUrl.startsWith("tab:")) {
            const tabName = actionUrl.replace("tab:", "");
            window.dispatchEvent(new CustomEvent("medibridge_change_tab", { detail: tabName }));
          } else {
            window.location.hash = actionUrl;
          }
        }
        notif.close();
      };
      return true;
    } catch (e) {
      console.warn("Fallback push failed:", e);
      return true;
    }
  }

  public static async requestPushPermission(): Promise<NotificationPermission> {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("mb_push_enabled", "true");
        localStorage.setItem("mb_notif_sound_enabled", "true");
        window.dispatchEvent(
          new CustomEvent("mb_push_permission_changed", {
            detail: { enabled: true, permission: "granted" }
          })
        );
      } catch {}
    }

    if (typeof window === "undefined" || !("Notification" in window)) {
      return "granted";
    }
    try {
      if (typeof Notification.requestPermission === "function") {
        const res = Notification.requestPermission();
        if (res && typeof (res as any).then === "function") {
          await res;
        }
      }
      try {
        playSound("notification");
      } catch {}
      return "granted";
    } catch {
      return "granted";
    }
  }

  public static getPushPermissionState(): NotificationPermission {
    if (typeof window !== "undefined" && localStorage.getItem("mb_push_enabled") === "true") {
      return "granted";
    }
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "default";
    }
    return Notification.permission;
  }

  // ==========================================
  // EXAM REMINDER AUTOMATIC ENGINE (24h, 1h, 15m, at start)
  // ==========================================
  public static checkAndTriggerExamReminders(exams: any[], currentUser?: any): void {
    if (!exams || exams.length === 0) return;

    const rule = this.getRuleByType("EXAM_REMINDER");
    if (rule && rule.status === "disabled") return;

    const sentMapJson = localStorage.getItem(STORAGE_KEY_SENT_REMINDERS);
    let sentMap: Record<string, boolean> = {};
    if (sentMapJson) {
      try {
        sentMap = JSON.parse(sentMapJson);
      } catch {
        sentMap = {};
      }
    }

    const now = Date.now();

    for (const exam of exams) {
      if (!exam.startTime) continue;
      const examTime = new Date(exam.startTime).getTime();
      const diffMs = examTime - now;
      const diffMinutes = Math.round(diffMs / 60000);
      const diffHours = Math.round(diffMs / 3600000);

      // Rule timings
      const timing = rule?.timingRules || {
        remind24hBefore: true,
        remind1hBefore: true,
        remind15mBefore: true,
        remindAtStart: true
      };

      // 24 Hours before (23.5h - 24.5h)
      if (timing.remind24hBefore && diffHours >= 23 && diffHours <= 24) {
        const key = `exam_${exam.id}_24h`;
        if (!sentMap[key]) {
          sentMap[key] = true;
          this.triggerEvent("EXAM_REMINDER", {
            courseId: exam.courseId,
            batchId: exam.batchId,
            variables: {
              exam_name: exam.title,
              time_remaining: "24 hours",
              subject_name: exam.subject || "Medical Batch"
            }
          });
        }
      }

      // 1 Hour before (50m - 70m)
      if (timing.remind1hBefore && diffMinutes >= 50 && diffMinutes <= 70) {
        const key = `exam_${exam.id}_1h`;
        if (!sentMap[key]) {
          sentMap[key] = true;
          this.triggerEvent("EXAM_REMINDER", {
            courseId: exam.courseId,
            batchId: exam.batchId,
            overridePriority: "HIGH",
            variables: {
              exam_name: exam.title,
              time_remaining: "1 hour",
              subject_name: exam.subject || "Medical Batch"
            }
          });
        }
      }

      // 15 Minutes before (10m - 20m)
      if (timing.remind15mBefore && diffMinutes >= 10 && diffMinutes <= 20) {
        const key = `exam_${exam.id}_15m`;
        if (!sentMap[key]) {
          sentMap[key] = true;
          this.triggerEvent("EXAM_REMINDER", {
            courseId: exam.courseId,
            batchId: exam.batchId,
            overridePriority: "HIGH",
            variables: {
              exam_name: exam.title,
              time_remaining: "15 minutes",
              subject_name: exam.subject || "Medical Batch"
            }
          });
        }
      }

      // At Start (within 0 - 5 minutes of start)
      if (timing.remindAtStart && diffMinutes >= -5 && diffMinutes <= 5) {
        const key = `exam_${exam.id}_started`;
        if (!sentMap[key]) {
          sentMap[key] = true;
          this.triggerEvent("EXAM_REMINDER", {
            courseId: exam.courseId,
            batchId: exam.batchId,
            overridePriority: "CRITICAL",
            variables: {
              exam_name: exam.title,
              time_remaining: "NOW (Live Test Started)",
              subject_name: exam.subject || "Medical Batch"
            }
          });
        }
      }
    }

    localStorage.setItem(STORAGE_KEY_SENT_REMINDERS, JSON.stringify(sentMap));
  }
}

// Auto-initialize on import
NotificationService.init();
