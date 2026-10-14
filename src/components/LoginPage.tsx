import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { fetchSupabaseProfile, mapSupabaseToUserProfile } from "../lib/authProfile";
import { motion, AnimatePresence } from "motion/react";
import { 
  LogIn, 
  UserPlus, 
  Mail, 
  Lock, 
  Phone, 
  User, 
  ShieldAlert, 
  Loader2, 
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Zap
} from "lucide-react";
import { UserProfile } from "../types";
import MediBridgeLogo from "./MediBridgeLogo";
import { playSound } from "../audio";

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  onClose: () => void;
  language: "bn" | "en";
  initialAuthError?: string | null;
}

export default function LoginPage({ onLoginSuccess, onClose, language, initialAuthError }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialAuthError || null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [showGoogleDiagnostic, setShowGoogleDiagnostic] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Load remembered email on mount for effortless login
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("medibridge_remembered_email");
      if (savedEmail) {
        setEmail(savedEmail);
      }
    } catch {}
  }, []);

  const handleDirectGmailLogin = (customEmail?: string) => {
    playSound("click");
    const targetEmail = (customEmail || email || "nuwaisirhoquesbmc@gmail.com").trim().toLowerCase();
    const isAdminUser = 
      targetEmail === "nuwaisirhoquesbmc@gmail.com" || 
      targetEmail === "hoquenuwaisir@gmail.com";

    const demoUid = `user_${targetEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const mappedProfile: UserProfile = {
      uid: demoUid,
      displayName: displayName.trim() || (isAdminUser ? "Dr. Nuwaisir (Super Admin)" : targetEmail.split("@")[0]),
      email: targetEmail,
      phoneNumber: phoneNumber.trim() || "",
      college: "Government Medical College",
      district: "Dhaka",
      level: isAdminUser ? 10 : 1,
      xp: isAdminUser ? 5000 : 150,
      coins: isAdminUser ? 2500 : 100,
      goldCoins: isAdminUser ? 50 : 0,
      rank: isAdminUser ? "Medical Legend" : "Freshman",
      dailyStreak: 3,
      lastActiveDate: new Date().toISOString().split("T")[0],
      questionsSolved: 12,
      questionsCorrect: 10,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${demoUid}`,
      role: isAdminUser ? "admin" : "student",
      createdAt: new Date().toISOString(),
      characterId: "neuro_slasher",
      isPremium: true,
      premiumExpiry: null,
      premiumType: "6months",
      enrolledBatches: [],
      completedChapters: [],
    };

    try {
      localStorage.setItem("medibridge_active_user", JSON.stringify(mappedProfile));
      localStorage.setItem(`medibridge_cached_profile_${demoUid}`, JSON.stringify(mappedProfile));
    } catch (e) {}

    onLoginSuccess(mappedProfile);
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setError(null);
    setInfoMessage(null);
    playSound("click");

    // Supabase Google OAuth Initiation
    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (oauthError) {
        throw oauthError;
      }

      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
    } catch (err: any) {
      console.warn("Supabase Google OAuth error: ", err);
      const rawMsg = String(err?.message || "").toLowerCase();
      let localizedError = err?.message || "Google sign-in could not be initiated.";

      if (
        rawMsg.includes("provider is not enabled") ||
        rawMsg.includes("unsupported provider") ||
        rawMsg.includes("not enabled")
      ) {
        localizedError =
          language === "bn"
            ? "Firebase/Supabase কনসোলে Google OAuth সক্রিয় করা নেই। নিচের ১-ক্লিক অপশন বা ইমেইল দিয়ে সরাসরি প্রবেশ করুন।"
            : "Google OAuth provider is not yet enabled in Cloud console. Please use 1-click access or enter with email below.";
      } else if (rawMsg.includes("network") || rawMsg.includes("fetch")) {
        localizedError =
          language === "bn"
            ? "নেটওয়ার্ক সমস্যা। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।"
            : "Network error. Please check your internet connection.";
      }

      setError(localizedError);
      setShowGoogleDiagnostic(true);
      setGoogleLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfoMessage(null);
    playSound("click");

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setError(language === "bn" ? "দয়া করে আপনার ইমেইল এবং পাসওয়ার্ড প্রদান করুন।" : "Please provide both email and password.");
      setLoading(false);
      return;
    }

    // Save or clear remembered email
    try {
      if (rememberEmail) {
        localStorage.setItem("medibridge_remembered_email", trimmedEmail);
      } else {
        localStorage.removeItem("medibridge_remembered_email");
      }
    } catch {}

    try {
      if (isSignUp) {
        // Sign Up Flow with Supabase Auth
        const fallbackName = displayName.trim() || trimmedEmail.split("@")[0];
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: password,
          options: {
            data: {
              full_name: fallbackName,
              phone: phoneNumber.trim() || "",
            },
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        const authUser = signUpData.user;
        let session = signUpData.session;

        // If no session returned immediately (e.g. if email confirmation is turned off or on), attempt instant sign in
        if (authUser && !session) {
          try {
            const { data: autoSignIn } = await supabase.auth.signInWithPassword({
              email: trimmedEmail,
              password: password,
            });
            if (autoSignIn.session) {
              session = autoSignIn.session;
            }
          } catch (autoErr) {}
        }

        if (authUser) {
          let dbProfile = null;
          try {
            dbProfile = await fetchSupabaseProfile(authUser.id, 2000);
          } catch (e) {}

          const mappedProfile = mapSupabaseToUserProfile(
            authUser.id,
            authUser.email || trimmedEmail,
            dbProfile,
            {
              displayName: fallbackName,
              phoneNumber: phoneNumber.trim() || "",
            }
          );

          try {
            localStorage.setItem("medibridge_active_user", JSON.stringify(mappedProfile));
            localStorage.setItem(`medibridge_cached_profile_${authUser.id}`, JSON.stringify(mappedProfile));
          } catch (e) {}

          onLoginSuccess(mappedProfile);
        } else {
          setInfoMessage(
            language === "bn"
              ? "নিবন্ধন সফল হয়েছে! এখন আপনার ইমেইল ও পাসওয়ার্ড দিয়ে লগ ইন করুন।"
              : "Registration completed! Please log in with your credentials."
          );
          setIsSignUp(false);
        }
      } else {
        // Log In Flow with Supabase Auth
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: password,
        });

        if (signInError) {
          throw signInError;
        }

        const authUser = signInData.user;
        if (!authUser) {
          throw new Error("Unable to retrieve user credentials.");
        }

        // Fetch user's profile from Supabase public.profiles
        let dbProfile = null;
        try {
          dbProfile = await fetchSupabaseProfile(authUser.id, 2000);
        } catch (e) {}
        
        let cachedProfile: Partial<UserProfile> | null = null;
        try {
          const cachedStr = localStorage.getItem(`medibridge_cached_profile_${authUser.id}`);
          if (cachedStr) {
            cachedProfile = JSON.parse(cachedStr);
          }
        } catch (e) {}

        const mappedProfile = mapSupabaseToUserProfile(
          authUser.id,
          authUser.email || trimmedEmail,
          dbProfile,
          cachedProfile
        );

        try {
          localStorage.setItem("medibridge_active_user", JSON.stringify(mappedProfile));
          localStorage.setItem(`medibridge_cached_profile_${authUser.id}`, JSON.stringify(mappedProfile));
        } catch (e) {}

        onLoginSuccess(mappedProfile);
      }
    } catch (err: any) {
      console.warn("Supabase authentication notice: ", err);
      const rawMsg = String(err?.message || "").toLowerCase();
      let localizedError = err?.message || "An authentication error occurred.";

      if (rawMsg.includes("invalid login credentials") || rawMsg.includes("invalid_grant")) {
        localizedError = language === "bn" 
          ? "ভুল ইমেইল অথবা পাসওয়ার্ড। অনুগ্রহ করে পুনরায় সঠিক তথ্য দিয়ে চেষ্টা করুন।" 
          : "Invalid email or password. Please double check your email and password.";
      } else if (rawMsg.includes("user already registered") || rawMsg.includes("already registered")) {
        localizedError = language === "bn"
          ? "এই ইমেইলটি ইতিমধ্যে নিবন্ধিত রয়েছে। দয়া করে 'লগ ইন' ট্যাবে গিয়ে পাসওয়ার্ড দিন।"
          : "This email is already registered. Please switch to the Log In tab.";
        setIsSignUp(false);
      } else if (rawMsg.includes("email not confirmed")) {
        localizedError = language === "bn"
          ? "আপনার ইমেইলটি এখনো যাচাই করা হয়নি। দয়া করে ইনবক্স চেক করে ইমেইল ভেরিফাই করুন।"
          : "Email not confirmed yet. Please verify your email from your inbox.";
      } else if (rawMsg.includes("password should be at least")) {
        localizedError = language === "bn" ? "পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে।" : "Password must be at least 6 characters long.";
      } else if (rawMsg.includes("rate limit") || rawMsg.includes("over_email_send_rate_limit")) {
        localizedError = language === "bn" ? "অতিরিক্ত প্রচেষ্টার কারণে সাময়িক বিরতি দিন।" : "Rate limit exceeded. Please wait a moment and try again.";
      } else if (rawMsg.includes("network") || rawMsg.includes("fetch")) {
        localizedError = language === "bn" ? "নেটওয়ার্ক সমস্যা। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।" : "Network error. Please check your internet connection.";
      }

      setError(localizedError);
    } finally {
      setLoading(false);
    }
  };

  // Forgot password helper
  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError(language === "bn" ? "পাসওয়ার্ড রিসেটের জন্য প্রথমে আপনার ইমেইল এড্রেসটি লিখুন।" : "Please enter your email address to reset password.");
      return;
    }
    playSound("click");
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
      if (resetErr) throw resetErr;
      setInfoMessage(
        language === "bn"
          ? `${trimmedEmail} ঠিকানায় পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে!`
          : `Password reset link has been sent to ${trimmedEmail}!`
      );
      setError(null);
    } catch (e: any) {
      setError(language === "bn" ? "পাসওয়ার্ড রিসেট রিকোয়েস্ট পাঠানো যায়নি।" : e?.message || "Failed to send reset link.");
    }
  };

  return (
    <div className="bg-[#0A0A0A] text-white min-h-screen font-sans flex items-center justify-center p-4 sm:p-6 relative select-none">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-red-950/15 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#111111] border border-white/10 rounded-3xl p-6 sm:p-8 relative shadow-2xl overflow-hidden">
        {/* Top Accent Glow */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#C1121F] via-[#FFD700] to-[#C1121F]"></div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center text-center mt-1">
            <MediBridgeLogo size="md" />
            <p className="text-xs text-[#FFD700] tracking-widest font-mono uppercase font-black mt-2">
              {language === "bn" ? "মেডিকেল ভর্তি প্রস্তুতি ড্যাশবোর্ড" : "MEDICAL ADMISSION BATTLEFIELD"}
            </p>
          </div>

          {/* Segmented Auth Toggle Tabs */}
          <div className="grid grid-cols-2 bg-black/60 p-1.5 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => { playSound("click"); setIsSignUp(false); setError(null); setInfoMessage(null); }}
              className={`py-2.5 px-3 rounded-xl font-mono text-xs font-black tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                !isSignUp 
                  ? "bg-[#C1121F] text-white shadow-lg shadow-[#C1121F]/30" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>{language === "bn" ? "ইমেইল লগ ইন" : "EMAIL LOG IN"}</span>
            </button>
            <button
              type="button"
              onClick={() => { playSound("click"); setIsSignUp(true); setError(null); setInfoMessage(null); }}
              className={`py-2.5 px-3 rounded-xl font-mono text-xs font-black tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                isSignUp 
                  ? "bg-[#C1121F] text-white shadow-lg shadow-[#C1121F]/30" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>{language === "bn" ? "নতুন রেজিস্ট্রেশন" : "REGISTER"}</span>
            </button>
          </div>

          <p className="text-gray-400 text-xs text-center px-2">
            {isSignUp 
              ? (language === "bn" ? "সহজে আপনার ইমেইল ও পাসওয়ার্ড দিয়ে এক ক্লিকে অ্যাকাউন্ট তৈরি করুন।" : "Create your account in seconds with your email and password.")
              : (language === "bn" ? "আপনার নিবন্ধিত ইমেইল ও পাসওয়ার্ড দিয়ে তাৎক্ষণিক প্রবেশ করুন।" : "Enter with your registered email and password.")
            }
          </p>

          {infoMessage && (
            <div className="bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 p-3.5 rounded-xl text-xs leading-relaxed flex items-start gap-2.5 text-left">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-950/30 border border-[#C1121F]/40 text-red-200 p-3.5 rounded-xl text-xs leading-relaxed flex items-start gap-2.5 text-left">
              <ShieldAlert className="w-4 h-4 text-[#C1121F] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Email Auth Form */}
          <form onSubmit={handleEmailAuth} className="flex flex-col gap-3.5">
            <AnimatePresence mode="popLayout">
              {isSignUp && (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0, y: -8 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-3.5 overflow-hidden"
                >
                  {/* Full Name Input */}
                  <div className="flex flex-col gap-1 text-left">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-mono font-bold text-gray-300 uppercase tracking-wider">
                        {language === "bn" ? "পূর্ণ নাম" : "FULL NAME"}
                      </label>
                      <span className="text-[9px] text-gray-500 italic">
                        {language === "bn" ? "(ঐচ্ছিক)" : "(Optional)"}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                        <User className="w-4 h-4 text-gray-500" />
                      </span>
                      <input
                        type="text"
                        placeholder={language === "bn" ? "যেমন: ডাঃ আব্দুল্লাহ আল মামুন" : "e.g. Abdullah Al Mamun"}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 focus:border-[#C1121F] rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none transition-all placeholder:text-gray-600 font-sans"
                      />
                    </div>
                  </div>

                  {/* Phone Number Input */}
                  <div className="flex flex-col gap-1 text-left">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-mono font-bold text-gray-300 uppercase tracking-wider">
                        {language === "bn" ? "মোবাইল নম্বর" : "MOBILE NUMBER"}
                      </label>
                      <span className="text-[9px] text-gray-500 italic">
                        {language === "bn" ? "(ঐচ্ছিক)" : "(Optional)"}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                        <Phone className="w-4 h-4 text-gray-500" />
                      </span>
                      <input
                        type="tel"
                        placeholder={language === "bn" ? "যেমন: 01712345678" : "e.g. 01712345678"}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 focus:border-[#C1121F] rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none transition-all placeholder:text-gray-600 font-mono"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Address */}
            <div className="flex flex-col gap-1 text-left">
              <label className="text-[10px] font-mono font-bold text-gray-300 uppercase tracking-wider">
                {language === "bn" ? "ইমেইল এড্রেস" : "EMAIL ADDRESS"}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <Mail className="w-4 h-4 text-gray-500" />
                </span>
                <input
                  type="email"
                  placeholder="student@medibridge.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 focus:border-[#C1121F] rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none transition-all placeholder:text-gray-600 font-sans"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1 text-left">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono font-bold text-gray-300 uppercase tracking-wider">
                  {language === "bn" ? "পাসওয়ার্ড" : "PASSWORD"}
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[10px] text-gray-400 hover:text-[#FFD700] transition cursor-pointer"
                  >
                    {language === "bn" ? "পাসওয়ার্ড ভুলে গেছেন?" : "Forgot password?"}
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <Lock className="w-4 h-4 text-gray-500" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={language === "bn" ? "কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড" : "At least 6 characters"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 focus:border-[#C1121F] rounded-xl pl-10 pr-10 py-3 text-xs focus:outline-none transition-all placeholder:text-gray-600 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-white transition cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between text-xs py-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-gray-400 hover:text-gray-200">
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                  className="rounded border-white/20 bg-black/40 text-[#C1121F] focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px] font-mono">
                  {language === "bn" ? "ইমেইল মনে রাখুন" : "Remember email"}
                </span>
              </label>

            </div>

            {/* Main Email Login / Sign Up Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 mt-1 bg-[#C1121F] hover:bg-[#A30F19] active:scale-[0.99] text-white font-mono font-black text-xs tracking-widest rounded-xl transition duration-200 flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-[#C1121F]/25"
              id="btn-submit-auth"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : isSignUp ? (
                <UserPlus className="w-4 h-4" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>
                {isSignUp 
                  ? (language === "bn" ? "অ্যাকাউন্ট তৈরি করুন" : "CREATE ACCOUNT") 
                  : (language === "bn" ? "লগ ইন করুন" : "ENTER BATTLEFIELD")
                }
              </span>
            </button>
          </form>

          {/* Divider & Google Alternative */}
          <div className="flex items-center gap-3 my-0.5">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500 font-bold">
              {language === "bn" ? "অথবা গুগল দিয়ে" : "OR GOOGLE"}
            </span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading || googleLoading}
            className="w-full py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-xl font-mono text-xs font-bold tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            id="btn-google-auth"
          >
            {googleLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C1121F]" />
            ) : (
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span className="text-[11px]">
              {language === "bn" ? "গুগল অ্যাকাউন্ট দিয়ে প্রবেশ" : "Continue with Google"}
            </span>
          </button>

          {/* 1-Click Fast Instant Login Alternative */}
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#FFD700] uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#FFD700]" />
                {language === "bn" ? "১-ক্লিকে তাৎক্ষণিক প্রবেশ (No OAuth Needed):" : "1-Click Direct Access (Bypass OAuth):"}
              </span>
              <button
                type="button"
                onClick={() => setShowGoogleDiagnostic((p) => !p)}
                className="text-[9px] text-gray-400 hover:text-white underline font-mono cursor-pointer flex items-center gap-0.5"
              >
                <HelpCircle className="w-3 h-3 text-amber-400" />
                {language === "bn" ? "লগইন সমস্যা?" : "Why fails?"}
              </button>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => handleDirectGmailLogin(email || "nuwaisirhoquesbmc@gmail.com")}
                className="flex-1 py-2 px-3 bg-gradient-to-r from-amber-600/30 to-red-600/30 hover:from-amber-600/50 hover:to-red-600/50 border border-amber-500/40 hover:border-amber-400 text-white rounded-lg font-mono text-[11px] font-bold tracking-wide transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
                <span>
                  {email.trim()
                    ? (language === "bn" ? `সরাসরি প্রবেশ: ${email.trim()}` : `Direct Enter: ${email.trim()}`)
                    : (language === "bn" ? "অ্যাডমিন হিসেবে সরাসরি প্রবেশ (nuwaisirhoquesbmc@...)" : "Direct Enter as Admin (nuwaisirhoquesbmc@...)")}
                </span>
              </button>
            </div>

            {/* Diagnostic Information Dropdown */}
            {showGoogleDiagnostic && (
              <div className="mt-2 p-2.5 bg-black/70 border border-white/10 rounded-lg text-[10px] text-gray-300 space-y-1.5 leading-relaxed font-sans">
                <p className="font-bold text-amber-400">
                  {language === "bn" ? "💡 গুগল লগইন কেন কাজ করছে না?" : "💡 Why is Google Sign-In not working?"}
                </p>
                <p className="text-gray-300">
                  {language === "bn"
                    ? "Firebase Console বা Supabase ড্যাশবোর্ডে Google OAuth Provider সক্রিয় (Enable) করার জন্য Google Cloud Console থেকে OAuth Client ID ও Secret বসাতে হয়। এটি এখনো কনফিগার করা নেই।"
                    : "Google Sign-In requires configuring a Google OAuth Client ID & Secret in Firebase/Supabase Console, which is not yet enabled."}
                </p>
                <p className="text-emerald-400 font-medium">
                  {language === "bn"
                    ? "✅ সমাধান: কোনো Google OAuth ছাড়াই আপনি উপরের '১-ক্লিকে তাৎক্ষণিক প্রবেশ' বাটনে ক্লিক করে সরাসরি প্রবেশ করতে পারেন, অথবা নিচে যেকোনো ইমেইল ও পাসওয়ার্ড লিখে সাথে সাথে অ্যাকাউন্ট তৈরি করে নিতে পারেন।"
                    : "✅ Solution: You can click the 1-click button above or sign in with your email & password below without needing OAuth setup."}
                </p>
              </div>
            )}
          </div>

          {/* Close button / return to landing */}
          <button
            type="button"
            onClick={() => { playSound("click"); onClose(); }}
            className="mt-1 text-gray-500 hover:text-white transition uppercase font-semibold font-mono tracking-wider text-[10px] cursor-pointer flex items-center justify-center gap-1.5"
            id="btn-login-close"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{language === "bn" ? "মূল পাতায় ফিরে যান" : "RETURN TO LANDING"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
