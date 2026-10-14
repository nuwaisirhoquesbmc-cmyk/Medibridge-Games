import React, { useState, useEffect, useRef } from "react";
import { Course, Batch, BatchChatMessage } from "../../types/courseTypes";
import { UserProfile } from "../../types";
import { db } from "../../firebase";
import { NotificationService } from "../../lib/notificationService";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare,
  Send,
  CheckCircle2,
  HelpCircle,
  Search,
  Filter,
  User,
  ShieldCheck,
  ThumbsUp,
  Sparkles,
  MessageCircle,
  AlertCircle,
  BookOpen,
  Clock,
  Plus,
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { playSound } from "../../audio";

interface BatchChatProps {
  course: Course;
  batch: Batch;
  user: UserProfile;
  language: "bn" | "en";
  theme: "light" | "dark";
}

export default function BatchChat({
  course,
  batch,
  user,
  language,
  theme
}: BatchChatProps) {
  const isBn = language === "bn";
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const isAdminOrTeacher =
    user?.email === "nuwaisirhoquesbmc@gmail.com" ||
    user?.email === "hoquenuwaisir@gmail.com" ||
    (user?.role as string) === "teacher" ||
    user?.role === "admin" ||
    user?.role === "superadmin";

  const [messages, setMessages] = useState<BatchChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<
    "all" | "unanswered" | "answered" | "my_questions" | "urgent"
  >("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("All");

  // New Question Modal / Drawer
  const [showAskModal, setShowAskModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newText, setNewText] = useState("");
  const [newSubject, setNewSubject] = useState("Biology");
  const [isUrgent, setIsUrgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Expanded Answer Form / Thread
  const [answeringMsgId, setAnsweringMsgId] = useState<string | null>(null);
  const [teacherAnswerText, setTeacherAnswerText] = useState("");

  // Student Reply Input
  const [replyMsgId, setReplyMsgId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // Real-time Firestore sync
  useEffect(() => {
    if (!course?.id || !batch?.id) return;

    setLoading(true);
    const chatsRef = collection(db, "batch_chats");
    const q = query(
      chatsRef,
      where("courseId", "==", course.id),
      where("batchId", "==", batch.id),
      limit(80)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: BatchChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            ...data
          } as BatchChatMessage);
        });

        // Sort client-side by createdAt asc
        loaded.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        // Display real batch chat messages
        setMessages(loaded);
        setLoading(false);
      },
      (err) => {
        console.warn("Batch chat fetch warning:", err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [course?.id, batch?.id]);

  // Handle post new question
  const handlePostQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newText.trim()) return;

    setSubmitting(true);
    playSound("click");

    try {
      const newMsg: Omit<BatchChatMessage, "id"> = {
        courseId: course.id,
        batchId: batch.id,
        userId: user.uid,
        userName: user.displayName || "Aspirant",
        userRole: isAdminOrTeacher ? "teacher" : "student",
        userAvatar: (user as any).avatar || user.avatarUrl || "",
        questionTitle: newTitle.trim(),
        text: newText.trim(),
        subjectTag: newSubject,
        isUrgent,
        isAnswered: false,
        replies: [],
        helpfulCount: 0,
        upvotedUserIds: [],
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, "batch_chats"), newMsg);
      playSound("levelup");
      setNewTitle("");
      setNewText("");
      setIsUrgent(false);
      setShowAskModal(false);
    } catch (err) {
      console.error("Error posting question:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Submit Teacher Answer
  const handleSubmitTeacherAnswer = async (msgId: string) => {
    if (!teacherAnswerText.trim()) return;

    playSound("correct");
    try {
      const msgRef = doc(db, "batch_chats", msgId);
      const targetMsg = messages.find((m) => m.id === msgId);

      await updateDoc(msgRef, {
        isAnswered: true,
        teacherAnswer: {
          teacherId: user.uid,
          teacherName: user.displayName || "MediBridge Faculty",
          teacherAvatar: (user as any).avatar || user.avatarUrl || "",
          answerText: teacherAnswerText.trim(),
          answeredAt: new Date().toISOString()
        }
      });

      // Dispatch event to notify the student
      if (targetMsg && targetMsg.userId && targetMsg.userId !== user.uid) {
        await NotificationService.triggerEvent("TEACHER_REPLY", {
          recipientId: targetMsg.userId,
          recipientName: targetMsg.userName,
          courseId: course.id,
          batchId: batch.id,
          variables: {
            teacher_name: user.displayName || "Faculty Doctor",
            topic_name: targetMsg.questionTitle || targetMsg.text.slice(0, 30) || "Doubt Question",
            course_name: course.title
          }
        });
      }

      setTeacherAnswerText("");
      setAnsweringMsgId(null);
    } catch (err) {
      console.error("Error submitting teacher answer:", err);
    }
  };

  // Handle Submit Reply
  const handleSubmitReply = async (msgId: string) => {
    if (!replyText.trim()) return;

    playSound("click");
    try {
      const msgRef = doc(db, "batch_chats", msgId);
      const newReply = {
        id: `rep_${Date.now()}`,
        userId: user.uid,
        userName: user.displayName || "Aspirant",
        userRole: isAdminOrTeacher ? "teacher" : "student",
        text: replyText.trim(),
        createdAt: new Date().toISOString()
      };

      await updateDoc(msgRef, {
        replies: arrayUnion(newReply)
      });

      setReplyText("");
      setReplyMsgId(null);
    } catch (err) {
      console.error("Error submitting reply:", err);
    }
  };

  // Handle Upvote
  const handleToggleUpvote = async (msg: BatchChatMessage) => {
    playSound("click");
    const upvoted = msg.upvotedUserIds?.includes(user.uid);
    const msgRef = doc(db, "batch_chats", msg.id);

    try {
      if (upvoted) {
        await updateDoc(msgRef, {
          helpfulCount: Math.max(0, (msg.helpfulCount || 1) - 1),
          upvotedUserIds: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(msgRef, {
          helpfulCount: (msg.helpfulCount || 0) + 1,
          upvotedUserIds: arrayUnion(user.uid)
        });
      }
    } catch (err) {
      console.error("Error toggling upvote:", err);
    }
  };

  // Filter & Search Logic
  const filteredMessages = messages.filter((msg) => {
    // Subject filter
    if (selectedSubject !== "All" && msg.subjectTag !== selectedSubject) {
      return false;
    }

    // Tab filter
    if (filterMode === "unanswered" && msg.isAnswered) return false;
    if (filterMode === "answered" && !msg.isAnswered) return false;
    if (filterMode === "my_questions" && msg.userId !== user.uid) return false;
    if (filterMode === "urgent" && !msg.isUrgent) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = msg.questionTitle ? msg.questionTitle.toLowerCase().includes(q) : false;
      const textMatch = (msg.text || "").toLowerCase().includes(q);
      const authorMatch = (msg.userName || "").toLowerCase().includes(q);
      const answerMatch = msg.teacherAnswer?.answerText ? msg.teacherAnswer.answerText.toLowerCase().includes(q) : false;
      return titleMatch || textMatch || authorMatch || answerMatch;
    }

    return true;
  });

  const subjectsList = ["All", "Biology", "Chemistry", "Physics", "English & GK", "General"];

  return (
    <div className="w-full flex flex-col gap-6 font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#111111] via-[#1a1012] to-[#111111] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#C1121F]/20 border border-[#C1121F]/40 flex items-center justify-center text-[#FFD700] shadow-[0_0_15px_rgba(193,18,31,0.3)]">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-[#FFD700] uppercase tracking-wider">
                {batch.batchName} • OFFICIAL BATCH CHAT
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE Q&A</span>
              </span>
            </div>
            <h2 className="text-xl font-black text-white uppercase font-display leading-tight">
              {isBn ? "কোর্স ডাউট ক্লিয়ারিং & ব্যাচ আলোচনা" : "Course Doubt Clearing & Discussions"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isBn
                ? "ক্লাস, লেকচার বা এক্সাম সংক্রান্ত যেকোনো প্রশ্ন করুন, মেডিকেল শিক্ষকরা সরাসরি সমাধান দিচ্ছেন।"
                : "Ask course doubts directly to doctors and faculty for verified explanations."}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            playSound("click");
            setShowAskModal(true);
          }}
          className="px-5 py-3 rounded-xl bg-[#C1121F] hover:bg-red-700 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(193,18,31,0.4)] transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isBn ? "নতুন প্রশ্ন করুন" : "Ask Question"}</span>
        </button>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Search Input */}
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isBn ? "প্রশ্ন বা বিষয় নিয়ে খুঁজুন..." : "Search questions or topics..."
            }
            className="w-full bg-[#111111] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C1121F] transition"
          />
        </div>

        {/* Category Tabs */}
        <div className="md:col-span-7 flex items-center gap-1.5 overflow-x-auto scrollbar-none font-mono text-[11px] font-bold">
          {[
            { id: "all", label: isBn ? "সকল প্রশ্ন" : "All" },
            { id: "unanswered", label: isBn ? "উত্তরহীন" : "Unanswered" },
            { id: "answered", label: isBn ? "শিক্ষকের সমাধান" : "Answered" },
            { id: "my_questions", label: isBn ? "আমার প্রশ্ন" : "My Questions" },
            { id: "urgent", label: isBn ? "জরুরি ডাউট" : "Urgent" }
          ].map((tab) => {
            const isActive = filterMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  playSound("click");
                  setFilterMode(tab.id as any);
                }}
                className={`px-3 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-[#C1121F] text-white font-bold"
                    : "bg-[#111111] hover:bg-white/5 text-gray-400 border border-white/10"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subject Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none text-xs font-mono">
        <span className="text-gray-400 text-[10px] uppercase font-bold flex items-center gap-1">
          <BookOpen className="w-3 h-3 text-[#FFD700]" />
          <span>{isBn ? "বিষয় নির্বাচন:" : "Subject:"}</span>
        </span>
        {subjectsList.map((sub) => {
          const isActive = selectedSubject === sub;
          return (
            <button
              key={sub}
              onClick={() => {
                playSound("click");
                setSelectedSubject(sub);
              }}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap text-[11px] ${
                isActive
                  ? "bg-[#FFD700] text-black font-black"
                  : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
              }`}
            >
              {sub}
            </button>
          );
        })}
      </div>

      {/* Q&A Questions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-gray-400 font-mono text-xs bg-[#111111] border border-white/10 rounded-2xl animate-pulse">
            {isBn ? "ব্যাচ চ্যাটের প্রশ্নসমূহ লোড হচ্ছে..." : "Loading batch chat questions..."}
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="p-12 text-center bg-[#111111] border border-white/10 rounded-2xl space-y-3">
            <HelpCircle className="w-10 h-10 text-gray-500 mx-auto" />
            <h3 className="text-base font-bold text-white uppercase font-display">
              {isBn ? "কোনো প্রশ্ন পাওয়া যায়নি" : "No Questions Found"}
            </h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              {isBn
                ? "এই ফিল্টারে কোনো প্রশ্ন নেই। আপনার যেকোনো ডাউট থাকলে প্রথম প্রশ্নটি করতে পারেন!"
                : "No questions match your filter. Be the first to ask a course doubt!"}
            </p>
            <button
              onClick={() => {
                playSound("click");
                setShowAskModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#C1121F] text-white font-mono text-xs font-bold uppercase inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isBn ? "প্রশ্ন লিখুন" : "Ask Now"}</span>
            </button>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMyMsg = msg.userId === user.uid;
            const hasTeacherAnswer = !!msg.teacherAnswer;
            const isUpvoted = msg.upvotedUserIds?.includes(user.uid);

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-[#111111] border rounded-2xl p-5 space-y-4 shadow-lg transition ${
                  msg.isUrgent
                    ? "border-[#C1121F]/50 shadow-[0_0_15px_rgba(193,18,31,0.15)]"
                    : "border-white/10"
                }`}
              >
                {/* Question Header & Tags */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#C1121F] to-[#FFD700] text-black font-black flex items-center justify-center text-xs shadow font-mono">
                      {msg.userName.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-sans">
                          {msg.userName}
                        </span>
                        {msg.userRole === "teacher" && (
                          <span className="bg-[#FFD700]/20 text-[#FFD700] text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-[#FFD700]/40 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-[#FFD700]" />
                            <span>FACULTY</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-gray-400">
                        {new Date(msg.createdAt).toLocaleString(
                          isBn ? "bn-BD" : "en-US",
                          {
                            dateStyle: "short",
                            timeStyle: "short"
                          }
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    {msg.subjectTag && (
                      <span className="bg-white/10 text-gray-300 font-bold px-2 py-0.5 rounded border border-white/10">
                        {msg.subjectTag}
                      </span>
                    )}
                    {msg.isUrgent && (
                      <span className="bg-[#C1121F]/20 text-[#FFD700] font-bold px-2 py-0.5 rounded border border-[#C1121F]/40 flex items-center gap-1 animate-pulse">
                        <AlertCircle className="w-3 h-3 text-[#FFD700]" />
                        <span>URGENT</span>
                      </span>
                    )}
                    {hasTeacherAnswer ? (
                      <span className="bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>ANSWERED</span>
                      </span>
                    ) : (
                      <span className="bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>PENDING TEACHER</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Content */}
                <div className="space-y-2">
                  {msg.questionTitle && (
                    <h3 className="text-base font-bold text-white font-sans leading-snug">
                      {msg.questionTitle}
                    </h3>
                  )}
                  <p className="text-xs text-gray-300 leading-relaxed font-sans whitespace-pre-line bg-black/40 p-3.5 rounded-xl border border-white/5">
                    {msg.text}
                  </p>
                </div>

                {/* TEACHER VERIFIED ANSWER SECTION */}
                {hasTeacherAnswer && (
                  <div className="bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-black p-4 rounded-xl border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-xs shadow">
                          <ShieldCheck className="w-4 h-4 text-black" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-emerald-400 font-mono block">
                            👨‍⚕️ TEACHER VERIFIED ANSWER ({msg.teacherAnswer?.teacherName})
                          </span>
                          <span className="text-[9px] font-mono text-gray-400">
                            {new Date(
                              msg.teacherAnswer?.answeredAt || ""
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                      </div>
                      <span className="bg-emerald-400/10 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/20">
                        OFFICIAL
                      </span>
                    </div>

                    <p className="text-xs text-emerald-100 font-sans leading-relaxed whitespace-pre-line pl-9">
                      {msg.teacherAnswer?.answerText}
                    </p>
                  </div>
                )}

                {/* TEACHER ANSWER FORM (For Admin/Teachers) */}
                {isAdminOrTeacher && answeringMsgId === msg.id && (
                  <div className="bg-[#1a1012] p-4 rounded-xl border border-[#C1121F]/40 space-y-3 font-sans">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#FFD700] uppercase">
                        {isBn ? "শিক্ষকের সমাধান উত্তর দিন:" : "Write Verified Teacher Answer:"}
                      </span>
                      <button
                        onClick={() => setAnsweringMsgId(null)}
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={teacherAnswerText}
                      onChange={(e) => setTeacherAnswerText(e.target.value)}
                      placeholder={
                        isBn
                          ? "মেডিকেল রেফারেন্সসহ বিস্তারিত উত্তর সমাধান লিখুন..."
                          : "Write detailed explanation with medical reference..."
                      }
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C1121F]"
                    />
                    <div className="flex justify-end gap-2 font-mono text-xs">
                      <button
                        onClick={() => setAnsweringMsgId(null)}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSubmitTeacherAnswer(msg.id)}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Submit Teacher Solution</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Thread Replies List */}
                {msg.replies && msg.replies.length > 0 && (
                  <div className="pl-4 border-l-2 border-white/10 space-y-2 font-sans">
                    <span className="text-[10px] font-mono text-gray-400 uppercase font-bold block mb-1">
                      {isBn ? "ছাত্র-শিক্ষক আলোচনা:" : "Discussion Thread:"}
                    </span>
                    {msg.replies.map((rep) => (
                      <div
                        key={rep.id}
                        className="bg-black/30 p-2.5 rounded-xl border border-white/5 text-xs text-gray-300 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-200 text-[11px]">
                            {rep.userName}
                          </span>
                          <span className="text-[9px] font-mono text-gray-500">
                            {new Date(rep.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                        <p className="text-gray-300 leading-snug">{rep.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                {replyMsgId === msg.id && (
                  <div className="flex gap-2 font-sans pt-1">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={
                        isBn ? "উত্তর বা মন্তব্য লিখুন..." : "Write a reply..."
                      }
                      className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C1121F]"
                    />
                    <button
                      onClick={() => handleSubmitReply(msg.id)}
                      className="px-3 py-2 bg-[#C1121F] text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1 hover:bg-red-700 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Reply</span>
                    </button>
                  </div>
                )}

                {/* Bottom Card Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleUpvote(msg)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition cursor-pointer border ${
                        isUpvoted
                          ? "bg-[#FFD700]/20 border-[#FFD700] text-[#FFD700] font-bold"
                          : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{msg.helpfulCount || 0} Helpful</span>
                    </button>

                    <button
                      onClick={() => {
                        playSound("click");
                        setReplyMsgId(replyMsgId === msg.id ? null : msg.id);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>
                        {msg.replies?.length || 0}{" "}
                        {isBn ? "মন্তব্য" : "Replies"}
                      </span>
                    </button>
                  </div>

                  {isAdminOrTeacher && !hasTeacherAnswer && (
                    <button
                      onClick={() => {
                        playSound("click");
                        setAnsweringMsgId(msg.id);
                      }}
                      className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold hover:bg-emerald-500/30 cursor-pointer flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{isBn ? "শিক্ষকের উত্তর দিন" : "Answer as Teacher"}</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* MODAL: ASK NEW QUESTION */}
      <AnimatePresence>
        {showAskModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111111] border border-white/15 rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-2xl relative"
            >
              <button
                onClick={() => setShowAskModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                <div className="w-10 h-10 rounded-xl bg-[#C1121F]/20 border border-[#C1121F]/40 flex items-center justify-center text-[#FFD700]">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white font-display uppercase">
                    {isBn ? "কোর্সের ডাউট প্রশ্ন করুন" : "Ask Course Question"}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {course.title} • {batch.batchName}
                  </p>
                </div>
              </div>

              <form onSubmit={handlePostQuestion} className="space-y-4">
                <div>
                  <label className="text-xs font-mono text-gray-300 block mb-1 font-bold">
                    {isBn ? "প্রশ্নের বিষয় শিরোনাম (Short Title)" : "Short Question Title"}
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={
                      isBn
                        ? "যেমন: মায়োসিস-১ প্রফেজ-১ এর কায়াজমা কীভাবে গঠিত হয়?"
                        : "e.g., How is crossing over formed in meiosis I?"
                    }
                    className="w-full bg-black/60 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C1121F]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-mono text-gray-300 block mb-1 font-bold">
                      {isBn ? "বিষয় (Subject)" : "Subject"}
                    </label>
                    <select
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#C1121F]"
                    >
                      <option value="Biology">Biology</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Physics">Physics</option>
                      <option value="English & GK">English & GK</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-xs font-mono text-gray-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isUrgent}
                        onChange={(e) => setIsUrgent(e.target.checked)}
                        className="w-4 h-4 accent-[#C1121F] rounded"
                      />
                      <span className="text-[#FFD700] font-bold">
                        {isBn ? "জরুরি ডাউট (Urgent)" : "Urgent Doubt"}
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono text-gray-300 block mb-1 font-bold">
                    {isBn ? "বিস্তারিত প্রশ্ন বা কনফিউশন" : "Detailed Explanation"}
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder={
                      isBn
                        ? "বইয়ের পৃষ্ঠা বা লেকচারের যে অংশে বুঝতে সমস্যা হচ্ছে তা বিস্তারিত লিখুন..."
                        : "Describe the specific topic or question you need help with..."
                    }
                    className="w-full bg-black/60 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C1121F]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setShowAskModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 rounded-xl bg-[#C1121F] hover:bg-red-700 text-white font-bold flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? "Posting..." : isBn ? "প্রশ্ন সাবমিট করুন" : "Post Question"}</span>
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
