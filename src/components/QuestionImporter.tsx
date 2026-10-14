import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { db } from "../firebase";
import { collection, writeBatch, doc } from "firebase/firestore";
import { Question, UserProfile, SubjectType, DifficultyType } from "../types";
import { 
  FileSpreadsheet, 
  Upload, 
  AlertCircle, 
  CheckCircle, 
  Search, 
  Trash2, 
  Play, 
  RefreshCw, 
  Download, 
  Filter, 
  Layers, 
  HelpCircle,
  TrendingUp,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface QuestionImporterProps {
  user: UserProfile;
}

interface ParsedRow {
  index: number;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  subject: SubjectType;
  chapter: string;
  difficulty: DifficultyType;
  source: string;
  category?: string;
  isValid: boolean;
  errors: string[];
}

export default function QuestionImporter({ user }: QuestionImporterProps) {
  const [dragActive, setDragActive] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importLogs, setImportLogs] = useState<string[]>([]);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState<string>("All");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<"All" | "Valid" | "Error">("All");

  // Subject and Chapter manual overriders (bulk mapping)
  const [bulkSubjectOverride, setBulkSubjectOverride] = useState<string>("No Override");
  const [bulkChapterOverride, setBulkChapterOverride] = useState<string>("");
  const [bulkDifficultyOverride, setBulkDifficultyOverride] = useState<string>("No Override");

  // Pagination for the preview list of 1000+ items so React doesn't lag
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download simple sample CSV template content
  const downloadCSVTemplate = () => {
    const headers = [
      "Question Text",
      "Option A",
      "Option B",
      "Option C",
      "Option D",
      "Correct Option (A B C or D)",
      "Explanation",
      "Subject (Biology/Chemistry/Physics/English/GK)",
      "Chapter",
      "Difficulty (Easy/Medium/Hard)",
      "Source",
      "Category"
    ];
    
    const sampleRow = [
      "মানুষের হৃদপিন্ডে কয়টি প্রকোষ্ঠ থাকে?",
      "২টি",
      "৩টি",
      "৪টি",
      "৫টি",
      "C",
      "মানুষের হৃদপিন্ড ৪টি প্রকোষ্ঠ নিয়ে গঠিত (ডান ও বাম অলিন্দ, ডান ও বাম নিলয়)।",
      "Biology",
      "Anatomy",
      "Easy",
      "MAT Previous Year",
      "Medical Standard Questions"
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), sampleRow.join(",")].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "medibridge_question_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Drag and Drop triggers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Process File Data (Excel or CSV)
  const processFileData = (file: File) => {
    const reader = new FileReader();
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return;

        let rows: any[] = [];

        if (isExcel) {
          // Parse with SheetJS xlsx
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        } else {
          // Parse CSV (TextDecoder handles UTF-8 properly for Bengali language content)
          const text = new TextDecoder("utf-8").decode(data as ArrayBuffer);
          const lines = text.split(/\r?\n/);
          rows = lines.map(line => {
            // Basic CSV splitting that respects double-quoted commas
            const result: string[] = [];
            let current = "";
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = "";
              } else {
                current += char;
              }
            }
            result.push(current.trim());
            return result;
          });
        }

        if (rows.length < 2) {
          alert("The file seems empty or lacks headers.");
          return;
        }

        // Determine columns index mappings based on common names or first row
        const headers = (rows[0] as string[]).map(h => (h || "").toString().toLowerCase().trim());
        
        let qIndex = -1;
        let optAIndex = -1, optBIndex = -1, optCIndex = -1, optDIndex = -1;
        let correctIndex = -1;
        let expIndex = -1;
        let subIndex = -1;
        let chapIndex = -1;
        let diffIndex = -1;
        let srcIndex = -1;
        let catIndex = -1;

        headers.forEach((header, index) => {
          if (header.includes("question") || header.includes("প্রশ্ন") || header.includes("text") || header === "q") qIndex = index;
          else if (header.includes("option a") || header.includes("অপশন ক") || header.includes("opt a") || header === "a") optAIndex = index;
          else if (header.includes("option b") || header.includes("অপশন খ") || header.includes("opt b") || header === "b") optBIndex = index;
          else if (header.includes("option c") || header.includes("অপশন গ") || header.includes("opt c") || header === "c") optCIndex = index;
          else if (header.includes("option d") || header.includes("অপশন ঘ") || header.includes("opt d") || header === "d") optDIndex = index;
          else if (header.includes("correct") || header.includes("সঠিক") || header.includes("answer") || header.includes("ans")) correctIndex = index;
          else if (header.includes("explanation") || header.includes("ব্যাখ্যা") || header.includes("exp")) expIndex = index;
          else if (header.includes("subject") || header.includes("বিষয়") || header === "sub") subIndex = index;
          else if (header.includes("chapter") || header.includes("অধ্যায়") || header === "chap") chapIndex = index;
          else if (header.includes("difficulty") || header.includes("মান") || header === "diff") diffIndex = index;
          else if (header.includes("source") || header.includes("উৎস") || header === "src") srcIndex = index;
          else if (header.includes("category") || header.includes("ক্যাটাগরি") || header === "cat") catIndex = index;
        });

        // Fallback default index maps if headers are not matched explicitly
        if (qIndex === -1) qIndex = 0;
        if (optAIndex === -1) optAIndex = 1;
        if (optBIndex === -1) optBIndex = 2;
        if (optCIndex === -1) optCIndex = 3;
        if (optDIndex === -1) optDIndex = 4;
        if (correctIndex === -1) correctIndex = 5;
        if (expIndex === -1) expIndex = 6;
        if (subIndex === -1) subIndex = 7;
        if (chapIndex === -1) chapIndex = 8;
        if (diffIndex === -1) diffIndex = 9;
        if (srcIndex === -1) srcIndex = 10;
        if (catIndex === -1) catIndex = 11;

        const cleanParsedList: ParsedRow[] = [];

        // Parse starting from row 1 (row 0 is header)
        for (let idx = 1; idx < rows.length; idx++) {
          const row = rows[idx];
          if (!row || row.length === 0 || (row.length === 1 && !row[0])) continue;

          const questionText = (row[qIndex] || "").toString().trim();
          if (!questionText) continue; // Skip completely blank lines

          const optionA = (row[optAIndex] || "").toString().trim();
          const optionB = (row[optBIndex] || "").toString().trim();
          const optionC = (row[optCIndex] || "").toString().trim();
          const optionD = (row[optDIndex] || "").toString().trim();

          const rawCorrect = (row[correctIndex] || "").toString().toUpperCase().trim();
          let correctAnswerIndex = 0;

          // Parse correct option index map
          if (rawCorrect === "A" || rawCorrect === "1" || rawCorrect === "0" || rawCorrect.includes("ক")) {
            correctAnswerIndex = 0;
          } else if (rawCorrect === "B" || rawCorrect === "2" || rawCorrect === "1" || rawCorrect.includes("খ")) {
            correctAnswerIndex = 1;
          } else if (rawCorrect === "C" || rawCorrect === "3" || rawCorrect === "2" || rawCorrect.includes("গ")) {
            correctAnswerIndex = 2;
          } else if (rawCorrect === "D" || rawCorrect === "4" || rawCorrect === "3" || rawCorrect.includes("ঘ")) {
            correctAnswerIndex = 3;
          } else {
            // Attempt to parse is numerical direct index
            const parsedInt = parseInt(rawCorrect);
            if (!isNaN(parsedInt) && parsedInt >= 0 && parsedInt < 4) {
              correctAnswerIndex = parsedInt;
            } else {
              correctAnswerIndex = -1; // Flag as invalid correct choice
            }
          }

          const explanation = (row[expIndex] || "").toString().trim();
          
          // Subject check & validation
          let rawSubject = (row[subIndex] || "").toString().trim() as SubjectType;
          if (!["Biology", "Chemistry", "Physics", "English", "GK"].includes(rawSubject)) {
            // Attempt smart standard conversion casing
            const matchLow = rawSubject.toLowerCase();
            if (matchLow.includes("bio") || matchLow.includes("জীব")) rawSubject = "Biology";
            else if (matchLow.includes("chem") || matchLow.includes("রসা")) rawSubject = "Chemistry";
            else if (matchLow.includes("phy") || matchLow.includes("পদ")) rawSubject = "Physics";
            else if (matchLow.includes("eng") || matchLow.includes("ইরে") || matchLow.includes("ইং")) rawSubject = "English";
            else if (matchLow.includes("gk") || matchLow.includes("সাধা") || matchLow.includes("জি")) rawSubject = "GK";
          }

          const chapter = (row[chapIndex] || "General Core").toString().trim();
          
          let rawDiff = (row[diffIndex] || "Medium").toString().trim() as DifficultyType;
          if (!["Easy", "Medium", "Hard"].includes(rawDiff)) {
            const matchDiffLow = rawDiff.toLowerCase();
            if (matchDiffLow.includes("eas") || matchDiffLow.includes("সহজ")) rawDiff = "Easy";
            else if (matchDiffLow.includes("har") || matchDiffLow.includes("কঠিন")) rawDiff = "Hard";
            else rawDiff = "Medium";
          }

          const source = (row[srcIndex] || "Direct MCQ Importer").toString().trim();
          const category = (row[catIndex] || "Chapter Final Questions").toString().trim();

          // Validation & Row-Wise Errors Check list
          const rowErrors: string[] = [];
          if (!questionText || questionText.length < 5) {
            rowErrors.push("Question text is either empty or too short (< 5 chars).");
          }
          if (!optionA || !optionB) {
            rowErrors.push("At least Option A and Option B are required to make a valid MCQ.");
          }
          if (correctAnswerIndex === -1) {
            rowErrors.push(`Invalid correct answer choice "${rawCorrect}". Use A, B, C, or D (or 0-3).`);
          }
          if (!["Biology", "Chemistry", "Physics", "English", "GK"].includes(rawSubject)) {
            rowErrors.push(`Target Subject "${rawSubject}" is mismatched. Expected Biology, Chemistry, Physics, English or GK.`);
          }
          if (!chapter) {
            rowErrors.push("Chapter name cannot be left blank.");
          }

          cleanParsedList.push({
            index: idx,
            questionText,
            options: [optionA, optionB, optionC || "N/A", optionD || "N/A"],
            correctAnswerIndex,
            explanation: explanation || "সঠিক উত্তরের বিশদ ব্যাখ্যা শীঘ্রই যুক্ত করা হবে।",
            subject: rawSubject,
            chapter,
            difficulty: rawDiff,
            source,
            category,
            isValid: rowErrors.length === 0,
            errors: rowErrors
          });
        }

        setParsedQuestions(cleanParsedList);
        setCurrentPage(1);
        setImportLogs([`Parsed ${cleanParsedList.length} total raw columns/rows. Valid: ${cleanParsedList.filter(q => q.isValid).length}. Errors: ${cleanParsedList.filter(q => !q.isValid).length}.`]);
      } catch (err: any) {
        alert("Failed to parse sheet. Please ensure it is a valid .xlsx spreadsheet or CSV text format. Catcher info: " + err.message);
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsArrayBuffer(file); // text encoded with utf-8 is processed inside with TextDecoder
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFileData(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFileData(e.target.files[0]);
    }
  };

  // Perform bulk manual updates (mapping & re-labeling features)
  const applyBulkMapping = () => {
    if (parsedQuestions.length === 0) return;
    
    const updated = parsedQuestions.map(q => {
      let sub = q.subject;
      let chap = q.chapter;
      let diff = q.difficulty;

      if (bulkSubjectOverride !== "No Override") {
        sub = bulkSubjectOverride as SubjectType;
      }
      if (bulkChapterOverride.trim() !== "") {
        chap = bulkChapterOverride.trim();
      }
      if (bulkDifficultyOverride !== "No Override") {
        diff = bulkDifficultyOverride as DifficultyType;
      }

      // Re-validate
      const rowErrors: string[] = [];
      if (!q.questionText || q.questionText.length < 5) {
        rowErrors.push("Question text is either empty or too short (< 5 chars).");
      }
      if (!q.options[0] || !q.options[1]) {
        rowErrors.push("At least Option A and Option B are required to make a valid MCQ.");
      }
      if (q.correctAnswerIndex === -1) {
        rowErrors.push(`Invalid correct answer choice index.`);
      }
      if (!["Biology", "Chemistry", "Physics", "English", "GK"].includes(sub)) {
        rowErrors.push(`Target Subject "${sub}" is mismatched.`);
      }
      if (!chap) {
        rowErrors.push("Chapter name cannot be left blank.");
      }

      return {
        ...q,
        subject: sub,
        chapter: chap,
        difficulty: diff,
        isValid: rowErrors.length === 0,
        errors: rowErrors
      };
    });

    setParsedQuestions(updated);
    setImportLogs(prev => [...prev, "Applied bulk mapper overrode values to all current entries, re-validated state cells."]);
  };

  // Remove a row from the pre-import preview list
  const deleteRow = (index: number) => {
    setParsedQuestions(prev => prev.filter(q => q.index !== index));
  };

  // Clear everything
  const resetImporter = () => {
    setParsedQuestions([]);
    setIsImporting(false);
    setImportProgress(0);
    setSearchTerm("");
    setBulkSubjectOverride("No Override");
    setBulkChapterOverride("");
    setBulkDifficultyOverride("No Override");
    setImportLogs([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Execute database bulk importing using Firestore chunked Batches (excellent for 1000+ support)
  const commitParsedToDb = async () => {
    const validQuestions = parsedQuestions.filter(q => q.isValid);
    if (validQuestions.length === 0) {
      alert("No valid questions are currently parsed in the queue. Please resolve errors before committing.");
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportLogs(prev => [...prev, `Initiating push command for ${validQuestions.length} valid MCQs to Firestore...`]);

    const chunkSize = 400; // Safe threshold for Firestore 500 batch limit
    const totalItems = validQuestions.length;
    let successCount = 0;

    try {
      for (let i = 0; i < totalItems; i += chunkSize) {
        const batch = writeBatch(db);
        const chunk = validQuestions.slice(i, i + chunkSize);

        chunk.forEach((q) => {
          // Setup unique generated doc ID
          const newDocRef = doc(collection(db, "questions"));
          const payload: Omit<Question, "id"> = {
            questionText: q.questionText,
            options: q.options,
            correctAnswerIndex: q.correctAnswerIndex,
            explanation: q.explanation,
            subject: q.subject,
            chapter: q.chapter,
            difficulty: q.difficulty,
            source: q.source,
            category: q.category || "Chapter Final Questions",
            createdBy: user.uid,
            createdAt: new Date()
          };
          batch.set(newDocRef, payload);
        });

        await batch.commit();
        successCount += chunk.length;
        const progressPercent = Math.min(100, Math.round((successCount / totalItems) * 100));
        setImportProgress(progressPercent);
        setImportLogs(prev => [...prev, `Successfully committed batch slice: Imported ${successCount}/${totalItems} MCQs (${progressPercent}% completed).`]);
      }

      setImportLogs(prev => [...prev, `⭐⭐ ALL ${successCount} MCQs HAVE BEEN COMMITTED AND AUTO-SAVED TO DB SUCCESSFULY!`]);
      alert(`Woohoo! Successfully imported ${successCount} questions into your main pool!`);
      setParsedQuestions([]); // Empty the parsed buffer
    } catch (e: any) {
      setImportLogs(prev => [...prev, `❌ CRITICAL Firestore write error: ${e.message}`]);
      alert("Error committing question batch. Check the log screen for errors. details: " + e.message);
    } finally {
      setIsImporting(false);
    }
  };

  // Filter and search logic
  const filteredQuestions = parsedQuestions.filter(q => {
    const matchesSearch = q.questionText.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          q.chapter.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          q.source.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSubject = filterSubject === "All" || q.subject === filterSubject;
    const matchesDifficulty = filterDifficulty === "All" || q.difficulty === filterDifficulty;
    
    const matchesStatus = filterStatus === "All" || 
                          (filterStatus === "Valid" && q.isValid) || 
                          (filterStatus === "Error" && !q.isValid);

    return matchesSearch && matchesSubject && matchesDifficulty && matchesStatus;
  });

  // Pages indexes
  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredQuestions.slice(indexOfFirstItem, indexOfLastItem);

  const errorCount = parsedQuestions.filter(q => !q.isValid).length;
  const validCount = parsedQuestions.filter(q => q.isValid).length;

  return (
    <div className="bg-[#050505] p-2 md:p-6 rounded-3xl border border-white/5 flex flex-col gap-6 text-white text-xs leading-relaxed" id="dashboard-question-bulk-importer">
      
      {/* Header Info Block */}
      <div className="bg-[#111111] p-4 md:p-6 rounded-2xl border border-white/10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#C1121F]"></div>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-red-950/40 border border-red-500/20 text-[#C1121F] flex items-center justify-center font-bold text-2xl shadow-inner shrink-0">
            📑
          </div>
          <div>
            <h2 className="text-sm md:text-lg font-black uppercase font-display tracking-tight text-white flex items-center gap-1.5 matchesSearch">
              <span>MCQ Bulk Importer Engine</span>
              <span className="bg-[#C1121F] text-white px-2 py-0.5 rounded text-[8px] tracking-widest font-mono font-bold animate-pulse">ADMIN LEVEL ULTRA V2</span>
            </h2>
            <p className="text-gray-400 text-[10px] md:text-xs mt-1 max-w-xl">
              Upload, map, and import over **1000+ medical questions** at once with automated column mapping, cell validation checks, and automatic batch persistence.
            </p>
          </div>
        </div>
        <button
          onClick={downloadCSVTemplate}
          className="w-full md:w-auto px-4 py-2.5 bg-white hover:bg-gray-100 text-[#C1121F] border border-gray-200 hover:border-red-500 rounded-xl font-bold uppercase tracking-wider text-[10px] font-mono flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-lg"
          title="Download sample Microsoft Excel spreadsheet structure in CSV file"
        >
          <Download className="w-4 h-4" />
          <span>DOWNLOAD TEMPLATE (.CSV)</span>
        </button>
      </div>

      {parsedQuestions.length === 0 ? (
        /* Upload Drag-and-Drop Area */
        <div className="flex flex-col gap-4">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-10 md:p-16 flex flex-col items-center justify-center text-center gap-4 transition-all duration-300 ${
              dragActive 
                ? "border-[#C1121F] bg-[#C1121F]/5 scale-[0.99] shadow-[0_0_20px_rgba(193,18,31,0.1)]" 
                : "border-white/10 bg-black/60 hover:border-white/20"
            }`}
          >
            <div className={`p-4 rounded-full bg-[#111111] border border-white/5 text-[#C1121F] transition-transform duration-300 ${dragActive ? "animate-bounce" : ""}`}>
              <Upload className="w-8 h-8 md:w-10 md:h-10 text-[#C1121F]" />
            </div>
            
            <div>
              <p className="text-[#C1121F] font-bold text-xs sm:text-sm font-display uppercase tracking-wider">
                Drag & Drop files here, or Click to Select File
              </p>
              <p className="text-gray-400 text-[10px] sm:text-xs mt-1 font-mono">
                Supports Excel spreadsheets (.xlsx, .xls) and UTF-8 encoded text comma-separated values (.csv)
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleChange}
              accept=".csv, .xlsx, .xls"
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 px-5 py-2.5 bg-[#C1121F] hover:bg-red-700 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider font-mono shadow-md border-b-2 border-red-950 cursor-pointer"
            >
              CHOOSE FILE FROM DEVICE
            </button>
          </div>

          {/* Guidelines on columns map */}
          <div className="bg-[#111111]/80 backdrop-blur p-4 rounded-2xl border border-white/5">
            <h4 className="text-xs font-bold text-white uppercase font-display flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-[#FFD700]" />
              <span>COLUMNS SPECIFICATION STANDARDS</span>
            </h4>
            <p className="text-gray-400 text-[10px] sm:text-xs leading-relaxed mb-3">
              The importer auto-detects column names so you don't worry about ordering. Make sure your file contains the following details:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono">
              <div className="bg-black/50 p-2 rounded border border-white/5"><span className="text-red-400 font-bold">Question Text:</span> core body</div>
              <div className="bg-black/50 p-2 rounded border border-white/5"><span className="text-red-400 font-bold">Options A - D:</span> answers</div>
              <div className="bg-black/50 p-2 rounded border border-white/5"><span className="text-[#FFD700]">Correct Option:</span> A, B, C or D</div>
              <div className="bg-black/50 p-2 rounded border border-white/5"><span className="text-[#FFD700]">Subject:</span> Bio, Chem, Phys, etc.</div>
            </div>
          </div>
        </div>
      ) : (
        /* Preview and edit space */
        <div className="flex flex-col gap-6">

          {/* Quick numbers / stats dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#111111]/90 p-3.5 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-gray-400 uppercase">Total Candidates</span>
                <span className="text-lg md:text-xl font-black block text-white mt-1 font-display">{parsedQuestions.length} MCQs</span>
              </div>
              <span className="text-2xl">📋</span>
            </div>
            <div className="bg-[#10b981]/10 p-3.5 rounded-2xl border border-emerald-500/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase">Valid Ready</span>
                <span className="text-lg md:text-xl font-black block text-[#10b981] mt-1 font-display">{validCount} Ready</span>
              </div>
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="bg-[#ef4444]/10 p-3.5 rounded-2xl border border-red-500/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-red-400 uppercase">Broken / Errors</span>
                <span className="text-lg md:text-xl font-black block text-[#ef4444] mt-1 font-display">{errorCount} Failures</span>
              </div>
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div className="bg-[#111111] p-2 flex flex-col justify-center gap-1.5 rounded-2xl border border-white/10">
              <button
                disabled={isImporting}
                onClick={resetImporter}
                className="w-full py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg flex items-center justify-center gap-2 font-mono text-[10px] uppercase font-bold border border-white/10 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>CLEAR & RESET</span>
              </button>
            </div>
          </div>

          {/* Interactive Subject and Chapter Mapping / Toolbox */}
          <div className="bg-[#111111] p-4 rounded-2xl border border-white/10 flex flex-col gap-4">
            <h3 className="text-xs font-black uppercase text-[#FFD700] tracking-widest flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span>BULK SYSTEM MAPPER & RE-LABELLER</span>
            </h3>
            <p className="text-gray-400 text-[10px] leading-relaxed">
              If your Excel spreadsheet lacked chapters or has incorrect Subject names, override them instantly for *all* parsed rows here.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 mb-1">Override Subject</label>
                <select
                  value={bulkSubjectOverride}
                  onChange={(e) => setBulkSubjectOverride(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl p-2.5 text-white"
                >
                  <option value="No Override">-- Retain spreadsheet values --</option>
                  <option value="Biology">Biology</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Physics">Physics</option>
                  <option value="English">English</option>
                  <option value="GK">GK</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-gray-400 mb-1">Override Chapter Name</label>
                <input
                  type="text"
                  placeholder="e.g. Genetics / Cell"
                  value={bulkChapterOverride}
                  onChange={(e) => setBulkChapterOverride(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-gray-400 mb-1">Override Difficulty</label>
                <select
                  value={bulkDifficultyOverride}
                  onChange={(e) => setBulkDifficultyOverride(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl p-2.5 text-white"
                >
                  <option value="No Override">-- Retain spreadsheet values --</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <button
                onClick={applyBulkMapping}
                className="py-2.5 px-4 bg-[#C1121F] hover:bg-red-700 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider font-mono cursor-pointer border-b-2 border-red-950 flex items-center justify-center gap-1.5 transition-all duration-300"
              >
                <RefreshCw className="w-4 h-4" />
                <span>APPLY RELABELLING</span>
              </button>
            </div>
          </div>

          {/* Searching and Filter section */}
          <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search raw text, chapters, sources in loaded candidates queue..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full bg-black border border-white/10 rounded-xl p-2.5 pl-10 text-white placeholder-gray-500"
              />
            </div>
            
            {/* Quick dropdown filters */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <select
                value={filterSubject}
                onChange={(e) => { setFilterSubject(e.target.value); setCurrentPage(1); }}
                className="bg-black border border-white/10 rounded-xl px-3 py-2 text-white text-[11px]"
              >
                <option value="All">All Subjects</option>
                <option value="Biology">Biology</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Physics">Physics</option>
                <option value="English">English</option>
                <option value="GK">GK</option>
              </select>

              <select
                value={filterDifficulty}
                onChange={(e) => { setFilterDifficulty(e.target.value); setCurrentPage(1); }}
                className="bg-black border border-white/10 rounded-xl px-3 py-2 text-white text-[11px]"
              >
                <option value="All">All Difficulty</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value as any); setCurrentPage(1); }}
                className="bg-black border border-white/10 rounded-xl px-3 py-2 text-white text-[11px]"
              >
                <option value="All">All Validation Statuses</option>
                <option value="Valid">Valid Ready Only</option>
                <option value="Error">Errors Only</option>
              </select>
            </div>
          </div>

          {/* Import actions triggering block */}
          {isImporting ? (
            /* Active Import Progress Indicators */
            <div className="p-5 bg-black border border-[#C1121F]/30 rounded-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-gray-300 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C1121F] animate-ping" />
                  IMPORTING BATCH ACTIVE...
                </span>
                <span className="font-mono text-xs font-extrabold text-[#C1121F]">{importProgress}%</span>
              </div>
              {/* Progress track */}
              <div className="w-full bg-gray-950 h-2.5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="bg-gradient-to-r from-[#C1121F] via-[#FFD700] to-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <div className="bg-[#111111] p-3 rounded-xl border border-white/5 font-mono text-[10px] text-gray-400 max-h-24 overflow-y-auto">
                {importLogs.map((log, index) => (
                  <div key={index} className="py-0.5 border-b border-white/5 last:border-0">{log}</div>
                ))}
              </div>
            </div>
          ) : (
            validCount > 0 && (
              /* Ready to trigger DB persistent push */
              <div className="p-4 bg-emerald-550/10 border border-emerald-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase font-display">
                      READY TO COMMIT {validCount} VALIDATED MCQS
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-1 max-w-xl">
                      Click Commit button below to push files asynchronously. Any broken items (count: {errorCount}) will be skipped automatically until resolved.
                    </p>
                  </div>
                </div>
                <button
                  onClick={commitParsedToDb}
                  className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black uppercase text-xs tracking-wider rounded-xl cursor-pointer border-b-2 border-emerald-800 transition shadow-[0_0_20px_rgba(16,185,129,0.25)] flex items-center justify-center gap-1.5"
                >
                  <Play className="w-4.5 h-4.5 text-black" />
                  <span>START SYSTEM SAVE & WRITE</span>
                </button>
              </div>
            )
          )}

          {/* Row-wise Preview List Card Container */}
          <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
            
            <div className="p-4 bg-[#111111] border-b border-white/10 flex items-center justify-between font-mono text-[10px] text-gray-400">
              <span>PREVIEWING {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredQuestions.length)} OF {filteredQuestions.length} MATCHES</span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="px-2 py-1 bg-black rounded border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 cursor-pointer"
                  >
                    PREV
                  </button>
                  <span className="px-1">{currentPage} / {totalPages}</span>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="px-2 py-1 bg-black rounded border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 cursor-pointer"
                  >
                    NEXT
                  </button>
                </div>
              )}
            </div>

            {filteredQuestions.length === 0 ? (
              <div className="p-10 text-center text-gray-500 flex flex-col items-center gap-2">
                <FileText className="w-10 h-10 text-gray-600 mb-1" />
                <span>No MCQs match your search query or filters.</span>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                {currentItems.map((q) => (
                  <div key={q.index} className={`p-4 transition hover:bg-white/5 flex gap-4 ${q.isValid ? "bg-black/20" : "bg-red-950/15"}`}>
                    
                    {/* Index Flag */}
                    <div className="flex flex-col items-center justify-start shrink-0">
                      <span className="font-mono text-[9px] text-gray-500 font-bold block">ROW</span>
                      <span className="p-1.5 bg-[#151515] text-[#FFD700] rounded-lg font-mono font-bold text-xs border border-white/10 min-w-[28px] text-center mt-1">
                        {q.index}
                      </span>
                    </div>

                    {/* Question Content Body */}
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-extrabold uppercase ${
                          q.subject === "Biology" ? "bg-emerald-950/80 border border-emerald-500/20 text-emerald-400" :
                          q.subject === "Chemistry" ? "bg-[#C1121F]/10 border border-[#C1121F]/20 text-[#C1121F]" :
                          q.subject === "Physics" ? "bg-sky-950/80 border border-sky-500/20 text-sky-400" :
                          q.subject === "English" ? "bg-purple-950/80 border border-purple-500/20 text-purple-400" :
                          "bg-amber-950/80 border border-amber-500/20 text-amber-400"
                        }`}>
                          {q.subject}
                        </span>
                        
                        <span className="px-2 py-0.5 rounded text-[8px] font-mono font-bold bg-[#151515] border border-white/10 text-gray-300">
                          {q.chapter}
                        </span>

                        <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold border ${
                          q.difficulty === "Easy" ? "bg-emerald-950/20 border-emerald-500/10 text-emerald-400" :
                          q.difficulty === "Hard" ? "bg-red-950/20 border-red-500/10 text-red-400" :
                          "bg-yellow-950/20 border-yellow-500/10 text-yellow-400"
                        }`}>
                          {q.difficulty}
                        </span>

                        <span className="text-[9px] font-mono text-gray-500 bg-[#111111] px-1.5 py-0.5 rounded border border-white/5 ml-auto">
                          Source: {q.source}
                        </span>
                      </div>

                      {/* Actual Question Text Body */}
                      <p className="text-white text-xs font-semibold leading-relaxed font-display">{q.questionText}</p>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        {q.options.map((option, choiceIdx) => (
                          <div 
                            key={choiceIdx} 
                            className={`p-2 rounded-xl flex items-center gap-2 border text-[10.5px] transition ${
                              q.correctAnswerIndex === choiceIdx 
                                ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400 font-bold" 
                                : "bg-black/40 border-white/5 text-gray-400"
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center font-mono font-bold text-[9px] ${
                              q.correctAnswerIndex === choiceIdx 
                                ? "bg-emerald-400 text-black" 
                                : "bg-gray-800 text-gray-400"
                            }`}>
                              {String.fromCharCode(65 + choiceIdx)}
                            </span>
                            <span className="truncate">{option}</span>
                          </div>
                        ))}
                      </div>

                      {/* Explanations preview */}
                      {q.explanation && (
                        <div className="p-2 border-l-2 border-[#C1121F] bg-white/2 rounded-r-lg text-gray-400 mt-1 uppercase text-[9.5px]">
                          <span className="font-bold text-gray-300 font-mono">EXPLANATION: </span>
                          <span>{q.explanation}</span>
                        </div>
                      )}

                      {/* Display row errors if any */}
                      {!q.isValid && q.errors.length > 0 && (
                        <div className="mt-2 bg-[#C1121F]/10 border border-[#C1121F]/30 text-[#C1121F] p-2.5 rounded-xl flex flex-col gap-1">
                          <span className="text-[10px] font-bold uppercase font-mono flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            CRITICAL ROW ERROR RESOLUTIONS:
                          </span>
                          <ul className="list-disc pl-5 text-[9.5px] font-mono">
                            {q.errors.map((err, errIdx) => (
                              <li key={errIdx}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Delete action */}
                    <div className="flex flex-col justify-center items-end shrink-0">
                      <button
                        onClick={() => deleteRow(q.index)}
                        className="p-2 bg-black hover:bg-pink-950/40 border border-white/5 hover:border-red-500/40 text-gray-500 hover:text-red-400 rounded-xl transition cursor-pointer"
                        title="Discard row entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls Footer block */}
            {totalPages > 1 && (
              <div className="p-4 bg-[#111111] border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-gray-400">
                <span>PAGE {currentPage} OF {totalPages}</span>
                <div className="flex items-center gap-1">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); window.scrollTo(0, 300); }}
                    className="px-3 py-1.5 bg-black rounded-lg border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 cursor-pointer text-[9.5px] font-bold"
                  >
                    PREVIOUS
                  </button>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => { setCurrentPage(prev => Math.min(totalPages, prev + 1)); window.scrollTo(0, 300); }}
                    className="px-3 py-1.5 bg-black rounded-lg border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 cursor-pointer text-[9.5px] font-bold"
                  >
                    NEXT
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
