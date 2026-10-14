import React, { useState, useEffect } from "react";
import {
  NotificationType,
  NotificationPriority,
  NotificationTemplate,
  NotificationRule,
  NotificationLog,
  NotificationStats,
  NotificationAudience
} from "../../types/notificationTypes";
import { NotificationService } from "../../lib/notificationService";
import { Course, Batch } from "../../types/courseTypes";
import { UserProfile } from "../../types";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Send,
  Edit,
  Eye,
  Settings,
  Filter,
  Search,
  RefreshCw,
  Smartphone,
  Layers,
  Sparkles,
  MessageCircle,
  Megaphone,
  Rocket,
  Award,
  Video,
  FileText,
  CreditCard,
  BookOpen,
  Film,
  ShieldAlert,
  Users,
  Calendar,
  X,
  Check,
  ChevronRight,
  Flame,
  Info,
  ShieldCheck,
  HelpCircle
} from "lucide-react";
import { playSound } from "../../audio";

interface AdminNotificationPanelProps {
  user: UserProfile;
  theme?: "light" | "dark";
  courses?: Course[];
  batches?: Batch[];
  initialSubTab?: "templates" | "rules" | "manual" | "logs";
}

const AVAILABLE_ICONS: { [key: string]: React.ElementType } = {
  Bell,
  MessageCircle,
  Megaphone,
  Rocket,
  AlertTriangle,
  Clock,
  Award,
  Video,
  Film,
  FileText,
  CheckCircle2,
  AlertOctagon,
  BookOpen,
  ShieldAlert,
  CreditCard,
  Flame,
  Sparkles
};

const DYNAMIC_VARIABLES_LIST = [
  { tag: "{{student_name}}", label: "Student Name", sample: "Nuwaisir Hoque" },
  { tag: "{{teacher_name}}", label: "Teacher Name", sample: "Dr. Tanjim Ahmed (SSMC)" },
  { tag: "{{course_name}}", label: "Course Name", sample: "Medical Admission Masterclass 2027" },
  { tag: "{{batch_name}}", label: "Batch Name", sample: "Medical Standard Batch Alpha" },
  { tag: "{{exam_name}}", label: "Exam Name", sample: "Biology Model Test #04" },
  { tag: "{{exam_date}}", label: "Exam Date", sample: "Friday, 18 August" },
  { tag: "{{exam_time}}", label: "Exam Time", sample: "8:00 PM" },
  { tag: "{{time_remaining}}", label: "Time Remaining", sample: "15 minutes" },
  { tag: "{{result_score}}", label: "Result Score", sample: "94.5 / 100" },
  { tag: "{{rank}}", label: "Rank", sample: "12" },
  { tag: "{{subject_name}}", label: "Subject", sample: "Zoology (Genetics)" },
  { tag: "{{topic_name}}", label: "Topic", sample: "Mendelian Inheritance" },
  { tag: "{{class_name}}", label: "Class Name", sample: "Physics Vector Mastery #03" },
  { tag: "{{payment_amount}}", label: "Payment Amount", sample: "4,500" },
  { tag: "{{announcement_title}}", label: "Announcement Title", sample: "Special Friday Marathon Class" },
  { tag: "{{notice_title}}", label: "Notice Title", sample: "MAT Official Exam Date Declared" },
  { tag: "{{material_name}}", label: "Material Name", sample: "Genetics Complete PDF Sheet" }
];

export default function AdminNotificationPanel({
  user,
  theme = "dark",
  courses = [],
  batches = [],
  initialSubTab = "templates"
}: AdminNotificationPanelProps) {
  const isDark = theme === "dark";

  const [activeSubTab, setActiveSubTab] = useState<"templates" | "rules" | "manual" | "logs">(initialSubTab);
  const [stats, setStats] = useState<NotificationStats>(NotificationService.getStats());
  const [templates, setTemplates] = useState<NotificationTemplate[]>(NotificationService.getTemplates());
  const [rules, setRules] = useState<NotificationRule[]>(NotificationService.getRules());
  const [logs, setLogs] = useState<NotificationLog[]>(NotificationService.getLogs());

  // Search & Filters
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>("All");
  const [logSearch, setLogSearch] = useState("");
  const [logChannelFilter, setLogChannelFilter] = useState<string>("All");
  const [logStatusFilter, setLogStatusFilter] = useState<string>("All");

  // Editing Template State
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [previewTab, setPreviewTab] = useState<"dropdown" | "dialog" | "push">("dropdown");

  // Editing Rule State
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);

  // Manual Notification Form State
  const [manualTitle, setManualTitle] = useState("");
  const [manualMessage, setManualMessage] = useState("");
  const [manualAudience, setManualAudience] = useState<NotificationAudience>("all_students");
  const [manualCourseId, setManualCourseId] = useState<string>("");
  const [manualBatchId, setManualBatchId] = useState<string>("");
  const [manualPriority, setManualPriority] = useState<NotificationPriority>("HIGH");
  const [manualInApp, setManualInApp] = useState(true);
  const [manualPush, setManualPush] = useState(true);
  const [manualActionUrl, setManualActionUrl] = useState("/dashboard");
  const [manualScheduleMode, setManualScheduleMode] = useState<"now" | "later">("now");
  const [manualScheduleDateTime, setManualScheduleDateTime] = useState("");
  const [isSendingManual, setIsSendingManual] = useState(false);
  const [manualStatusMessage, setManualStatusMessage] = useState("");

  // Push Permission State
  const [pushState, setPushState] = useState<NotificationPermission>(NotificationService.getPushPermissionState());

  // Load and refresh state on changes
  const refreshData = () => {
    setStats(NotificationService.getStats());
    setTemplates([...NotificationService.getTemplates()]);
    setRules([...NotificationService.getRules()]);
    setLogs([...NotificationService.getLogs()]);
    setPushState(NotificationService.getPushPermissionState());
  };

  useEffect(() => {
    refreshData();
    const handleUpdate = () => refreshData();
    window.addEventListener("medibridge_notification_settings_updated", handleUpdate);
    window.addEventListener("medibridge_notifications_updated", handleUpdate);
    return () => {
      window.removeEventListener("medibridge_notification_settings_updated", handleUpdate);
      window.removeEventListener("medibridge_notifications_updated", handleUpdate);
    };
  }, []);

  // Request browser push notification test
  const handleTestPushAlert = async () => {
    playSound("click");
    if (pushState !== "granted") {
      const res = await NotificationService.requestPushPermission();
      setPushState(res);
      if (res === "granted") {
        NotificationService.sendBrowserPush(
          "🔔 MediBridge Push Active",
          "You have successfully enabled Web Push notifications for exams and mentorship.",
          "/admin/notifications"
        );
      }
    } else {
      NotificationService.sendBrowserPush(
        "🔔 Live Push Test: Biology Exam Alert",
        "Biology Model Test starts in 15 minutes. Prepare your test desk now!",
        "/courses/exams",
        "HIGH"
      );
      playSound("levelup");
    }
  };

  // Handle Save Edited Template
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    playSound("correct");
    await NotificationService.saveTemplate(editingTemplate);
    setEditingTemplate(null);
    refreshData();
  };

  // Handle Save Edited Rule
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    playSound("correct");
    await NotificationService.saveRule(editingRule);
    setEditingRule(null);
    refreshData();
  };

  // Handle Send Manual Notification
  const handleSendManualNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualMessage.trim()) return;

    setIsSendingManual(true);
    playSound("click");

    try {
      if (manualScheduleMode === "later") {
        setManualStatusMessage(`✓ Notification scheduled for ${manualScheduleDateTime || "scheduled time"}`);
        setTimeout(() => setManualStatusMessage(""), 4000);
      } else {
        const result = await NotificationService.triggerEvent("MANUAL_BROADCAST", {
          audience: manualAudience,
          courseId: manualCourseId || undefined,
          batchId: manualBatchId || undefined,
          overridePriority: manualPriority,
          customActionUrl: manualActionUrl,
          isManual: true,
          variables: {
            custom_title: manualTitle,
            custom_message: manualMessage,
            announcement_title: manualTitle,
            student_name: "Aspirant",
            course_name: courses.find((c) => c.id === manualCourseId)?.title || "Medical Standard Course",
            batch_name: batches.find((b) => b.id === manualBatchId)?.batchName || "Standard Batch"
          }
        });

        playSound("levelup");
        setManualStatusMessage(`✓ Successfully broadcasted notification! (${result.dispatchedCount} delivered)`);
        setManualTitle("");
        setManualMessage("");
        refreshData();
        setTimeout(() => setManualStatusMessage(""), 5000);
      }
    } catch (err: any) {
      setManualStatusMessage(`❌ Error sending notification: ${err.message}`);
    } finally {
      setIsSendingManual(false);
    }
  };

  // Filter templates list
  const filteredTemplates = templates.filter((tpl) => {
    const s = templateSearch.toLowerCase().trim();
    const matchesSearch =
      !s ||
      (tpl.name || "").toLowerCase().includes(s) ||
      (tpl.title || "").toLowerCase().includes(s) ||
      (tpl.trigger || "").toLowerCase().includes(s) ||
      (tpl.type || "").toLowerCase().includes(s);
    const matchesCategory =
      templateCategoryFilter === "All" || (tpl.category || "").toLowerCase() === templateCategoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  // Filter logs list
  const filteredLogs = logs.filter((log) => {
    const s = logSearch.toLowerCase().trim();
    const matchesSearch =
      !s ||
      (log.notificationTitle || "").toLowerCase().includes(s) ||
      (log.notificationMessage || "").toLowerCase().includes(s) ||
      (log.recipientName || "").toLowerCase().includes(s) ||
      (log.type || "").toLowerCase().includes(s);
    const matchesChannel =
      logChannelFilter === "All" ||
      (logChannelFilter === "In-App" && (log.channel === "in_app" || log.channel === "both")) ||
      (logChannelFilter === "Push" && (log.channel === "push" || log.channel === "both"));
    const matchesStatus =
      logStatusFilter === "All" ||
      (logStatusFilter === "Delivered" && log.deliveryStatus === "delivered") ||
      (logStatusFilter === "Read" && log.deliveryStatus === "read") ||
      (logStatusFilter === "Failed" && (log.deliveryStatus === "failed" || log.pushStatus === "push_failed"));
    return matchesSearch && matchesChannel && matchesStatus;
  });

  // Generate Sample Dynamic preview for templates
  const getInterpolatedPreview = (tpl: NotificationTemplate) => {
    const sampleVars: Record<string, string> = {
      student_name: "Nuwaisir Hoque",
      teacher_name: "Dr. Tanjim Ahmed (SSMC)",
      course_name: "Medical Admission Masterclass 2027",
      batch_name: "Standard Medical Batch Alpha",
      exam_name: "Biology Model Test #04",
      exam_date: "Friday, 18 August",
      exam_time: "8:00 PM",
      time_remaining: "15 minutes",
      result_score: "94.5 / 100",
      rank: "12",
      subject_name: "Zoology (Genetics)",
      topic_name: "Mendelian Inheritance",
      class_name: "Physics Vector Mastery #03",
      payment_amount: "4,500",
      announcement_title: "Special Friday Marathon Class",
      notice_title: "MAT Official Exam Date Declared",
      material_name: "Genetics Complete PDF Sheet"
    };

    return {
      title: NotificationService.interpolate(tpl.title, sampleVars),
      message: NotificationService.interpolate(tpl.message, sampleVars)
    };
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 font-sans">
      {/* 🚀 Top Header & Dashboard Metrics Bar */}
      <div className="bg-[#151515] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10 border-b border-white/10 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C1121F] to-amber-600 flex items-center justify-center text-white shadow-lg">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white font-display flex items-center gap-2">
                  Notification Management
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#C1121F]/20 text-red-400 border border-red-500/30">
                    CENTRAL ENGINE v2.4
                  </span>
                </h1>
                <p className="text-xs text-gray-400 font-sans mt-0.5">
                  Manage automatic event triggers, dynamic message templates, delivery rules, and audit logs.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleTestPushAlert}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-mono font-bold text-gray-200 flex items-center gap-2 transition cursor-pointer"
              title="Test browser push notification"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span>{pushState === "granted" ? "Push Active: Send Test" : "Enable Web Push"}</span>
            </button>

            <button
              onClick={() => {
                playSound("click");
                setActiveSubTab("manual");
              }}
              className="px-4 py-2 rounded-xl bg-[#C1121F] hover:bg-red-700 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-950/30 cursor-pointer transition active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Notification</span>
            </button>

            <button
              onClick={() => {
                playSound("click");
                refreshData();
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition cursor-pointer"
              title="Refresh Stats & Logs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dashboard 6-Stat Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-6 relative z-10">
          <div className="bg-black/40 border border-white/5 p-3.5 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-gray-400">Total Types</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black text-white font-mono">{stats.totalTypes}</span>
              <Layers className="w-4 h-4 text-sky-400" />
            </div>
          </div>

          <div className="bg-black/40 border border-white/5 p-3.5 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-emerald-400">Active Rules</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black text-emerald-400 font-mono">{stats.activeRules}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          <div className="bg-black/40 border border-white/5 p-3.5 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-gray-500">Disabled Rules</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black text-gray-400 font-mono">{stats.disabledRules}</span>
              <AlertTriangle className="w-4 h-4 text-gray-500" />
            </div>
          </div>

          <div className="bg-black/40 border border-white/5 p-3.5 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-amber-400">Sent Today</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black text-amber-400 font-mono">{stats.sentToday}</span>
              <Send className="w-4 h-4 text-amber-400" />
            </div>
          </div>

          <div className="bg-black/40 border border-white/5 p-3.5 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-purple-400">Push Sent</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black text-purple-400 font-mono">{stats.pushSent}</span>
              <Smartphone className="w-4 h-4 text-purple-400" />
            </div>
          </div>

          <div className="bg-black/40 border border-white/5 p-3.5 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-red-400">Failed</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black text-red-400 font-mono">{stats.failedCount}</span>
              <AlertOctagon className="w-4 h-4 text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 🧭 Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto scrollbar-none">
        {[
          { id: "templates", name: "Notification Templates", icon: FileText, count: templates.length },
          { id: "rules", name: "Notification Rules", icon: Settings, count: rules.length },
          { id: "manual", name: "Manual Notification", icon: Send },
          { id: "logs", name: "Delivery Logs", icon: Clock, count: logs.length }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                playSound("click");
                setActiveSubTab(tab.id as any);
              }}
              className={`py-2.5 px-4 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition duration-200 shrink-0 cursor-pointer ${
                isActive
                  ? "bg-[#C1121F] text-white shadow-lg shadow-red-900/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.name}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-black/40 text-gray-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================== */}
      {/* 1. NOTIFICATION TEMPLATES MANAGEMENT TAB */}
      {/* ========================================================== */}
      {activeSubTab === "templates" && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#151515] p-3 rounded-xl border border-white/10">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="Search templates by type, title or trigger description..."
                className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C1121F] font-mono"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[10px] font-mono text-gray-400 uppercase shrink-0">Category:</span>
              <select
                value={templateCategoryFilter}
                onChange={(e) => setTemplateCategoryFilter(e.target.value)}
                className="bg-black/60 border border-white/15 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#C1121F]"
              >
                <option value="All">All Categories</option>
                <option value="Mentorship">Mentorship</option>
                <option value="Exams">Exams</option>
                <option value="Academic">Academic</option>
                <option value="Announcement">Announcement</option>
                <option value="Financial">Financial</option>
                <option value="System">System</option>
              </select>
            </div>
          </div>

          {/* Templates Table */}
          <div className="bg-[#151515] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-black/60 text-gray-400 font-mono text-[10.5px] uppercase border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4">Notification Type</th>
                    <th className="py-3.5 px-4">Default Title</th>
                    <th className="py-3.5 px-4">Trigger</th>
                    <th className="py-3.5 px-3 text-center">In-App</th>
                    <th className="py-3.5 px-3 text-center">Push</th>
                    <th className="py-3.5 px-3 text-center">Priority</th>
                    <th className="py-3.5 px-3 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTemplates.map((tpl) => {
                    const IconComponent = AVAILABLE_ICONS[tpl.icon] || Bell;
                    return (
                      <tr key={tpl.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-amber-400 shrink-0 shadow">
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-white font-mono block">{tpl.name}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{tpl.type}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-gray-300 font-mono text-[11px] max-w-[220px] truncate" title={tpl.title}>
                          {tpl.title}
                        </td>

                        <td className="py-3 px-4 text-gray-400 text-[11px] max-w-[200px] truncate" title={tpl.trigger}>
                          {tpl.trigger}
                        </td>

                        <td className="py-3 px-3 text-center font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tpl.inAppEnabled
                                ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
                                : "bg-gray-900 text-gray-500 border border-gray-800"
                            }`}
                          >
                            {tpl.inAppEnabled ? "ON" : "OFF"}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tpl.pushEnabled
                                ? "bg-purple-950/60 text-purple-400 border border-purple-500/30"
                                : "bg-gray-900 text-gray-500 border border-gray-800"
                            }`}
                          >
                            {tpl.pushEnabled ? "ON" : "OFF"}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tpl.priority === "CRITICAL"
                                ? "bg-red-950/80 text-red-300 border border-red-500/40"
                                : tpl.priority === "HIGH"
                                ? "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                                : tpl.priority === "NORMAL"
                                ? "bg-sky-950/80 text-sky-300 border border-sky-500/40"
                                : "bg-gray-900 text-gray-400 border border-gray-800"
                            }`}
                          >
                            {tpl.priority}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tpl.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}
                          >
                            {tpl.status === "active" ? "Active" : "Disabled"}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                playSound("click");
                                setEditingTemplate({ ...tpl });
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#C1121F]/20 hover:bg-[#C1121F] text-red-300 hover:text-white border border-red-500/30 text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 2. NOTIFICATION RULES MANAGEMENT TAB */}
      {/* ========================================================== */}
      {activeSubTab === "rules" && (
        <div className="space-y-4">
          <div className="bg-[#151515] p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Settings className="w-4 h-4 text-amber-400" />
                  Automatic Notification Event Rules
                </h3>
                <p className="text-xs text-gray-400 font-sans mt-0.5">
                  Configure audience filters, in-app/push channels, and multi-stage exam timing triggers.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-black/60 text-gray-400 font-mono text-[10.5px] uppercase border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4">Rule Name</th>
                    <th className="py-3.5 px-4">Trigger</th>
                    <th className="py-3.5 px-4">Audience</th>
                    <th className="py-3.5 px-3 text-center">In-App</th>
                    <th className="py-3.5 px-3 text-center">Push</th>
                    <th className="py-3.5 px-3 text-center">Priority</th>
                    <th className="py-3.5 px-3 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-white font-mono block">{rule.name}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{rule.type}</span>
                      </td>

                      <td className="py-3.5 px-4 text-gray-300 text-[11px] max-w-[200px] truncate" title={rule.triggerDesc}>
                        {rule.triggerDesc}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-amber-300">
                        {rule.audience === "all_students"
                          ? "All Students"
                          : rule.audience === "batch_students"
                          ? "Batch Enrolled Students"
                          : rule.audience === "course_students"
                          ? "Course Students"
                          : rule.audience === "specific_student"
                          ? "Specific Student"
                          : "Teachers / Faculty"}
                      </td>

                      <td className="py-3.5 px-3 text-center font-mono">
                        <button
                          onClick={async () => {
                            playSound("click");
                            await NotificationService.saveRule({ ...rule, inAppEnabled: !rule.inAppEnabled });
                            refreshData();
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                            rule.inAppEnabled
                              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900"
                              : "bg-gray-900 text-gray-500 border border-gray-800"
                          }`}
                        >
                          {rule.inAppEnabled ? "ON" : "OFF"}
                        </button>
                      </td>

                      <td className="py-3.5 px-3 text-center font-mono">
                        <button
                          onClick={async () => {
                            playSound("click");
                            await NotificationService.saveRule({ ...rule, pushEnabled: !rule.pushEnabled });
                            refreshData();
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                            rule.pushEnabled
                              ? "bg-purple-950/60 text-purple-400 border border-purple-500/30 hover:bg-purple-900"
                              : "bg-gray-900 text-gray-500 border border-gray-800"
                          }`}
                        >
                          {rule.pushEnabled ? "ON" : "OFF"}
                        </button>
                      </td>

                      <td className="py-3.5 px-3 text-center font-mono">
                        <span className="text-[10px] font-bold text-gray-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                          {rule.priority}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center font-mono">
                        <button
                          onClick={async () => {
                            playSound("click");
                            const nextStatus = rule.status === "active" ? "disabled" : "active";
                            await NotificationService.saveRule({ ...rule, status: nextStatus });
                            refreshData();
                          }}
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                            rule.status === "active"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {rule.status === "active" ? "Active" : "Disabled"}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            playSound("click");
                            setEditingRule({ ...rule });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/15 text-xs font-mono font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer"
                        >
                          <Settings className="w-3 h-3 text-amber-400" />
                          <span>Configure</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Exam Timing Rules Details Box */}
          <div className="bg-[#151515] p-5 rounded-2xl border border-white/10 shadow-xl space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Automated Exam Reminders Timing Schedule
            </h4>
            <p className="text-xs text-gray-400">
              The automated exam alert engine calculates upcoming exams and dispatches non-duplicate reminders across all 4 configured time windows:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-black/50 border border-white/10 p-3 rounded-xl flex items-center gap-3">
                <span className="text-lg">⏰</span>
                <div>
                  <span className="font-mono text-xs font-bold text-white block">24 Hours Before</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Status: Enabled</span>
                </div>
              </div>

              <div className="bg-black/50 border border-white/10 p-3 rounded-xl flex items-center gap-3">
                <span className="text-lg">⏳</span>
                <div>
                  <span className="font-mono text-xs font-bold text-white block">1 Hour Before</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Status: Enabled</span>
                </div>
              </div>

              <div className="bg-black/50 border border-white/10 p-3 rounded-xl flex items-center gap-3">
                <span className="text-lg">⚡</span>
                <div>
                  <span className="font-mono text-xs font-bold text-white block">15 Minutes Before</span>
                  <span className="text-[10px] text-amber-400 font-mono">Priority: HIGH</span>
                </div>
              </div>

              <div className="bg-black/50 border border-white/10 p-3 rounded-xl flex items-center gap-3">
                <span className="text-lg">🚀</span>
                <div>
                  <span className="font-mono text-xs font-bold text-white block">At Exam Start</span>
                  <span className="text-[10px] text-red-400 font-mono">Priority: CRITICAL</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 3. MANUAL NOTIFICATION SENDER TAB (MOBILE RESPONSIVE & PHONE PREVIEW) */}
      {/* ========================================================== */}
      {activeSubTab === "manual" && (
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Manual Form */}
          <div className="lg:col-span-7 bg-[#151515] p-4 sm:p-6 rounded-2xl border border-white/10 shadow-xl space-y-5">
            <div className="border-b border-white/10 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#C1121F]" />
                  Broadcast Manual Notification
                </h3>
                <p className="text-xs text-gray-400 font-sans mt-0.5">
                  Send mobile-sized push notifications & in-app alerts (Facebook / Telegram style) to students.
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-mono font-bold w-fit">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile Optimized</span>
              </div>
            </div>

            {/* Quick Presets for Admins */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-gray-300 font-bold uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Quick Mobile Presets (এক ক্লিকে প্রিসেট):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setManualTitle("🔴 জরুরি বিজ্ঞপ্তি: আজ ক্লাসের সময়সূচি");
                    setManualMessage("আজকের রাত ৮:০০ টার মেডিকেল বায়োলজি লাইভ ম্যারাথন ক্লাস যথাসময়ে অনুষ্ঠিত হবে। সকলে সময়মতো যুক্ত হবেন।");
                    setManualPriority("HIGH");
                    setManualActionUrl("/courses/classes");
                  }}
                  className="p-2 rounded-xl bg-black/50 hover:bg-[#C1121F]/20 border border-white/10 hover:border-red-500/40 text-left text-[11px] font-mono transition cursor-pointer text-gray-300 hover:text-white"
                >
                  <span className="font-bold block text-red-400">🔴 জরুরি নোটিশ</span>
                  <span className="text-[9.5px] text-gray-500 truncate block">ক্লাস শিডিউল নোটিশ</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setManualTitle("📅 পরীক্ষার সময়সূচি আপডেট করা হয়েছে");
                    setManualMessage("মেডিকেল মডেল টেস্ট #০৫ এর রুটিন আপডেট করা হয়েছে। আগামী শুক্রবার রাত ৮টায় শুরু হবে।");
                    setManualPriority("CRITICAL");
                    setManualActionUrl("/courses/exams");
                  }}
                  className="p-2 rounded-xl bg-black/50 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 text-left text-[11px] font-mono transition cursor-pointer text-gray-300 hover:text-white"
                >
                  <span className="font-bold block text-amber-400">📅 এক্সাম রুটিন</span>
                  <span className="text-[9.5px] text-gray-500 truncate block">রুটিন পরিবর্তন অ্যালার্ট</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setManualTitle("🎥 লাইভ ক্লাস শুরু হয়েছে — এখনই যুক্ত হোন!");
                    setManualMessage("ডা. তানজিম আহমেদ স্যারের জেনেটিক্স ও বংশগতিবিদ্যা স্পেশাল ক্লাস লাইভ শুরু হয়েছে।");
                    setManualPriority("HIGH");
                    setManualActionUrl("/courses/classes");
                  }}
                  className="p-2 rounded-xl bg-black/50 hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/40 text-left text-[11px] font-mono transition cursor-pointer text-gray-300 hover:text-white"
                >
                  <span className="font-bold block text-blue-400">🎥 লাইভ ক্লাস</span>
                  <span className="text-[9.5px] text-gray-500 truncate block">লাইভ সেশন অ্যালার্ট</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setManualTitle("🏆 পরীক্ষার রেজাল্ট ও মেধা তালিকা প্রকাশিত!");
                    setManualMessage("রসায়ন মডেল টেস্টের পূর্ণাঙ্গ মেরিট লিস্ট ও পারফরম্যান্স এনালাইসিস এখন রেজাল্ট সেকশনে পাওয়া যাচ্ছে।");
                    setManualPriority("NORMAL");
                    setManualActionUrl("/courses/results");
                  }}
                  className="p-2 rounded-xl bg-black/50 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 text-left text-[11px] font-mono transition cursor-pointer text-gray-300 hover:text-white"
                >
                  <span className="font-bold block text-emerald-400">🏆 রেজাল্ট প্রকাশ</span>
                  <span className="text-[9.5px] text-gray-500 truncate block">মেধা তালিকা ও মার্কস</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setManualTitle("🩺 আপনার ডাউটের সমাধান করেছেন মেন্টর");
                    setManualMessage("বায়োলজি ওরিয়েন্টেশনের প্রশ্নের উত্তর দেওয়া হয়েছে। ডিসকাশন ফোরামে বিস্তারিত দেখুন।");
                    setManualPriority("NORMAL");
                    setManualActionUrl("/courses/discussions");
                  }}
                  className="p-2 rounded-xl bg-black/50 hover:bg-pink-500/20 border border-white/10 hover:border-pink-500/40 text-left text-[11px] font-mono transition cursor-pointer text-gray-300 hover:text-white"
                >
                  <span className="font-bold block text-pink-400">🩺 মেন্টর রিপ্লাই</span>
                  <span className="text-[9.5px] text-gray-500 truncate block">ডাউট ক্লিয়ারিং অ্যালার্ট</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setManualTitle("👑 পেমেন্ট সফল: কোর্সে স্বাগতম!");
                    setManualMessage("আপনার ভর্তি কনফার্ম হয়েছে। এখন থেকে সকল এক্সাম ও স্টাডি ম্যাটেরিয়াল আনলকড।");
                    setManualPriority("HIGH");
                    setManualActionUrl("/my_courses");
                  }}
                  className="p-2 rounded-xl bg-black/50 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/40 text-left text-[11px] font-mono transition cursor-pointer text-gray-300 hover:text-white"
                >
                  <span className="font-bold block text-purple-400">👑 ভর্তি কনফার্ম</span>
                  <span className="text-[9.5px] text-gray-500 truncate block">এনরোলমেন্ট সাকসেস</span>
                </button>
              </div>
            </div>

            {manualStatusMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{manualStatusMessage}</span>
              </div>
            )}

            <form onSubmit={handleSendManualNotification} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Target Audience */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-gray-300 font-bold uppercase block">
                    Target Audience:
                  </label>
                  <select
                    value={manualAudience}
                    onChange={(e) => setManualAudience(e.target.value as any)}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#C1121F]"
                  >
                    <option value="all_students">All Students (Global Broadcast)</option>
                    <option value="specific_course">Specific Course Students</option>
                    <option value="specific_batch">Specific Exam Batch Students</option>
                    <option value="teachers">Faculty & Teachers Only</option>
                  </select>
                </div>

                {/* Priority Level */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-gray-300 font-bold uppercase block">
                    Priority Level:
                  </label>
                  <select
                    value={manualPriority}
                    onChange={(e) => setManualPriority(e.target.value as any)}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#C1121F]"
                  >
                    <option value="LOW">LOW — General Info</option>
                    <option value="NORMAL">NORMAL — Regular Alert</option>
                    <option value="HIGH">HIGH — Important Exam / Class</option>
                    <option value="CRITICAL">CRITICAL — Emergency Routine Change</option>
                  </select>
                </div>
              </div>

              {/* Conditional Course / Batch selection */}
              {manualAudience === "specific_course" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-gray-300 font-bold uppercase block">
                    Select Target Course:
                  </label>
                  <select
                    value={manualCourseId}
                    onChange={(e) => setManualCourseId(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#C1121F]"
                    required
                  >
                    <option value="">-- Choose Course --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {manualAudience === "specific_batch" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-gray-300 font-bold uppercase block">
                    Select Target Exam Batch:
                  </label>
                  <select
                    value={manualBatchId}
                    onChange={(e) => setManualBatchId(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#C1121F]"
                    required
                  >
                    <option value="">-- Choose Batch --</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batchName} ({b.courseId})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-gray-300 font-bold uppercase block">
                    Notification Title:
                  </label>
                  <span className="text-[10px] font-mono text-gray-500">
                    {manualTitle.length}/60 chars (মোবাইল টাইটেল সাইজ)
                  </span>
                </div>
                <input
                  type="text"
                  value={manualTitle}
                  maxLength={75}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. 🔴 Special Physics Marathon Live Class Tonight!"
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C1121F]"
                  required
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-gray-300 font-bold uppercase block">
                    Notification Message (মোবাইল ফ্রেন্ডলি বার্তা):
                  </label>
                  <span className="text-[10px] font-mono text-gray-500">
                    {manualMessage.length}/150 chars (মোবাইল বডি সাইজ)
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={250}
                  value={manualMessage}
                  onChange={(e) => setManualMessage(e.target.value)}
                  placeholder="Type mobile push notification content here..."
                  className="w-full bg-black/60 border border-white/15 rounded-xl p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C1121F]"
                  required
                />
              </div>

              {/* Action URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-gray-300 font-bold uppercase block">
                  Action Link / Target URL (ট্যাপ করলে যেখানে যাবে):
                </label>
                <input
                  type="text"
                  value={manualActionUrl}
                  onChange={(e) => setManualActionUrl(e.target.value)}
                  placeholder="e.g. /courses/exams or /courses/classes or /notices"
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder-gray-500 focus:outline-none focus:border-[#C1121F]"
                />
              </div>

              {/* Delivery Channels */}
              <div className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-3">
                <span className="text-xs font-mono text-gray-300 font-bold uppercase block">
                  Delivery Channels (ডেলিভারি চ্যানেল):
                </span>
                <div className="flex flex-wrap items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-gray-200">
                    <input
                      type="checkbox"
                      checked={manualInApp}
                      onChange={(e) => setManualInApp(e.target.checked)}
                      className="accent-[#C1121F] w-4 h-4 rounded"
                    />
                    <span>ইন-অ্যাপ নোটিফিকেশন ও বেল ব্যাজ (In-App Badge)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-gray-200">
                    <input
                      type="checkbox"
                      checked={manualPush}
                      onChange={(e) => setManualPush(e.target.checked)}
                      className="accent-[#C1121F] w-4 h-4 rounded"
                    />
                    <span>মোবাইল ও ব্রাউজার পুশ নোটিফিকেশন + সাউন্ড (Mobile Push)</span>
                  </label>
                </div>
              </div>

              {/* Scheduling Options */}
              <div className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-3">
                <span className="text-xs font-mono text-gray-300 font-bold uppercase block">
                  Dispatch Timing:
                </span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-gray-200">
                    <input
                      type="radio"
                      name="schedule_mode"
                      checked={manualScheduleMode === "now"}
                      onChange={() => setManualScheduleMode("now")}
                      className="accent-[#C1121F]"
                    />
                    <span>Send Immediately (এখনই পাঠান)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-gray-200">
                    <input
                      type="radio"
                      name="schedule_mode"
                      checked={manualScheduleMode === "later"}
                      onChange={() => setManualScheduleMode("later")}
                      className="accent-[#C1121F]"
                    />
                    <span>Schedule for Later</span>
                  </label>
                </div>

                {manualScheduleMode === "later" && (
                  <div className="pt-2">
                    <input
                      type="datetime-local"
                      value={manualScheduleDateTime}
                      onChange={(e) => setManualScheduleDateTime(e.target.value)}
                      className="bg-black/80 border border-white/20 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#C1121F]"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSendingManual}
                  className="w-full py-3.5 bg-[#C1121F] hover:bg-red-700 disabled:bg-gray-700 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 cursor-pointer transition active:scale-98"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSendingManual ? "Dispatching to Devices..." : "Broadcast Notification to Mobile & In-App"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Live Phone Preview Box (Facebook / Telegram Style) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#151515] p-4 sm:p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <h4 className="text-xs font-mono font-bold uppercase text-gray-200 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-red-500" />
                  মোবাইল স্ক্রিন লাইভ প্রিভিউ
                </h4>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  Live Preview
                </span>
              </div>

              {/* Realistic Smartphone Mockup Bezel */}
              <div className="relative mx-auto w-full max-w-[320px] bg-[#0A0D14] rounded-[36px] border-4 border-gray-700/80 shadow-2xl p-3 pt-2 overflow-hidden">
                {/* Phone Top Notch / Dynamic Island */}
                <div className="w-28 h-4 bg-black rounded-full mx-auto mb-3 flex items-center justify-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-gray-800"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-900/60 border border-blue-500/40"></div>
                </div>

                {/* Mobile Status Bar */}
                <div className="flex items-center justify-between px-3 text-[10px] font-mono text-gray-300 font-bold mb-4">
                  <span>09:41</span>
                  <div className="flex items-center gap-1.5 text-[9px]">
                    <span>5G</span>
                    <span>100%</span>
                    <div className="w-4 h-2 border border-gray-400 rounded-sm p-0.5 flex items-center">
                      <div className="w-full h-full bg-emerald-400"></div>
                    </div>
                  </div>
                </div>

                {/* Mobile Push Notification Banner (Facebook / Telegram Style) */}
                <div className="bg-slate-900/95 backdrop-blur-md border border-white/20 rounded-2xl p-3 shadow-2xl space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-lg bg-[#C1121F] flex items-center justify-center text-white text-[10px] font-black shadow-sm">
                        🩺
                      </div>
                      <span className="text-[11px] font-black text-white font-display uppercase tracking-wide">
                        MediBridge Games
                      </span>
                    </div>
                    <span className="text-[9.5px] font-mono text-gray-400">Just now</span>
                  </div>

                  <div>
                    <h6 className="font-extrabold text-white text-xs leading-tight">
                      {manualTitle || "🔴 জরুরি বিজ্ঞপ্তি: আজ ক্লাসের সময়সূচি"}
                    </h6>
                    <p className="text-[11px] text-gray-300 leading-snug mt-1 line-clamp-2">
                      {manualMessage || "আজকের রাত ৮:০০ টার মেডিকেল বায়োলজি লাইভ ম্যারাথন ক্লাস যথাসময়ে অনুষ্ঠিত হবে।"}
                    </p>
                  </div>

                  <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-red-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                      {manualPriority} Priority
                    </span>
                    <span className="text-sky-400 font-bold underline">
                      {manualActionUrl || "/dashboard"}
                    </span>
                  </div>
                </div>

                {/* Sound & Vibration Indicator on Phone */}
                <div className="px-2 py-1.5 rounded-xl bg-black/60 border border-white/10 text-center space-y-1">
                  <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-amber-300 font-bold">
                    <span>🔊 নোটিফিকেশন সাউন্ড</span>
                    <span>•</span>
                    <span>📳 ভাইব্রেশন</span>
                  </div>
                  <p className="text-[9px] text-gray-400">
                    Facebook ও Telegram এর মতোই ব্যবহারকারীর ফোনে আওয়াজ ও ব্যানার যাবে।
                  </p>
                </div>

                {/* Phone Bottom Home Bar */}
                <div className="w-24 h-1 bg-gray-500 rounded-full mx-auto mt-4"></div>
              </div>

              {/* Test Mobile Push Button for Admin */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    playSound("notification");
                    NotificationService.sendBrowserPush(
                      manualTitle || "🩺 MediBridge Games: টেস্ট পুশ নোটিফিকেশন",
                      manualMessage || "সাউন্ড ও নোটিফিকেশন আপনার ফোনে সফলভাবে পাঠানো হয়েছে!",
                      manualActionUrl || "/dashboard",
                      manualPriority
                    );
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white text-xs font-mono font-bold transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>আমার ডিভাইসে টেস্ট নোটিফিকেশন ও সাউন্ড বাজান</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 4. NOTIFICATION DELIVERY LOGS TAB */}
      {/* ========================================================== */}
      {activeSubTab === "logs" && (
        <div className="space-y-4">
          {/* Logs Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#151515] p-3 rounded-xl border border-white/10">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search logs by recipient, title, or trigger..."
                className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C1121F] font-mono"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={logChannelFilter}
                onChange={(e) => setLogChannelFilter(e.target.value)}
                className="bg-black/60 border border-white/15 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#C1121F]"
              >
                <option value="All">All Channels</option>
                <option value="In-App">In-App Only</option>
                <option value="Push">Push Only</option>
              </select>

              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                className="bg-black/60 border border-white/15 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#C1121F]"
              >
                <option value="All">All Statuses</option>
                <option value="Delivered">Delivered</option>
                <option value="Read">Read</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-[#151515] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-black/60 text-gray-400 font-mono text-[10.5px] uppercase border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4">Notification & Message</th>
                    <th className="py-3.5 px-4">Recipient</th>
                    <th className="py-3.5 px-3">Type</th>
                    <th className="py-3.5 px-3">Trigger</th>
                    <th className="py-3.5 px-3 text-center">Channel</th>
                    <th className="py-3.5 px-3 text-center">Delivery</th>
                    <th className="py-3.5 px-3 text-center">Push Status</th>
                    <th className="py-3.5 px-4 text-right">Sent Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500 font-mono text-xs">
                        No notification logs recorded yet. Trigger events will automatically log here.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3.5 px-4 max-w-[280px]">
                          <span className="font-bold text-white font-mono block truncate" title={log.notificationTitle}>
                            {log.notificationTitle}
                          </span>
                          <span className="text-[10.5px] text-gray-400 block truncate" title={log.notificationMessage}>
                            {log.notificationMessage}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-200 font-mono block">{log.recipientName}</span>
                          <span className="text-[10px] text-gray-500 font-mono">{log.recipientAudience}</span>
                        </td>

                        <td className="py-3.5 px-3 font-mono text-[10.5px] text-amber-400">
                          {log.type}
                        </td>

                        <td className="py-3.5 px-3 font-mono text-[10px]">
                          <span
                            className={`px-1.5 py-0.5 rounded ${
                              log.trigger === "auto" ? "bg-sky-950 text-sky-400" : "bg-purple-950 text-purple-400"
                            }`}
                          >
                            {log.trigger === "auto" ? "Auto Trigger" : "Manual"}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-center font-mono text-[10.5px]">
                          <span className="text-gray-300">
                            {log.channel === "both" ? "In-App + Push" : log.channel === "in_app" ? "In-App" : "Push"}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-center font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.deliveryStatus === "delivered" || log.deliveryStatus === "read"
                                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30"
                                : log.deliveryStatus === "failed"
                                ? "bg-red-950/80 text-red-400 border border-red-500/30"
                                : "bg-sky-950/80 text-sky-400 border border-sky-500/30"
                            }`}
                          >
                            {log.deliveryStatus}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-center font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.pushStatus === "push_delivered" || log.pushStatus === "push_sent"
                                ? "bg-purple-950/80 text-purple-400 border border-purple-500/30"
                                : log.pushStatus === "push_failed"
                                ? "bg-red-950/80 text-red-400 border border-red-500/30"
                                : "bg-gray-900 text-gray-500"
                            }`}
                          >
                            {log.pushStatus}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-[10px] text-gray-400 whitespace-nowrap">
                          {new Date(log.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* EDIT TEMPLATE MODAL WITH 3-WAY LIVE PREVIEW */}
      {/* ========================================================== */}
      <AnimatePresence>
        {editingTemplate && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 min-h-screen overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-4xl bg-[#111111] border border-[#C1121F]/40 rounded-2xl p-6 relative shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#C1121F] text-white flex items-center justify-center">
                    <Edit className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                      Edit Notification Template: {editingTemplate.name}
                    </h3>
                    <p className="text-[11px] text-gray-400 font-mono">
                      Trigger: {editingTemplate.trigger}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setEditingTemplate(null)}
                  className="p-1 text-gray-400 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Left Form */}
                <form onSubmit={handleSaveTemplate} className="space-y-4 font-sans text-xs">
                  <div className="space-y-1">
                    <label className="font-mono text-[11px] text-gray-300 font-bold uppercase block">
                      Notification Name:
                    </label>
                    <input
                      type="text"
                      value={editingTemplate.name}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#C1121F]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-mono text-[11px] text-gray-300 font-bold uppercase block">
                      Title Template:
                    </label>
                    <input
                      type="text"
                      value={editingTemplate.title}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#C1121F]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-mono text-[11px] text-gray-300 font-bold uppercase block">
                      Message Template:
                    </label>
                    <textarea
                      rows={3}
                      value={editingTemplate.message}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, message: e.target.value })}
                      className="w-full bg-black/60 border border-white/15 rounded-xl p-3 text-white font-mono focus:outline-none focus:border-[#C1121F]"
                      required
                    />
                  </div>

                  {/* Dynamic Variables 1-Click Insert Chips */}
                  <div className="space-y-1.5 bg-black/40 p-3 rounded-xl border border-white/10">
                    <span className="text-[10px] font-mono text-gray-400 font-bold uppercase block">
                      Insert Dynamic Variable:
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {DYNAMIC_VARIABLES_LIST.map((v) => (
                        <button
                          key={v.tag}
                          type="button"
                          onClick={() => {
                            setEditingTemplate({
                              ...editingTemplate,
                              message: editingTemplate.message + " " + v.tag
                            });
                          }}
                          className="px-2 py-0.5 rounded bg-white/5 hover:bg-[#C1121F]/20 text-gray-300 hover:text-white border border-white/10 text-[10px] font-mono cursor-pointer transition"
                          title={`Insert ${v.label}`}
                        >
                          + {v.tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Icon Selection */}
                    <div className="space-y-1">
                      <label className="font-mono text-[11px] text-gray-300 font-bold uppercase block">
                        Icon:
                      </label>
                      <select
                        value={editingTemplate.icon}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, icon: e.target.value })}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#C1121F]"
                      >
                        {Object.keys(AVAILABLE_ICONS).map((iconName) => (
                          <option key={iconName} value={iconName}>
                            {iconName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Priority Selection */}
                    <div className="space-y-1">
                      <label className="font-mono text-[11px] text-gray-300 font-bold uppercase block">
                        Priority:
                      </label>
                      <select
                        value={editingTemplate.priority}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, priority: e.target.value as any })}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#C1121F]"
                      >
                        <option value="LOW">LOW</option>
                        <option value="NORMAL">NORMAL</option>
                        <option value="HIGH">HIGH</option>
                        <option value="CRITICAL">CRITICAL</option>
                      </select>
                    </div>
                  </div>

                  {/* Delivery Checkboxes & Status Toggle */}
                  <div className="bg-black/40 p-3 rounded-xl border border-white/10 space-y-2">
                    <span className="text-[10px] font-mono text-gray-400 font-bold uppercase block">
                      Delivery Channels & Status:
                    </span>
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer font-mono text-[11px] text-gray-200">
                        <input
                          type="checkbox"
                          checked={editingTemplate.inAppEnabled}
                          onChange={(e) =>
                            setEditingTemplate({ ...editingTemplate, inAppEnabled: e.target.checked })
                          }
                          className="accent-[#C1121F]"
                        />
                        <span>In-App Notification</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer font-mono text-[11px] text-gray-200">
                        <input
                          type="checkbox"
                          checked={editingTemplate.pushEnabled}
                          onChange={(e) =>
                            setEditingTemplate({ ...editingTemplate, pushEnabled: e.target.checked })
                          }
                          className="accent-[#C1121F]"
                        />
                        <span>Push Notification</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer font-mono text-[11px] text-gray-200 ml-auto">
                        <input
                          type="checkbox"
                          checked={editingTemplate.status === "active"}
                          onChange={(e) =>
                            setEditingTemplate({
                              ...editingTemplate,
                              status: e.target.checked ? "active" : "disabled"
                            })
                          }
                          className="accent-emerald-500"
                        />
                        <span className={editingTemplate.status === "active" ? "text-emerald-400 font-bold" : "text-gray-500"}>
                          Active
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingTemplate(null)}
                      className="flex-1 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-gray-300 font-mono text-xs font-bold uppercase transition"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-[#C1121F] hover:bg-red-700 text-white font-mono text-xs font-bold uppercase tracking-wider transition shadow-lg"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>

                {/* Right Live Preview Area */}
                <div className="bg-black/60 rounded-2xl border border-white/10 p-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-mono text-xs font-bold uppercase text-amber-400 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        Admin Template Preview
                      </span>

                      <div className="flex items-center gap-1 bg-black/80 p-0.5 rounded-lg border border-white/10">
                        <button
                          type="button"
                          onClick={() => setPreviewTab("dropdown")}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold ${
                            previewTab === "dropdown" ? "bg-[#C1121F] text-white" : "text-gray-400"
                          }`}
                        >
                          Dropdown
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewTab("dialog")}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold ${
                            previewTab === "dialog" ? "bg-[#C1121F] text-white" : "text-gray-400"
                          }`}
                        >
                          Full View
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewTab("push")}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold ${
                            previewTab === "push" ? "bg-[#C1121F] text-white" : "text-gray-400"
                          }`}
                        >
                          Push
                        </button>
                      </div>
                    </div>

                    {/* Preview Content */}
                    {(() => {
                      const { title, message } = getInterpolatedPreview(editingTemplate);
                      const IconComponent = AVAILABLE_ICONS[editingTemplate.icon] || Bell;

                      if (previewTab === "dropdown") {
                        return (
                          <div className="bg-[#151515] border border-white/15 rounded-xl p-4 space-y-2 shadow-xl">
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#C1121F]/20 border border-red-500/30 flex items-center justify-center text-amber-400 shrink-0">
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h6 className="font-bold text-white text-xs truncate">{title}</h6>
                                  <span className="text-[9px] font-mono text-gray-500">2m ago</span>
                                </div>
                                <p className="text-xs text-gray-300 mt-1 leading-relaxed">{message}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/5 text-gray-300 border border-white/10">
                                    {editingTemplate.priority}
                                  </span>
                                  <span className="text-[10px] font-mono text-sky-400 underline">
                                    Open Target Feature →
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (previewTab === "dialog") {
                        return (
                          <div className="bg-[#151515] border border-white/15 rounded-2xl p-5 space-y-3 shadow-2xl text-center flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full bg-[#C1121F]/20 border border-red-500/40 flex items-center justify-center text-amber-400">
                              <IconComponent className="w-6 h-6" />
                            </div>
                            <h5 className="font-bold text-white text-sm">{title}</h5>
                            <p className="text-xs text-gray-300 leading-relaxed max-w-sm">{message}</p>
                            <button className="mt-2 px-5 py-2 bg-[#C1121F] text-white rounded-xl font-mono text-xs font-bold uppercase">
                              Proceed to Action
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="bg-[#1e293b] border border-white/20 rounded-2xl p-4 shadow-2xl space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              MEDIBRIDGE APP
                            </span>
                            <span>now</span>
                          </div>
                          <h6 className="font-bold text-white text-xs">{title}</h6>
                          <p className="text-xs text-gray-200 leading-relaxed">{message}</p>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] text-gray-400 font-mono">
                    💡 Variables in curly brackets like <code className="text-amber-300">{"{{student_name}}"}</code> are automatically populated by the backend event trigger before sending.
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================== */}
      {/* EDIT RULE CONFIGURATION MODAL */}
      {/* ========================================================== */}
      <AnimatePresence>
        {editingRule && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 min-h-screen">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#111111] border border-amber-500/40 rounded-2xl p-6 relative shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                    Configure Rule: {editingRule.name}
                  </h3>
                  <span className="text-[10px] font-mono text-gray-400">{editingRule.type}</span>
                </div>
                <button
                  onClick={() => setEditingRule(null)}
                  className="p-1 text-gray-400 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveRule} className="space-y-4 font-sans text-xs">
                <div className="space-y-1">
                  <label className="font-mono text-[11px] text-gray-300 font-bold uppercase block">
                    Target Audience:
                  </label>
                  <select
                    value={editingRule.audience}
                    onChange={(e) => setEditingRule({ ...editingRule, audience: e.target.value as any })}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#C1121F]"
                  >
                    <option value="all_students">All Enrolled Students</option>
                    <option value="batch_students">Batch Enrolled Students</option>
                    <option value="course_students">Course Enrolled Students</option>
                    <option value="specific_student">Specific Individual Student</option>
                    <option value="teachers">Teachers / Faculty Only</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[11px] text-gray-300 font-bold uppercase block">
                    Priority Level:
                  </label>
                  <select
                    value={editingRule.priority}
                    onChange={(e) => setEditingRule({ ...editingRule, priority: e.target.value as any })}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#C1121F]"
                  >
                    <option value="LOW">LOW</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div className="bg-black/40 p-3 rounded-xl border border-white/10 space-y-2">
                  <span className="text-[10px] font-mono text-gray-400 font-bold uppercase block">
                    Channels & Status:
                  </span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer font-mono text-[11px] text-gray-200">
                      <input
                        type="checkbox"
                        checked={editingRule.inAppEnabled}
                        onChange={(e) => setEditingRule({ ...editingRule, inAppEnabled: e.target.checked })}
                        className="accent-[#C1121F]"
                      />
                      <span>In-App</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer font-mono text-[11px] text-gray-200">
                      <input
                        type="checkbox"
                        checked={editingRule.pushEnabled}
                        onChange={(e) => setEditingRule({ ...editingRule, pushEnabled: e.target.checked })}
                        className="accent-[#C1121F]"
                      />
                      <span>Push</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer font-mono text-[11px] text-gray-200 ml-auto">
                      <input
                        type="checkbox"
                        checked={editingRule.status === "active"}
                        onChange={(e) =>
                          setEditingRule({ ...editingRule, status: e.target.checked ? "active" : "disabled" })
                        }
                        className="accent-emerald-500"
                      />
                      <span className={editingRule.status === "active" ? "text-emerald-400 font-bold" : "text-gray-500"}>
                        Active
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingRule(null)}
                    className="flex-1 py-2.5 rounded-xl border border-white/15 bg-white/5 text-gray-300 font-mono text-xs font-bold uppercase"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-mono text-xs font-extrabold uppercase tracking-wider"
                  >
                    Save Rule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
