import { supabase, SupabaseProfile } from "./supabase";
import { UserProfile } from "../types";

/**
 * Maps a Supabase Auth User + Supabase public.profiles row to the MediBridge UserProfile shape.
 * Always strictly takes the role ('student' | 'admin') from the database row.
 */
export function mapSupabaseToUserProfile(
  userId: string,
  email: string | undefined,
  dbProfile: Partial<SupabaseProfile> | null,
  cachedProfile?: Partial<UserProfile> | null,
  metadata?: Record<string, any> | null
): UserProfile {
  // Extract display name with priority: dbProfile -> cached -> metadata -> email fallback
  const fullName =
    dbProfile?.full_name ||
    dbProfile?.name ||
    cachedProfile?.displayName ||
    metadata?.full_name ||
    metadata?.name ||
    metadata?.user_name ||
    email?.split("@")[0] ||
    "Aspirant Gladiator";

  // Strict role assignment: role MUST strictly come from the verified database profile
  // Never trust metadata, form input, or client hints. New users default to 'student'.
  const userRole = (dbProfile?.role === "admin" ? "admin" : "student") as "admin" | "student";

  const phone =
    dbProfile?.phone ||
    dbProfile?.phone_number ||
    cachedProfile?.phoneNumber ||
    metadata?.phone ||
    "";

  const college =
    dbProfile?.target_college ||
    dbProfile?.college ||
    cachedProfile?.college ||
    "Government Colleges";

  const district = dbProfile?.district || cachedProfile?.district || "Dhaka";

  const avatarUrl =
    dbProfile?.avatar_url ||
    cachedProfile?.avatarUrl ||
    metadata?.avatar_url ||
    metadata?.picture ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;

  return {
    uid: userId,
    displayName: fullName,
    email: email || dbProfile?.email || metadata?.email || "",
    phoneNumber: phone,
    college: college,
    district: district,
    level: cachedProfile?.level || 1,
    xp: cachedProfile?.xp || 150,
    coins: cachedProfile?.coins || 100,
    goldCoins: cachedProfile?.goldCoins || 0,
    rank: cachedProfile?.rank || "Freshman",
    dailyStreak: cachedProfile?.dailyStreak || 1,
    lastActiveDate: cachedProfile?.lastActiveDate || new Date().toISOString().split("T")[0],
    questionsSolved: cachedProfile?.questionsSolved || 0,
    questionsCorrect: cachedProfile?.questionsCorrect || 0,
    avatarUrl: avatarUrl,
    role: userRole,
    createdAt: dbProfile?.created_at || cachedProfile?.createdAt || new Date().toISOString(),
    characterId: cachedProfile?.characterId || "neuro_slasher",
    isPremium: cachedProfile?.isPremium || false,
    premiumExpiry: cachedProfile?.premiumExpiry || null,
    premiumType: cachedProfile?.premiumType || null,
    enrolledBatches: cachedProfile?.enrolledBatches || [],
    completedChapters: cachedProfile?.completedChapters || [],
  };
}

/**
 * Fetches user profile from public.profiles table by user ID.
 * Includes a strict timeout fallback so network latency or cold starts never block startup.
 * Returns null if not found or if an error/timeout occurs.
 */
export async function fetchSupabaseProfile(
  userId: string,
  timeoutMs: number = 3000
): Promise<SupabaseProfile | null> {
  try {
    const fetchPromise = supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    let timerId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
      timerId = setTimeout(() => resolve({ data: null, error: { message: "Profile fetch timeout" } }), timeoutMs);
    });

    const result = await Promise.race([fetchPromise, timeoutPromise]);
    if (timerId) clearTimeout(timerId);
    const { data, error } = result;

    if (error) {
      console.warn("Notice fetching profile from public.profiles:", error.message);
      return null;
    }

    return (data as SupabaseProfile) || null;
  } catch (err: any) {
    console.warn("Exception fetching profile from public.profiles:", err?.message || err);
    return null;
  }
}
