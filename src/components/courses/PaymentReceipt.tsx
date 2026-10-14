import React, { useRef, useState } from "react";
import { Course, Batch, Order, Enrollment } from "../../types/courseTypes";
import { UserProfile } from "../../types";
import { motion } from "motion/react";
import {
  Printer,
  Copy,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Download,
  Tag,
  Check,
  Award,
  CreditCard,
  QrCode,
  Building2,
  Phone,
  Mail,
  FileCheck,
  GraduationCap,
  Calendar,
  Lock,
  Share2
} from "lucide-react";
import { playSound } from "../../audio";

export interface PaymentReceiptProps {
  order?: Order | any;
  enrollment?: Enrollment | any;
  course: Course;
  batch?: Batch;
  user: UserProfile;
  language?: "bn" | "en";
  isModal?: boolean;
  onClose?: () => void;
  onGoToDashboard?: () => void;
}

export default function PaymentReceipt({
  order,
  enrollment,
  course,
  batch,
  user,
  language = "bn",
  isModal = true,
  onClose,
  onGoToDashboard
}: PaymentReceiptProps) {
  const isBn = language === "bn";
  const receiptRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isGeneratingHtmlDoc, setIsGeneratingHtmlDoc] = useState(false);

  // Check if status is pending admin verification or active
  const isPending =
    order?.status === "Pending" ||
    order?.status === "pending_verification" ||
    enrollment?.status === "pending_verification" ||
    !order?.verifiedAt;

  const receiptId =
    order?.orderNumber ||
    order?.id ||
    (enrollment?.id ? `MBA-${enrollment.id.slice(0, 8).toUpperCase()}` : `MBA-${Date.now().toString().slice(-6)}`);

  const transactionRef =
    order?.transactionId ||
    enrollment?.transactionId ||
    `TRX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const paymentMethod = order?.paymentMethod || enrollment?.paymentMethod || "bKash";
  const senderNumber = order?.senderNumber || "01XXXXXXXXX";

  // Financial breakdown calculation
  const originalAmount = order?.originalAmount || course.originalPrice || 5000;
  const amountPaid = order?.amount ?? course.discountedPrice ?? 4500;
  const discountAmount = order?.discountAmount ?? Math.max(0, originalAmount - amountPaid);
  const couponCode = order?.couponCode || "";

  const paymentDate = order?.createdAt || enrollment?.enrolledAt
    ? new Date(order?.createdAt || enrollment?.enrolledAt).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      })
    : new Date().toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });

  const studentName = user.displayName || user.email?.split("@")[0] || "MediBridge Student";
  const studentEmail = user.email || "student@medibridge.app";
  const studentCollege = (user as any).college || (user as any).targetCollege || "Medical Aspirant";
  const courseTitle = course.title;
  const batchName = batch?.batchName || enrollment?.batchName || "Medical Standard Live Batch";

  // Native Browser Print (styled with @media print)
  const handlePrintPDF = () => {
    playSound("click");
    window.print();
  };

  // Generate & Download Standalone Ultra-Polished Colored HTML/PDF Document
  const handleDownloadColorfulDoc = () => {
    playSound("levelup");
    setIsGeneratingHtmlDoc(true);

    const htmlDocContent = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MediBridge_Receipt_${receiptId}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', 'Hind Siliguri', sans-serif;
      background: linear-gradient(135deg, #0b0f19 0%, #111827 50%, #030712 100%);
      color: #f3f4f6;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 30px 15px;
    }
    .receipt-container {
      width: 100%;
      max-width: 680px;
      background: #0d1322;
      border: 2px solid #38bdf8;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(14, 165, 233, 0.25), 0 0 0 1px rgba(255,255,255,0.05);
      position: relative;
    }
    .top-banner {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 40%, #1e1b4b 100%);
      padding: 28px 32px 24px;
      position: relative;
      border-bottom: 2px dashed rgba(255,255,255,0.2);
    }
    .brand-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    .logo-icon {
      width: 44px;
      height: 44px;
      background: #ffffff;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .brand-name {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #ffffff;
      line-height: 1.1;
    }
    .brand-sub {
      font-size: 11px;
      color: #bae6fd;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .doc-type {
      text-align: right;
    }
    .doc-type h2 {
      font-size: 16px;
      font-weight: 800;
      color: #fbbf24;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .memo-badge {
      display: inline-block;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      background: rgba(0, 0, 0, 0.4);
      color: #e0f2fe;
      padding: 4px 10px;
      border-radius: 8px;
      margin-top: 4px;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .status-ribbon {
      margin-top: 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(0, 0, 0, 0.35);
      border-radius: 12px;
      padding: 10px 16px;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 800;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${isPending ? "#fbbf24" : "#34d399"};
    }
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: ${isPending ? "#fbbf24" : "#34d399"};
      box-shadow: 0 0 10px ${isPending ? "#fbbf24" : "#34d399"};
    }
    .receipt-body {
      padding: 28px 32px;
    }
    .section-title {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 800;
      color: #38bdf8;
      letter-spacing: 1px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .grid-two {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 22px;
    }
    .card-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 12px 16px;
    }
    .card-box.highlight {
      background: linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%);
      border: 1px solid rgba(56, 189, 248, 0.25);
    }
    .label {
      font-size: 11px;
      color: #9ca3af;
      margin-bottom: 4px;
      display: block;
    }
    .value {
      font-size: 13px;
      font-weight: 700;
      color: #ffffff;
      word-break: break-word;
    }
    .value-mono {
      font-family: 'JetBrains Mono', monospace;
      color: #38bdf8;
    }
    .table-container {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 16px 20px;
      margin-bottom: 22px;
    }
    .table-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 13px;
    }
    .table-row:last-child {
      border-bottom: none;
      padding-top: 14px;
      margin-top: 4px;
    }
    .discount-row {
      color: #34d399;
      font-weight: 700;
    }
    .total-paid-row {
      font-size: 16px;
      font-weight: 900;
      color: #ffffff;
    }
    .total-paid-val {
      font-size: 22px;
      font-weight: 900;
      color: #fbbf24;
      font-family: 'JetBrains Mono', monospace;
    }
    .stamp-container {
      margin-top: 20px;
      padding: 14px 18px;
      background: linear-gradient(135deg, rgba(30, 58, 138, 0.25) 0%, rgba(15, 23, 42, 0.4) 100%);
      border-radius: 14px;
      border: 1px solid rgba(56, 189, 248, 0.2);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .stamp-text {
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.4;
    }
    .official-seal {
      width: 70px;
      height: 70px;
      border: 2px dashed ${isPending ? "#fbbf24" : "#38bdf8"};
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: ${isPending ? "#fbbf24" : "#38bdf8"};
      font-size: 8px;
      font-weight: 900;
      text-transform: uppercase;
      text-align: center;
      line-height: 1.1;
      transform: rotate(-10deg);
      background: rgba(0, 0, 0, 0.4);
      flex-shrink: 0;
    }
    .footer-bar {
      background: #080c16;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding: 16px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #6b7280;
    }
    .print-btn {
      display: block;
      margin: 20px auto 0;
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 12px;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
      box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.5);
    }
    @media print {
      body { background: white !important; color: black !important; padding: 0 !important; }
      .receipt-container { max-width: 100% !important; border: 1px solid #ccc !important; box-shadow: none !important; border-radius: 0 !important; }
      .print-btn { display: none !important; }
      .top-banner { background: #0369a1 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .total-paid-val { color: #b45309 !important; }
      .stamp-container { background: #f8fafc !important; color: #333 !important; border: 1px solid #cbd5e1 !important; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="top-banner">
      <div class="brand-row">
        <div class="logo-badge">
          <div class="logo-icon">🩺</div>
          <div>
            <div class="brand-name">MEDIBRIDGE</div>
            <div class="brand-sub">Medical Academy & Live Prep</div>
          </div>
        </div>
        <div class="doc-type">
          <h2>Official Money Memo</h2>
          <div class="memo-badge">NO: ${receiptId}</div>
        </div>
      </div>

      <div class="status-ribbon">
        <div class="status-indicator">
          <div class="status-dot"></div>
          <span>${isPending ? "Pending Admin Verification" : "Verified & Active Enrollment"}</span>
        </div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #bae6fd;">
          ${paymentDate}
        </div>
      </div>
    </div>

    <div class="receipt-body">
      <div class="section-title">👤 Student & Academic Details</div>
      <div class="grid-two">
        <div class="card-box">
          <span class="label">Student Name</span>
          <div class="value">${studentName}</div>
        </div>
        <div class="card-box">
          <span class="label">Registered Email / Target</span>
          <div class="value">${studentEmail}</div>
        </div>
        <div class="card-box highlight" style="grid-column: span 2;">
          <span class="label">Enrolled Medical Course</span>
          <div class="value" style="color: #38bdf8; font-size: 14px;">${courseTitle}</div>
          <span style="font-size: 11px; color: #94a3b8; margin-top: 4px; display: block;">Cohort: ${batchName}</span>
        </div>
      </div>

      <div class="section-title">💳 Payment & Ledger Breakdown</div>
      <div class="table-container">
        <div class="table-row">
          <span style="color: #9ca3af;">Course Regular Fee</span>
          <span style="text-decoration: line-through; color: #6b7280; font-family: 'JetBrains Mono', monospace;">৳${originalAmount}</span>
        </div>
        ${discountAmount > 0 ? `
        <div class="table-row discount-row">
          <span>Special Discount ${couponCode ? `(Coupon: ${couponCode})` : ""}</span>
          <span style="font-family: 'JetBrains Mono', monospace;">-৳${discountAmount}</span>
        </div>` : ""}
        <div class="table-row">
          <span style="color: #9ca3af;">Payment Method</span>
          <span style="font-weight: 700; color: #38bdf8; text-transform: uppercase;">${paymentMethod} • Sender: ${senderNumber}</span>
        </div>
        <div class="table-row">
          <span style="color: #9ca3af;">Transaction ID (TrxID)</span>
          <span class="value-mono">${transactionRef}</span>
        </div>
        <div class="table-row total-paid-row">
          <span>TOTAL AMOUNT PAID</span>
          <span class="total-paid-val">৳${amountPaid}</span>
        </div>
      </div>

      <div class="stamp-container">
        <div class="stamp-text">
          <strong style="color: #f3f4f6; display: block; margin-bottom: 2px;">MediBridge Academic Security Verification</strong>
          This document serves as an authentic transaction receipt for admission into MediBridge Medical Entrance Preparation Platform.
        </div>
        <div class="official-seal">
          <span>MEDIBRIDGE</span>
          <span style="font-size: 11px; margin: 2px 0;">★ SEAL ★</span>
          <span>${isPending ? "SUBMITTED" : "CONFIRMED"}</span>
        </div>
      </div>

      <button class="print-btn" onclick="window.print()">🖨️ Save as PDF / Print Memo</button>
    </div>

    <div class="footer-bar">
      <span>MediBridge Academy • FB Page: Medibridge Academy</span>
      <span>Support: medibridgeedu@gmail.com</span>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlDocContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `MediBridge_Official_Receipt_${receiptId}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsGeneratingHtmlDoc(false);
  };

  const handleCopySummary = () => {
    playSound("click");
    const summary = `╔══════════════════════════════════════════════╗
   MEDIBRIDGE ACADEMY - OFFICIAL RECEIPT
╚══════════════════════════════════════════════╝
Receipt No     : ${receiptId}
Date & Time    : ${paymentDate}
Student Name   : ${studentName}
Email          : ${studentEmail}
Course         : ${courseTitle}
Batch Cohort   : ${batchName}
Original Price : ৳${originalAmount}
Discount Saved : ৳${discountAmount} ${couponCode ? `[Code: ${couponCode}]` : ""}
Total Paid     : ৳${amountPaid}
Payment Method : ${paymentMethod.toUpperCase()} (Sender: ${senderNumber})
Transaction ID : ${transactionRef}
Access Status  : ${isPending ? "PENDING ADMIN VERIFICATION" : "CONFIRMED & ACTIVE"}
════════════════════════════════════════════════
Support: medibridgeedu@gmail.com | FB Page: Medibridge Academy`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const receiptCard = (
    <div
      ref={receiptRef}
      className="w-full max-w-xl bg-gradient-to-b from-[#0e1726] via-[#090f1d] to-[#040812] border-2 border-sky-400/40 rounded-3xl relative shadow-[0_0_50px_rgba(14,165,233,0.3)] font-sans text-white max-h-[88vh] overflow-y-auto custom-scrollbar print:text-black print:bg-white print:p-0 print:border-none print:shadow-none print:max-h-none print:overflow-visible"
    >
      {/* Decorative Glow Elements */}
      <div className="absolute -top-20 -left-20 w-40 h-40 bg-sky-500/20 rounded-full blur-3xl pointer-events-none print:hidden" />
      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none print:hidden" />

      {/* Top Colorful Header Banner */}
      <div className="relative bg-gradient-to-r from-sky-600 via-indigo-600 to-cyan-600 p-5 sm:p-6 rounded-t-[22px] border-b-2 border-dashed border-white/25 overflow-hidden print:bg-sky-700 print:text-white">
        {/* Abstract watermark pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />

        {/* Modal Close Icon */}
        {isModal && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm flex items-center justify-center text-sm font-bold transition print:hidden cursor-pointer z-10"
            title={isBn ? "বন্ধ করুন" : "Close"}
          >
            ✕
          </button>
        )}

        <div className="flex items-start justify-between relative z-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white text-sky-600 flex items-center justify-center text-2xl shadow-xl shadow-sky-950/40 font-black shrink-0 border-2 border-white/80">
              🩺
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white font-display drop-shadow">
                  MEDIBRIDGE
                </h1>
                <span className="bg-amber-400 text-black text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full shadow-sm">
                  PRO
                </span>
              </div>
              <p className="text-xs text-sky-100 font-bold uppercase tracking-wider font-mono">
                {isBn ? "মেডিকেল ভর্তি প্রস্তুতি প্ল্যাটফর্ম" : "Medical Entrance Prep Platform"}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-300 block">
              {isBn ? "অফিসিয়াল মানি মেমো" : "Official Receipt"}
            </span>
            <span className="inline-block mt-1 font-mono text-xs font-black bg-black/40 text-sky-200 px-2.5 py-1 rounded-lg border border-white/20 backdrop-blur-sm">
              #{receiptId}
            </span>
          </div>
        </div>

        {/* Status Ribbon Pill */}
        <div className="mt-4 flex items-center justify-between bg-black/35 backdrop-blur-md rounded-xl p-2.5 border border-white/15">
          <div className="flex items-center gap-2">
            {isPending ? (
              <span className="flex items-center gap-1.5 text-xs font-bold font-mono text-amber-300">
                <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>{isBn ? "এডমিন ভেরিফিকেশন অপেক্ষমাণ" : "PENDING VERIFICATION"}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-bold font-mono text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{isBn ? "ভেরিফাইড ও নিশ্চিত ভর্তি" : "VERIFIED & CONFIRMED"}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-sky-200">
            <Calendar className="w-3.5 h-3.5 text-sky-300" />
            <span>{paymentDate}</span>
          </div>
        </div>
      </div>

      {/* Main Body Content */}
      <div className="p-5 sm:p-6 space-y-4">
        {/* Student & Course Academic Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-sky-400 uppercase tracking-wider">
            <GraduationCap className="w-4 h-4 text-sky-400" />
            <span>{isBn ? "শিক্ষার্থী ও কোর্সের বিবরণ" : "Student & Academic Profile"}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl">
              <span className="text-[10px] font-mono uppercase text-gray-400 block">{isBn ? "শিক্ষার্থীর নাম" : "Student Name"}</span>
              <strong className="text-sm font-extrabold text-white block truncate">{studentName}</strong>
            </div>

            <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl">
              <span className="text-[10px] font-mono uppercase text-gray-400 block">{isBn ? "রেজিস্টার্ড ইমেইল" : "Account Email"}</span>
              <strong className="text-xs font-bold text-sky-200 block truncate">{studentEmail}</strong>
            </div>

            <div className="sm:col-span-2 p-3.5 bg-gradient-to-r from-sky-950/40 via-indigo-950/30 to-purple-950/40 border border-sky-500/30 rounded-2xl">
              <span className="text-[10px] font-mono uppercase text-sky-300 font-bold block">{isBn ? "এনরোল করা কোর্স" : "Enrolled Course"}</span>
              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight mt-0.5">{courseTitle}</h3>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  {batchName}
                </span>
                <span className="text-[10px] font-mono text-gray-400">
                  {isBn ? "ফুল মেডিকেল সিলেবাস" : "Full Medical Prep Access"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Breakdown Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold font-mono text-sky-400 uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-sky-400" />
              <span>{isBn ? "পেমেন্ট ও লেজার হিসাব" : "Payment & Financial Ledger"}</span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">CURRENCY: BDT (৳)</span>
          </div>

          <div className="bg-gradient-to-b from-[#111927] to-[#0b101c] border border-sky-500/20 rounded-2xl p-4 space-y-2.5 font-mono">
            <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
              <span className="text-gray-400">{isBn ? "কোর্স রেগুলার ফি:" : "Standard Course Fee:"}</span>
              <span className="line-through text-gray-500 font-bold">৳{originalAmount}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-xs text-emerald-400 font-bold border-b border-white/10 pb-2">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isBn ? "বিশেষ ছাড় (Discount Saved):" : "Discount Savings:"}</span>
                  {couponCode && (
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded uppercase font-black">
                      {couponCode}
                    </span>
                  )}
                </span>
                <span>-৳{discountAmount}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-gray-300 border-b border-white/10 pb-2">
              <span className="text-gray-400">{isBn ? "পেমেন্ট মেথড ও প্রেরক:" : "Payment Method & Sender:"}</span>
              <span className="text-sky-300 font-bold uppercase">
                {paymentMethod} • {senderNumber}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-300 border-b border-white/10 pb-2">
              <span className="text-gray-400">{isBn ? "ট্রানজেকশন আইডি (TrxID):" : "Transaction Ref (TrxID):"}</span>
              <span className="text-amber-300 font-bold tracking-wider">{transactionRef}</span>
            </div>

            {/* Total Highlight */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-xs sm:text-sm font-extrabold text-white block">
                  {isBn ? "সর্বমোট পরিশোধিত ফি" : "NET AMOUNT PAID"}
                </span>
                <span className="text-[10px] text-emerald-400 font-sans">
                  {isPending ? "★ পেমেন্ট সাবমিটেড" : "✓ পেমেন্ট কনফার্মড"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight drop-shadow">
                  ৳{amountPaid}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Stamp & Guarantee Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-950/60 via-slate-900 to-indigo-950/60 border border-sky-500/30 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-black text-white uppercase font-display">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>MediBridge Secure Certification</span>
            </div>
            <p className="text-[11px] text-gray-300 leading-snug">
              {isPending
                ? isBn
                  ? "পেমেন্টটি এডমিন যাচাই করছেন। ভেরিফিকেশন হওয়া মাত্র ড্যাশবোর্ডে কোর্স লেকচার, এক্সাম ও নোটস আনলক হবে।"
                  : "Payment verification in progress. Access will unlock immediately after admin approval."
                : isBn
                ? "পেমেন্ট সফলভাবে ভেরিফাইড! এখনই ড্যাশবোর্ডে লাইভ ক্লাস, এক্সাম ও হ্যান্ডনোটস ব্রাউজ করুন।"
                : "Payment verified. Full access to live classes, daily exams, and high-yield notes granted."}
            </p>
          </div>

          {/* Graphical Official Seal Stamp */}
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-sky-400/80 bg-black/50 flex flex-col items-center justify-center text-center p-1 shrink-0 rotate-[-12deg] shadow-lg shadow-sky-950/50">
            <span className="text-[8px] font-black text-sky-300 font-mono">MEDIBRIDGE</span>
            <span className="text-[10px] font-black text-amber-400 font-mono">★ SEAL ★</span>
            <span className="text-[7px] font-extrabold text-white uppercase">
              {isPending ? "VERIFYING" : "OFFICIAL"}
            </span>
          </div>
        </div>

        {/* Interactive Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs print:hidden">
          <button
            onClick={handlePrintPDF}
            className="py-2.5 px-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-extrabold rounded-xl border border-sky-400/40 shadow-lg shadow-sky-900/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
            title={isBn ? "প্রিন্ট বা PDF হিসেবে সেভ করুন" : "Print or Save as PDF"}
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span>{isBn ? "প্রিন্ট PDF" : "Print PDF"}</span>
          </button>

          <button
            onClick={handleDownloadColorfulDoc}
            disabled={isGeneratingHtmlDoc}
            className="py-2.5 px-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl border border-emerald-400/40 shadow-lg shadow-emerald-900/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
            title={isBn ? "কালারফুল মেমো ফাইল ডাউনলোড করুন" : "Download Colorful Receipt Doc"}
          >
            <Download className="w-4 h-4 text-white" />
            <span>{isBn ? "ডাউনলোড মেমো" : "Download"}</span>
          </button>

          <button
            onClick={handleCopySummary}
            className="py-2.5 px-2 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl border border-white/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
            title={isBn ? "মেমোর সামারি কপি করুন" : "Copy Receipt Summary"}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">{isBn ? "কপি হয়েছে!" : "Copied"}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-sky-400" />
                <span>{isBn ? "মেমো কপি" : "Copy Info"}</span>
              </>
            )}
          </button>

          {onGoToDashboard && (
            <button
              onClick={() => {
                playSound("click");
                onGoToDashboard();
              }}
              className="py-2.5 px-2 bg-gradient-to-r from-[#C1121F] to-rose-700 hover:from-red-600 hover:to-rose-600 text-white font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-rose-950/40"
            >
              <span>{isBn ? "কোর্স ড্যাশবোর্ড" : "Dashboard"}</span>
              <ArrowRight className="w-4 h-4 text-amber-300" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div className="bg-[#070b14] border-t border-white/10 px-5 py-3 rounded-b-[22px] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-gray-400">
        <span>FB: <strong className="text-white">Medibridge Academy</strong></span>
        <span>Support: <strong className="text-white">medibridgeedu@gmail.com</strong></span>
      </div>
    </div>
  );

  if (!isModal) {
    return receiptCard;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-xl my-auto max-h-[92vh] flex flex-col justify-center"
      >
        {receiptCard}
      </motion.div>
    </div>
  );
}


