import React, { useState, useEffect, useRef } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/backend";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "../lib/supabaseDb";
import { SquadMessage, UserProfile } from "../types";
import {
  Send,
  Link as LinkIcon,
  FileText,
  Bookmark,
  Share2,
  Trash2,
  Paperclip,
  X,
  PlusCircle,
  FolderOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SquadChatProps {
  squadId: string;
  user: UserProfile;
  language: "bn" | "en";
  theme?: "light" | "dark";
}

export default function SquadChat({
  squadId,
  user,
  language,
  theme = "dark",
}: SquadChatProps) {
  const isBn = language === "bn";
  const [messages, setMessages] = useState<SquadMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);

  // Resource sharing form states
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceType, setResourceType] = useState<"link" | "document" | "mnemonic">("link");

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Read messages in real-time
  useEffect(() => {
    if (!squadId) return;

    setLoading(true);
    const msgsCollection = collection(db, "squads", squadId, "messages");
    const q = query(msgsCollection, orderBy("createdAt", "asc"), limit(60));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: SquadMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            ...data,
          } as SquadMessage);
        });
        setMessages(loaded);
        setLoading(false);
        // Scroll to bottom on new message
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `squads/${squadId}/messages`);
      }
    );

    return () => unsubscribe();
  }, [squadId]);

  // Scroll to bottom helper
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send simple text message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText("");

    try {
      const msgPayload = {
        senderId: user.uid,
        senderName: user.displayName || "Unknown Aspirant",
        senderAvatar: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName}`,
        content: textToSend,
        createdAt: serverTimestamp(),
        resourceType: "none",
      };

      await addDoc(collection(db, "squads", squadId, "messages"), msgPayload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `squads/${squadId}/messages`);
    }
  };

  // Share study resource
  const handleShareResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceTitle.trim() || !resourceUrl.trim()) return;

    const title = resourceTitle.trim();
    let url = resourceUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    try {
      const msgPayload = {
        senderId: user.uid,
        senderName: user.displayName || "Unknown Aspirant",
        senderAvatar: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.displayName}`,
        content: isBn 
          ? `আমি একটি নতুন রিসোর্স শেয়ার করেছি: ${title}` 
          : `I shared a study resource: ${title}`,
        resourceTitle: title,
        resourceUrl: url,
        resourceType: resourceType,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "squads", squadId, "messages"), msgPayload);
      
      // Reset form
      setResourceTitle("");
      setResourceUrl("");
      setResourceType("link");
      setShowResourceForm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `squads/${squadId}/messages`);
    }
  };

  // Delete message
  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm(isBn ? "আপনি কি এই বার্তাটি মুছে ফেলতে চান?" : "Are you sure you want to delete this message?")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "squads", squadId, "messages", msgId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `squads/${squadId}/messages/${msgId}`);
    }
  };

  // Render file-type icons
  const getResourceIcon = (type?: string) => {
    switch (type) {
      case "document":
        return <FileText className="w-5 h-5 text-red-400" />;
      case "mnemonic":
        return <Bookmark className="w-5 h-5 text-yellow-400" />;
      default:
        return <LinkIcon className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="bg-[#111111] border border-white/10 rounded-2xl flex flex-col h-[500px] overflow-hidden relative">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
          <div>
            <h3 className="font-extrabold text-xs text-white uppercase tracking-widest font-mono">
              {isBn ? "স্কোয়াড রিয়েল-টাইম চ্যাটরুম" : "SQUAD WAR ROOM TRANSMISSIONS"}
            </h3>
            <p className="text-[10px] text-gray-500 font-display mt-0.5">
              {isBn 
                ? "সদস্যদের সাথে রিয়েল-টাইমে যোগাযোগ করুন এবং হ্যান্ডনোট ও লিংক শেয়ার করুন" 
                : "Live squad secure grid. Exchange resources, mnemonics & study findings."}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowResourceForm(true)}
          className="px-3 py-1.5 bg-red-950/40 border border-[#C1121F]/30 hover:bg-[#C1121F] hover:text-white text-[#C1121F] rounded-xl text-[9px] font-bold font-mono tracking-wider transition uppercase flex items-center gap-1.5 cursor-pointer"
        >
          <Share2 className="w-3 h-3" />
          {isBn ? "রিসোর্স শেয়ার" : "SHARE RESOURCE"}
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#0A0A0A]/50 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 font-mono text-xs text-gray-500">
            <div className="w-6 h-6 border-2 border-[#C1121F] border-t-transparent rounded-full animate-spin"></div>
            <span>CONNECTING TO SQUAD COMMUNICATIONS NETWORK...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-xs font-mono text-gray-400">
              {isBn ? "যোগাযোগ শুরু করতে প্রথম বার্তা পাঠান!" : "TRANSMISSION SILENT. SEND THE FIRST COMMS!"}
            </p>
            <p className="text-[10px] text-gray-600 font-display mt-1">
              {isBn ? "মেডিকেল প্রস্তুতির টিপস, এক্সাম লিংক বা হাই-ইয়াল্ড নেমনিকস শেয়ার করুন" : "Share high-yield biology notes, chemistry formulas, or revision strategies."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isMe = msg.senderId === user.uid;
              const hasResource = msg.resourceType && msg.resourceType !== "none";

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] ${isMe ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  {/* Sender Avatar */}
                  <img
                    src={msg.senderAvatar}
                    alt={msg.senderName}
                    className="w-8 h-8 rounded-full border border-white/10 shrink-0 bg-neutral-900"
                  />

                  {/* Message Bubble Column */}
                  <div className="flex flex-col gap-1">
                    {/* Name & Time */}
                    <div className={`flex items-center gap-2 text-[10px] ${isMe ? "justify-end" : "justify-start"}`}>
                      <span className="font-bold text-gray-300 font-display">{msg.senderName}</span>
                      <span className="text-gray-600 font-mono">
                        {msg.createdAt
                          ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Transmitting..."}
                      </span>
                      {isMe && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="text-gray-700 hover:text-red-400 transition ml-1"
                          title="Delete message"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Content Box */}
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed font-display ${
                        isMe
                          ? "bg-red-950/20 border border-[#C1121F]/30 text-white rounded-tr-none"
                          : "bg-[#151515] border border-white/5 text-gray-200 rounded-tl-none"
                      }`}
                    >
                      {msg.content}

                      {/* Display Shared Resource */}
                      {hasResource && (
                        <div className="mt-2.5 bg-black/40 border border-white/5 rounded-xl p-2.5 flex items-center justify-between gap-3 hover:border-white/10 transition">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="p-1.5 bg-neutral-900 rounded-lg shrink-0">
                              {getResourceIcon(msg.resourceType)}
                            </div>
                            <div className="overflow-hidden">
                              <span className="block font-bold text-[11px] text-white truncate max-w-[150px] uppercase font-mono">
                                {msg.resourceTitle}
                              </span>
                              <span className="block text-[9px] text-gray-500 font-mono capitalize">
                                {msg.resourceType} Source
                              </span>
                            </div>
                          </div>
                          <a
                            href={msg.resourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-red-900/30 hover:bg-[#C1121F] border border-[#C1121F]/40 hover:border-transparent rounded-lg text-[9px] font-bold font-mono tracking-wider text-white transition uppercase flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <FolderOpen className="w-3 h-3" />
                            {isBn ? "দেখুন" : "OPEN"}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input Tray */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5 bg-black/30 flex gap-2 items-center">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isBn 
              ? "সদস্যদের জন্য বার্তা লিখুন..." 
              : "Command message here..."
          }
          className="flex-1 bg-black text-white placeholder-gray-600 text-xs border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#C1121F] font-display font-medium transition"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className={`p-3 rounded-xl transition flex items-center justify-center shrink-0 ${
            inputText.trim()
              ? "bg-[#C1121F] hover:bg-[#A30F1A] text-white cursor-pointer"
              : "bg-neutral-900 text-gray-600 cursor-not-allowed"
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Resource Sharing Modal Overlay */}
      <AnimatePresence>
        {showResourceForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-20"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-md p-5 flex flex-col gap-4 relative shadow-2xl shadow-black"
            >
              <button
                onClick={() => setShowResourceForm(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="border-b border-white/5 pb-2">
                <h4 className="font-extrabold text-xs text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-[#C1121F]" />
                  {isBn ? "মেডিকেল রিসোর্স শেয়ার করুন" : "DISSEMINATE COGNITIVE RESOURCE"}
                </h4>
                <p className="text-[10px] text-gray-500 font-display mt-0.5">
                  {isBn 
                    ? "আপনার স্কোয়াড বন্ধুদের সাথে দরকারী নোটবুক, ভিডিও লিংক বা পিডিএফ শেয়ার করুন।" 
                    : "Post high-yield exam sheets, revision sheets, or external web links."}
                </p>
              </div>

              <form onSubmit={handleShareResource} className="flex flex-col gap-3.5">
                {/* Resource Title */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-gray-400 uppercase font-mono font-bold">
                    Resource Name / Title
                  </label>
                  <input
                    type="text"
                    required
                    value={resourceTitle}
                    onChange={(e) => setResourceTitle(e.target.value)}
                    placeholder="e.g., Zoology Chapter 1 Handnote PDF"
                    className="bg-black text-white placeholder-gray-600 text-xs border border-white/10 rounded-xl p-3 focus:outline-none focus:border-[#C1121F] font-display font-semibold transition"
                  />
                </div>

                {/* Resource URL */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-gray-400 uppercase font-mono font-bold">
                    Resource URL / Link
                  </label>
                  <input
                    type="text"
                    required
                    value={resourceUrl}
                    onChange={(e) => setResourceUrl(e.target.value)}
                    placeholder="e.g., drive.google.com/file/... or website link"
                    className="bg-black text-white placeholder-gray-600 text-xs border border-white/10 rounded-xl p-3 focus:outline-none focus:border-[#C1121F] font-mono transition"
                  />
                </div>

                {/* Resource Type */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-gray-400 uppercase font-mono font-bold">
                    Select Resource Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "link", name: "Link / URL", icon: <LinkIcon className="w-3.5 h-3.5" /> },
                      { id: "document", name: "Doc / PDF", icon: <FileText className="w-3.5 h-3.5" /> },
                      { id: "mnemonic", name: "Mnemonic", icon: <Bookmark className="w-3.5 h-3.5" /> },
                    ].map((typeItem) => (
                      <button
                        key={typeItem.id}
                        type="button"
                        onClick={() => setResourceType(typeItem.id as any)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-[10px] font-mono transition font-bold uppercase cursor-pointer ${
                          resourceType === typeItem.id
                            ? "border-[#C1121F] bg-[#C1121F]/15 text-[#C1121F] scale-[1.02]"
                            : "border-white/5 bg-[#0A0A0A] text-gray-400 hover:border-white/15"
                        }`}
                      >
                        {typeItem.icon}
                        <span>{typeItem.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={!resourceTitle.trim() || !resourceUrl.trim()}
                  className="w-full py-3 bg-[#C1121F] hover:bg-[#A30F1A] disabled:bg-neutral-900 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-black rounded-xl text-xs uppercase font-mono tracking-widest transition shadow-lg shadow-[#C1121F]/15 cursor-pointer mt-2"
                >
                  {isBn ? "স্কোয়াডগ্রিডে পোস্ট করুন" : "SHARE IN SQUAD GRID"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
